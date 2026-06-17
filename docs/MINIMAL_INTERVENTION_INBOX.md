# InvoiceFlow — Minimal Human Intervention Inbox: State & Plan

This is a **handoff document**. It describes the threaded "Minimal Human
Intervention Inbox" feature, what is **already built**, what is **left**, and
exactly **how to finish it** — so any developer or AI agent can pick it up.

Last updated: 2026-06-17.

---

## 1. What InvoiceFlow is (60-second orientation)

AI email-support automation. It reads a company Gmail inbox, classifies each
email, answers product questions from company documents (RAG), drafts replies,
self-proofreads, then **either auto-sends (safe) or queues for human review
(risky)**. A React dashboard lets a human run the pipeline, review/approve
replies, browse conversation threads, and see analytics. There's also a
"Policy Chat" where staff query the documents directly.

### Architecture map
| Layer | File(s) | Role |
|---|---|---|
| Pipeline orchestration | `src/graph.py` | LangGraph state machine (the product core) |
| Pipeline steps | `src/nodes.py` | one method per node; logs to history |
| LLM chains | `src/agents.py` | prompt → LLM → structured output |
| LLM provider | `src/llm.py` | Groq (default) / Gemini factory, rate-limited |
| Prompts | `src/prompts.py` | all prompt templates |
| Schemas | `src/structure_outputs.py` | pydantic outputs + category/sentiment enums |
| **Thread store** | `src/history_store.py` | thread grouping, intervention engine, analytics |
| Gmail I/O | `src/tools/GmailTools.py` | fetch/send/draft, threading headers |
| API | `app_server.py` | FastAPI on **:5000**, all `/api/*` endpoints |
| Chat | `src/chat_service.py` | RAG chat over Supabase history |
| Frontend | `frontend/` | Vite/React/Tailwind dashboard on **:3000** |
| Run entrypoint | `main.py` | runs the pipeline once (`--smart`/`--auto-send`/`--no-auto-send`) |

Persistence: **`email_history.json`** is the system of record for emails (flat
list, thread-grouped at read time by `history_store`). Chat uses **Supabase**.

### How to run (two terminals)
```powershell
# Terminal 1 — backend
.\venv\Scripts\python.exe app_server.py
# Terminal 2 — frontend
cd frontend; npm run dev    # open http://localhost:3000
# Process the inbox (smart mode = auto-send safe, queue risky)
.\venv\Scripts\python.exe main.py
```
Gmail token expires ~weekly (OAuth "testing" mode) → re-auth with
`python main.py` (browser opens). See `RUN_GUIDE.md`.

---

## 2. The intervention model (how decisions are made)

Per email, after the proofreader approves, `Nodes.route_after_review`
(`src/nodes.py`) + `history_store.priority_for_entry` decide:

- **AI Auto-Handled** (`status: auto_sent`) — product_enquiry/feedback,
  positive/neutral sentiment, confidence ≥ 0.6, proofreader OK, no sensitive terms.
- **Needs Human Review** (`status: draft`/`needs_review`) — complaints, negative/
  urgent sentiment, confidence < 0.6, sensitive topics (refund/billing/legal/
  privacy/cancellation — see `history_store.SENSITIVE_TERMS`), or customer replied
  again in an AI-handled thread.
- **Skipped** (`status: skipped`) — unrelated/newsletters/self-sent/already-handled.

Run modes (CLI flag / dashboard): `smart` (default), `auto` (send all),
`review` (queue all).

**AI context awareness:** `history_store.build_thread_context(thread_id)` feeds
the writer the prior conversation so follow-up replies use full thread memory
(`src/nodes.py` calls it before drafting).

---

## 3. ✅ What is ALREADY built (do not rebuild)

### Backend (`app_server.py`) — DONE
- `GET  /api/threads` — thread list with filters (status, sentiment, category, priority, date_range, search)
- `GET  /api/threads/{id}` — full thread timeline
- `GET  /api/threads/{id}/context` — the context the AI would use
- `POST /api/threads/{id}/approve` — send the latest draft
- `POST /api/threads/{id}/reject` — reject latest draft
- `POST /api/threads/{id}/mark-resolved` — mark resolved
- `GET  /api/analytics` — automation rate, intervention rate, time/cost saved, trends, top customers
- `GET  /api/review`, `POST /api/review/send|reject` — flat review queue (older, still works)
- `/api/stats`, `/api/history*`, `/api/documents*`, `/api/chat/*`, `/api/pipeline/*`, `/api/pipeline/gmail-status`

### Thread engine (`src/history_store.py`) — DONE
Thread grouping, `enrich_entry` (priority/requires_human/human_reason),
`thread_messages` timeline, `build_thread_context`, `filter_threads`, `analytics`.

### Pipeline (`src/graph.py`, `src/nodes.py`) — DONE
Thread-aware logging (thread_id, message_id, references, priority), smart
auto-send/review routing, conversation-context injection, Groq LLM with rate
limiting, graceful quota handling.

### Frontend — PARTIAL
Built pages: Dashboard, **Review Queue** (approve/edit/send/reject + date filter
+ detail popup), Email History + ContactDetail timeline, Documents (upload/view),
RAG Query, Policy Chat. **Missing: the Threads/Inbox page (see below).**

---

## 4. 🔨 What is LEFT to build (the actual work)

### PRIORITY 1 — Frontend Threads/Inbox page (biggest gap)
The whole thread backend exists but nothing renders it. Build
`frontend/src/pages/Threads.tsx` + route in `App.tsx` + nav in
`components/Layout.tsx`.

- **Tabs:** Needs Review · Auto-Handled · Sent · Drafts · Skipped · All
  (map to `?status=` on `/api/threads`).
- **Filters:** date_range (Today/Yesterday/7d/30d/Custom), sentiment, category,
  priority, search — all already supported by `/api/threads` query params.
- **Thread card:** customer email, subject, latest preview, status/priority/
  sentiment/category badges, last-updated **timestamp (date + time)**,
  message_count, "action needed" indicator (`requires_human`).
- Reuse styling from `ReviewQueue.tsx` and `History.tsx`.

### PRIORITY 2 — Thread detail page
`frontend/src/pages/ThreadDetail.tsx`, route `/threads/:id`. Calls
`GET /api/threads/{id}`.
- Full timeline (inbound customer / outbound AI / human-edited), timestamps,
  status changes, RAG sources, decision_reason.
- Editable latest draft + action buttons wired to existing endpoints:
  Approve & Send (`/approve`), Reject (`/reject`), Mark Resolved
  (`/mark-resolved`), Edit & Send (send edited body via `/approve` with body).
- **Missing endpoints to add:** `POST /api/threads/{id}/regenerate` (re-run the
  writer with full thread context — call the agents with `build_thread_context`),
  and optionally `mark-needs-follow-up`, `assign-to-human`.

### PRIORITY 3 — Analytics dashboard page
`frontend/src/pages/Analytics.tsx` consuming `GET /api/analytics` (data already
computed): automation vs intervention rate, sent/drafted/skipped/rejected,
sentiment & category breakdowns, daily trend, top customers, est. time/cost saved.
Use `recharts` (already a dependency, see `History.tsx` for examples).

### Known smaller gaps / fixes
- `app_server.py /api/stats`: `emails_sent` counts only `status=="sent"`, not
  `auto_sent`. Include `auto_sent` so the dashboard "Sent/Resolved" card is right.
- Two review surfaces coexist: flat `/api/review` (ReviewQueue.tsx) and
  thread `/api/threads/{id}/approve`. Decide one; thread-based is the better UX.
- `/api/threads/{id}/approve` should support an **edited body** in the request
  so "Edit & Send" persists the human edit.
- Backfill: old `email_history.json` entries may lack `thread_id`/`message_id`;
  `history_store.enrich_entry` already falls back, but verify threading on real data.

---

## 5. Data model (already implemented in `history_store.py`)
Flat entries in `email_history.json`, grouped into threads at read time. Each
entry: `timestamp, thread_id, message_id, references, sender_email,
sender_subject, incoming_body, category, sentiment, sentiment_confidence,
sentiment_summary, generated_reply, status, priority, requires_human,
human_reason, rag_sources?, reviewed_at?`. Statuses: `auto_sent | sent | draft |
needs_review | skipped | rejected | resolved | follow_up`.

---

## 6. Validation checklist (do this after each piece)
- [ ] `python -c "import ast; ..."` syntax + `npx tsc -b --noEmit` clean
- [ ] Backend up: `curl localhost:5000/api/threads` returns threads
- [ ] Send a test email → `python main.py` → safe one shows `auto_sent`, a
      complaint/refund one shows `needs_review` in `/api/threads?status=needs_review`
- [ ] Approve a thread → reply actually sent (check Gmail Sent) → status flips to `sent`
- [ ] `/api/analytics` automation_rate / human_review move as expected
- [ ] Frontend: tabs + filters + thread detail render and actions work end-to-end

---

## 7. Suggested build order
1. Threads/Inbox page (P1) → immediately makes the existing backend usable.
2. Thread detail page + `regenerate` endpoint (P2).
3. Analytics page (P3).
4. Smaller fixes (stats count, edited-body approve, unify review surfaces).
5. Then industry-readiness items (RBAC, audit log, secrets manager, SLA) —
   see the synthesis in the chat history / `docs/chat_feature/`.
