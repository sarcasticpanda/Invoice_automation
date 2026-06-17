# Architecture Notes

Developer reference for working with this codebase.

## What this is

**InvoiceFlow** — an AI agent that reads a Gmail inbox, categorizes incoming customer emails, answers product questions using RAG over uploaded business documents, drafts replies, self-proofreads them, and either auto-sends or saves them as Gmail drafts. The orchestration is a **LangGraph state machine** (`src/graph.py`). A React dashboard (`frontend/`) talks to a FastAPI backend (`app_server.py`) for document upload, history, stats, and triggering pipeline runs.

## Commands

### Backend (Python)
```sh
# Activate venv (Windows)
venv\Scripts\activate

pip install -r requirements.txt

# Run the LangGraph pipeline once over the inbox
python main.py                 # auto-send ON (sends real replies) — this is the default
python main.py --no-auto-send  # save replies as Gmail DRAFTS instead

# Run the dashboard API (port 5000) — also used by the frontend
python app_server.py

# (Re)build the vector store from data/*.txt — REQUIRED before RAG works
python populate_db_local.py    # ACTIVE path: HuggingFace embeddings -> db_local/
```

There is no test runner configured. `test_*.py`, `check_*.py`, `inspect_*.py`, `fix_*.py` in the repo root are **throwaway diagnostic scripts**, not a test suite — don't treat them as canonical, and prefer not to add to that pile.

### Frontend (`frontend/`)
```sh
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

### Required environment (`.env` in repo root)
```
MY_EMAIL=your_email@gmail.com   # used to skip the bot's own outgoing mail
GOOGLE_API_KEY=...              # Gemini, used by the active LLM agents
GROQ_API_KEY=...                # only used by the /api/rag-query test endpoint
```
Gmail auth: `credentials.json` (OAuth client) must be present; first run opens a browser consent flow and writes `token.json`. Scope is `gmail.modify`.

## Architecture

### The pipeline graph (`src/graph.py`)
The whole product is this one `StateGraph`. Read it first. Flow:

```
load_inbox_emails -> is_email_inbox_empty --(empty)--> END
                                           --(process)--> categorize_email -> analyze_sentiment
analyze_sentiment routes on category:
  product_enquiry      -> construct_rag_queries -> retrieve_from_rag -> email_writer
  complaint/feedback   -> email_writer                  (skips RAG)
  unrelated            -> skip_unrelated_email -> (back to inbox loop)
email_writer -> email_proofreader --(send)----> send_email   -> back to inbox loop
                                  --(rewrite)--> email_writer (retry, max 3 trials)
                                  --(stop)-----> give up, next email
```

- **`send_email` node is swapped at compile time** by the `auto_send` flag: `send_email_response` (real send) vs `create_draft_response` (Gmail draft). Set via `main.py` CLI args, propagated through `Workflow(auto_send=...)`.
- The inbox is processed as a **stack**: nodes operate on `state["emails"][-1]` and `.pop()` it when done. The graph loops back to `is_email_inbox_empty` until the list drains.
- **Self-correction loop**: the proofreader returns a `sendable` bool; if false the writer rewrites, up to `trials >= 3` then bails. `writer_messages` accumulates draft+feedback history so the writer sees its prior attempts.

### Layers
- `src/state.py` — `GraphState` (the TypedDict threaded through every node) and the `Email` pydantic model.
- `src/nodes.py` — `Nodes` class; one method per graph node. Also owns conversation logging to `email_history.json`.
- `src/agents.py` — `Agents` class; builds the LangChain chains (prompt | LLM | structured output). Each node calls an agent.
- `src/prompts.py` — all prompt templates.
- `src/structure_outputs.py` — pydantic schemas for `with_structured_output` (categories, sentiment, RAG queries, writer/proofreader results). The category and sentiment **enums here are the source of truth** for routing strings.
- `src/tools/GmailTools.py` — all Gmail API I/O: fetches unanswered threads from the **last 8 hours**, skips threads that already have a draft, builds threaded RFC-822 replies (In-Reply-To/References), sends or drafts.

### Persistence
- **Conversation history is `email_history.json`** (a flat JSON list, read/written by `_load_history`/`_save_history` in `src/nodes.py`). This is what the dashboard's history/contacts/stats endpoints read. There is no database in the live path.
- `prisma/` and `supabase_migration.sql` are an **abandoned Postgres/Supabase path** — not wired into the running app. Don't assume they reflect current behavior.

## Gotchas / inconsistencies to know

- **LLM provider mismatch.** `src/agents.py` actually uses **Gemini** (`ChatGoogleGenerativeAI(model="gemini-2.0-flash")`) even though the local variable is named `llama` and `RUN_GUIDE.md` says Groq. Groq is only used by the `/api/rag-query` debug endpoint in `app_server.py`. Trust the code, not the doc.
- **Two vector stores with incompatible embeddings.** The **active** store is `db_local/` built with HuggingFace `all-MiniLM-L6-v2` (384-dim) via `populate_db_local.py`; both `src/agents.py` and `app_server.py` read it. The older `db/` is built by `create_index.py` with Gemini embeddings (3072-dim) and is **not** what the pipeline uses. Mixing embedding models against the same Chroma dir causes dimension errors — this is what the `fix_dimension*.py` scratch scripts were fighting.
- **Two backend servers.** `app_server.py` (FastAPI, **port 5000**) is the real dashboard backend. `deploy_api.py` (LangServe, port 8000) is a thin legacy wrapper around the raw graph; the frontend does not use it.
- The dashboard's `/api/pipeline/run` shells out to `python main.py` as a subprocess rather than invoking the graph in-process, and background polling does the same with `--auto-send`. Changes to `main.py`'s CLI surface affect the dashboard.
- RAG only runs for `product_enquiry`; complaints/feedback go straight to the writer with no retrieved context.
