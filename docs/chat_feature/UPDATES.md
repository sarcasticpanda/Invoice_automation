# Policy Chat — Major Updates

Running log of significant changes for the policy-chat feature.
Keep this file under 200 lines; when it grows, archive older entries to
`UPDATES_archive.md` and keep only the latest milestones here.

Format: `YYYY-MM-DD — summary` with bullets for what changed.

---

## 2026-06-16 — Feature kickoff

- Created branch `feature/policy-chat`.
- Scope locked: **Basic** chat-with-history; history in **Supabase** (ported
  from `reference_project`); retrieval stays on local ChromaDB (`db_local/`);
  LLM is Gemini `gemini-2.0-flash`.
- Added planning docs: `docs/chat_feature/TODO.md`, this file.
- Added `requirements-chat.txt` (extra dep: `supabase`).

## 2026-06-16 — Working end-to-end against live Supabase

- New Supabase project `nsbtsabteetswttmxlrd` created; ran migration directly
  over the DB connection (IPv6) — both tables created. `.env` updated with new
  URL + `sb_secret_` service key.
- **Verified live:** sessions/messages CRUD via REST, plus full RAG chat —
  Gemini answered from `data/company_policies.txt` with sources, and a
  follow-up question used conversation memory. ✓
- **Model fix:** `gemini-2.0-flash` returns 429 (zero free-tier quota on the
  Google keys); switched chat to **`gemini-2.5-flash`**, which has quota.
  NOTE: `src/agents.py` (email pipeline) still uses `gemini-2.0-flash` and will
  hit the same 429 — needs the same switch if that pipeline is used.
- **Bug fixed:** `populate_db_local.py` wrote chunks to collection
  `invoice_docs`, but the app reads Chroma's default `langchain` collection, so
  retrieval always saw 0 docs. Removed the `collection_name` so both match.
  Re-populated -> 36 chunks now visible to the app.
- Swapped `GOOGLE_API_KEY` to the key the user provided for this work.

## 2026-06-16 — Basic chat built end-to-end

- **Backend:** `src/chat_service.py` — session/message CRUD + `generate_answer`
  (retrieve from `db_local` → prepend last 10 messages → Gemini → persist both
  turns → return answer + source chips).
- **Storage:** talks to Supabase via the **PostgREST REST API over httpx** using
  the service key. Dropped the `supabase` Python SDK — its httpx/websockets pins
  broke the Gemini client. `requirements-chat.txt` now only needs `httpx>=0.28.1`.
- **API:** added `/api/chat/session`, `/api/chat/sessions`,
  `/api/chat/session/{id}/messages`, `/api/chat/query`, `/api/chat/session/{id}`
  (DELETE) to `app_server.py`, reusing the shared `_vectorstore` retriever.
- **Frontend:** new `pages/Chat.tsx` (sessions sidebar + thread + source chips),
  wired into `App.tsx` router and `Layout.tsx` nav as "Policy Chat".
- **Security:** added `.gitignore` covering `.env`, `token.json`,
  `credentials.json`, `venv/`, `node_modules/`, `db_local/`.
- **Verified:** Python syntax, coexisting imports with Gemini stack, existing
  pipeline still imports, frontend `tsc -b` clean.
- **NOT yet done:** run `docs/chat_feature/migration_chat.sql` in Supabase;
  live end-to-end test (sandbox here has no network to Supabase).

<!-- Append new milestones above this line as the build progresses -->
