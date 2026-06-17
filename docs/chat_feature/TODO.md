# Policy Chat Feature — Objective TODO

**Goal:** Let company staff chat with an AI that answers from the company's
privacy-policy / business documents, with persisted multi-turn chat history,
so they don't have to read the whole document. Lives alongside the existing
email-automation pipeline.

**Scope chosen:** Basic (~1 day) · **History store:** Supabase (ported from `reference_project`)
**Branch:** `feature/policy-chat`

---

## Architecture decisions (locked)

- **Retrieval:** reuse the existing local ChromaDB (`db_local/`) + HuggingFace
  `all-MiniLM-L6-v2` embeddings already loaded in `app_server.py`. We do NOT move
  document chunks into Supabase pgvector (that's the Full-port path).
- **LLM:** Gemini `gemini-2.0-flash` (same provider as `src/agents.py`), via
  `GOOGLE_API_KEY`. Not Groq.
- **History store:** Supabase tables `chat_sessions` + `chat_messages`, ported
  from `reference_project/supabase/migrations/001_initial_schema.sql` but
  **simplified**: no `profiles` FK, no RLS. Backend uses the **service key**
  (bypasses RLS). All sessions owned by a fixed `user_id = "company"`.
- **Memory:** feed the last ~10 messages of the session back into the prompt.

---

## Tasks

### 1. Foundations
- [ ] `.gitignore` so `.env`, `token.json`, `credentials.json`, `venv/`,
      `node_modules/`, `db_local/` never get committed.
- [ ] `requirements-chat.txt` — only the extra deps this feature needs (`supabase`).

### 2. Database (Supabase)
- [ ] `docs/chat_feature/migration_chat.sql` — simplified `chat_sessions` +
      `chat_messages` (uuid PK, `user_id text`, `title`, `role`, `content`,
      `sources jsonb`, timestamps). No FK to profiles, RLS disabled.
- [ ] Run the migration against the Supabase project (user confirms / runs).

### 3. Backend — `src/chat_service.py`
- [ ] Supabase client init from `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.
- [ ] `create_session(title)` / `list_sessions()` / `get_session(id)`
- [ ] `get_messages(session_id)` / `get_recent_messages(session_id, limit=10)`
- [ ] `save_message(session_id, role, content, sources)`
- [ ] `delete_session(id)`
- [ ] `generate_answer(question, session_id)` — retrieve from `db_local`,
      build context, prepend recent history, call Gemini, persist both turns,
      return `{answer, sources, session_id}`.

### 4. Backend — routes in `app_server.py`
- [ ] `POST   /api/chat/session`
- [ ] `GET    /api/chat/sessions`
- [ ] `GET    /api/chat/session/{id}/messages`
- [ ] `POST   /api/chat/query`
- [ ] `DELETE /api/chat/session/{id}`

### 5. Frontend
- [ ] `frontend/src/pages/Chat.tsx` — sessions sidebar, message thread, input,
      source chips. Reuse styling from `RAGQuery.tsx`.
- [ ] Add "Chat" nav link in `frontend/src/components/Layout.tsx`.
- [ ] Wire route in the router (`App.tsx`).

### 6. Verify & document
- [ ] Manual run: create session → ask 2 follow-up questions → confirm memory +
      persistence (reload shows history).
- [ ] Log the change in `docs/chat_feature/UPDATES.md`.

---

## Out of scope (Basic)
- User accounts / login / admin approval (that's Full port).
- SSE token streaming (Polished).
- Auto-generated session titles (Polished).
- Moving document embeddings into Supabase pgvector.

## Open follow-ups
- [ ] **Rotate leaked keys** (Google, Groq, Supabase service) — exposed in chat/.env.
