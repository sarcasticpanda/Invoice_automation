<div align="center">

# InvoiceFlow

### AI-Powered Email Automation for Customer Support

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.1-FF6B35?style=flat)](https://langchain-ai.github.io/langgraph)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-E56717?style=flat)](https://www.trychroma.com)

**InvoiceFlow** is an end-to-end AI email automation system. It connects to a Gmail inbox, reads incoming customer emails, understands their intent, retrieves relevant context from your business documents, writes tailored replies, proofreads them, and either sends automatically or queues for human approval — all orchestrated by a LangGraph state machine.

</div>

---

![InvoiceFlow Landing Page](docs/screenshots/landing-full.png)

---

## The Problem It Solves

Customer-facing teams spend hours each day answering repetitive emails — order enquiries, refund requests, policy questions. These emails follow predictable patterns, yet each one needs a personalised, accurate reply. InvoiceFlow automates the entire loop while keeping humans in control of anything sensitive.

---

## How It Works

InvoiceFlow is built as a **directed graph** using LangGraph. Each email flows through a series of nodes, and routing decisions are made based on the output of each step.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Gmail Inbox (last 8 hrs)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    load_inbox_emails
                           │
               ┌─────── empty? ───────┐
               │ yes                  │ no
               ▼                      ▼
              END            categorize_email
                                      │
                             analyze_sentiment
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
       product_enquiry         complaint /              unrelated
              │                  feedback                     │
              ▼                       │               skip + next email
   construct_rag_queries              │
              │                       │
    retrieve_from_rag                 │
              │                       │
              └───────────┬───────────┘
                          ▼
                     email_writer
                          │
                  email_proofreader
                   /      |       \
                send    rewrite   stop
                 │        │         │
           send_email  (retry,    give up,
                │      max 3)    next email
                │
           back to inbox loop
```

### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| `load_inbox_emails` | Fetches unanswered Gmail threads from the last 8 hours; skips threads that already have a draft reply |
| `categorize_email` | Classifies the email into one of four categories using the LLM with structured output |
| `analyze_sentiment` | Detects tone (positive / neutral / negative / urgent) and routes accordingly |
| `construct_rag_queries` | For product enquiries: generates 2–3 targeted search queries from the email body |
| `retrieve_from_rag` | Runs queries against ChromaDB; returns top-k relevant document chunks |
| `email_writer` | Drafts a reply using the email, retrieved context, and prior draft+feedback history |
| `email_proofreader` | Evaluates the draft for tone, accuracy, and completeness; returns a `sendable` flag |
| `send_email` / `create_draft` | Either sends the reply via Gmail API or saves it as a Gmail draft for human review |

---

## Email Handling by Category

### Product Enquiries
When a customer asks about products, policies, pricing, or procedures — the pipeline triggers the full **RAG retrieval** path. It constructs specific search queries, retrieves the most relevant chunks from the vector store, and passes that context directly into the email writer. The reply is grounded in your actual business documents.

### Complaints & Feedback
Emails expressing dissatisfaction skip the RAG step (no document lookup needed) and go straight to the writer. The sentiment analysis node flags these as `negative` or `urgent`, which lowers the auto-send threshold — they are more likely to be queued for human review.

### Unrelated Emails
Emails that are spam, off-topic, or already resolved are silently skipped. The graph routes them to a `skip_unrelated_email` node that pops them from the inbox stack without writing any reply.

### Sensitive Keywords
A separate **smart-send guard** checks for terms like `refund`, `chargeback`, `legal`, `cancel subscription`, `delete account`. Any email containing these — regardless of category — is saved as a draft and surfaced in the Human Review Queue rather than being auto-sent.

---

## Self-Correcting Reply Loop

The writer and proofreader form a **feedback loop**:

1. Writer drafts a reply
2. Proofreader evaluates: is it accurate? Appropriate tone? Does it answer the question?
3. If `sendable = False` → proofreader returns specific feedback → writer revises using that feedback
4. Loop repeats up to **3 times**
5. If still not sendable after 3 attempts → the email is skipped and flagged

The writer sees the full conversation history (`writer_messages`) across retries, so each revision improves on the previous one.

---

## RAG System

### Vector Database
**ChromaDB** (persistent, local) is used as the vector store. It stores document chunks with metadata (source filename, chunk index) and supports semantic similarity search.

Path: `db_local/`

### Embeddings
**HuggingFace `all-MiniLM-L6-v2`** (384-dimensional vectors) via `sentence-transformers`. This model runs locally — no API calls needed for retrieval.

- Model size: ~90 MB
- Embedding dimension: 384
- Loaded once on startup and reused across all queries

### Document Processing
Upload flow (`populate_db_local.py`):
1. Accept PDF, TXT, or DOCX
2. Extract raw text (PyPDF / python-docx)
3. Chunk with `RecursiveCharacterTextSplitter` (500 chars, 50 overlap)
4. Embed all chunks with HuggingFace
5. Store in ChromaDB with source metadata

### Retrieval
For each product enquiry:
- 2–3 queries are constructed by the LLM from the email body
- Each query runs `similarity_search(k=3)` against ChromaDB
- Top results are concatenated and passed to the email writer as context

---

## LLM Layer

**Primary:** Google Gemini 2.0 Flash (`gemini-2.0-flash`) via `langchain-google-genai`
**Fallback chain:** OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`) → Groq (`llama-3.3-70b-versatile`)

All LLM calls use **structured output** (`with_structured_output`) with Pydantic schemas, guaranteeing consistent JSON responses that the graph can route on:

| Schema | Fields |
|---|---|
| `EmailCategory` | `category: Literal["product_enquiry", "complaint", "feedback", "unrelated"]` |
| `SentimentResult` | `sentiment`, `confidence`, `summary` |
| `RAGQueries` | `queries: list[str]` |
| `WriterResult` | `reply: str` |
| `ProofreaderResult` | `sendable: bool`, `feedback: str` |

---

## Features

- **Fully automated inbox processing** — runs on a schedule or manually triggered from the dashboard
- **Context-aware replies** — answers grounded in your own uploaded documents, not generic LLM knowledge
- **Self-proofreading loop** — replies are checked and revised before sending
- **Smart auto-send** — safe replies sent automatically; risky ones queued for human review
- **Human review queue** — review, edit, approve or reject any draft reply
- **Threaded inbox view** — all emails grouped by thread with status, priority, sentiment
- **Analytics dashboard** — automation rate, time saved, category breakdown, sentiment charts
- **Contact intelligence** — per-contact history with sentiment trends
- **Policy Chat** — multi-turn RAG chat over your documents (ask anything about your business)
- **Knowledge base management** — upload, view, and delete business documents via the dashboard
- **Light and dark mode** — glassmorphism UI with animated sky background
- **Multi-user auth** — Google OAuth login; each user has their own Gmail + isolated data

---

## Dashboard Pages

<table>
<tr>
<td width="50%"><img src="docs/screenshots/dashboard.png"/><p align="center"><em>Command Center — stats + pipeline trigger</em></p></td>
<td width="50%"><img src="docs/screenshots/dashboard-dark.png"/><p align="center"><em>Dark mode</em></p></td>
</tr>
<tr>
<td><img src="docs/screenshots/inbox.png"/><p align="center"><em>AI Inbox — threaded view with filters</em></p></td>
<td><img src="docs/screenshots/review-queue.png"/><p align="center"><em>Human Review Queue — edit and approve drafts</em></p></td>
</tr>
<tr>
<td><img src="docs/screenshots/analytics.png"/><p align="center"><em>Analytics — sentiment analysis + daily activity</em></p></td>
<td><img src="docs/screenshots/policy-chat.png"/><p align="center"><em>Policy Chat — multi-turn RAG assistant</em></p></td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI Orchestration** | LangGraph 1.1 — directed state graph |
| **LLM** | Google Gemini 2.0 Flash (primary), OpenRouter + Groq (fallback) |
| **Vector Store** | ChromaDB (persistent local) |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` (384-dim, local) |
| **Email** | Gmail API via `google-auth-oauthlib` |
| **Backend** | FastAPI + Uvicorn |
| **Frontend** | React 19 + Vite + TypeScript |
| **Styling** | Tailwind CSS 4 + CSS custom properties |
| **Charts** | Recharts |
| **Animation** | Motion (Framer Motion) |
| **Auth** | Google OAuth 2.0 + PyJWT |

---

## Project Structure

```
invoice_automation/
├── app_server.py          # FastAPI backend — all /api/* endpoints
├── main.py                # Pipeline CLI entry point
├── populate_db_local.py   # Build ChromaDB vector store from data/
├── render.yaml            # Render.com deployment config
├── ARCHITECTURE.md        # Developer reference & gotchas
│
├── src/
│   ├── graph.py           # LangGraph StateGraph — the pipeline wiring
│   ├── nodes.py           # One method per graph node
│   ├── agents.py          # LangChain chains: prompt | LLM | structured output
│   ├── prompts.py         # All prompt templates
│   ├── state.py           # GraphState TypedDict + Email Pydantic model
│   ├── structure_outputs.py  # Pydantic output schemas (category, sentiment, etc.)
│   ├── history_store.py   # Email history read/write + analytics calculations
│   ├── auth_service.py    # JWT utilities + per-user directory helpers
│   ├── chat_service.py    # Multi-turn RAG chat session management
│   ├── llm.py             # LLM provider with fallback chain
│   └── tools/
│       └── GmailTools.py  # Gmail API: fetch threads, send reply, create draft
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Routes + auth guards
│   │   ├── context/
│   │   │   ├── AuthContext.tsx        # JWT auth state management
│   │   │   └── ThemeContext.tsx       # Light / dark theme toggle
│   │   ├── components/
│   │   │   └── Layout.tsx             # Sidebar + animated background
│   │   └── pages/
│   │       ├── Landing.tsx            # Marketing landing page
│   │       ├── Login.tsx              # Google Sign-In
│   │       ├── Setup.tsx              # First-time API key entry
│   │       ├── Dashboard.tsx          # Command center + pipeline controls
│   │       ├── Threads.tsx            # Threaded AI inbox
│   │       ├── ReviewQueue.tsx        # Human approval queue
│   │       ├── Analytics.tsx          # Charts + sentiment breakdown
│   │       ├── History.tsx            # Contact intelligence hub
│   │       ├── Documents.tsx          # Knowledge base management
│   │       └── Chat.tsx               # Policy assistant (RAG chat)
│   └── vite.config.ts
│
├── data/                  # Business documents for RAG (gitignored)
├── db_local/              # ChromaDB vector store (gitignored)
└── docs/screenshots/      # UI screenshots
```

---

## Quick Start

```bash
# 1. Clone and set up Python environment
git clone https://github.com/sarcasticpanda/Invoice_automation.git
cd Invoice_automation
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 2. Configure credentials
cp .env.example .env
# Edit .env: add MY_EMAIL, GOOGLE_API_KEY (Gemini), GROQ_API_KEY

# 3. Gmail authorisation (opens browser once)
python main.py

# 4. Build the vector store from your documents
# Place PDFs/TXTs in data/, then:
python populate_db_local.py

# 5. Start the backend API
python app_server.py

# 6. Start the frontend
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

**Run modes:**
```bash
python main.py              # Smart — auto-send safe, queue sensitive
python main.py --auto-send  # Send everything automatically
python main.py --no-auto-send  # Queue everything for review
```

---

## License

MIT © 2026 [Sarcastic Panda](https://github.com/sarcasticpanda)
