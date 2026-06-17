# Implementation, Verification, and Validation Plan
**Project:** AI Customer Support Email Automation System  
**Frameworks:** FastAPI, React, Supabase (pgvector), LangGraph, Gmail API

This document provides a rigorous step-by-step roadmap for building the system. Every phase includes **Verification** (Does the code work technically?) and **Validation** (Does it solve the business problem correctly?).

---

## Phase 1: Database & Data Layer (Supabase)
**Implementation Steps:**
1. Execute `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL Editor.
2. Create `tickets`, `documents`, `chunks`, and `escalations` tables with proper foreign key relationships.
3. Configure Row Level Security (RLS) policies if required for the API.

**Verification (Technical Testing):**
- [ ] Insert a mock record into the `tickets` table successfully.
- [ ] Insert a mock vector of `size 1536` into the `chunks` table without dimension errors.
- [ ] Verify foreign key constraints block deleting a `document` if `chunks` exist (unless ON DELETE CASCADE is set).

**Validation (Business Acceptance):**
- [ ] The database schema perfectly mirrors the required data structures (capturing sentiment, scores, priority, and RAG context).

---

## Phase 2: Environment & Dependencies
**Implementation Steps:**
1. Add new variables to `.env` (`OPENAI_API_KEY`, `HUMAN_AGENT_EMAIL`, etc.).
2. Update `requirements.txt` with: `langgraph`, `langchain`, `pgvector`, `pypdf`, `python-docx`, `google-auth`, etc.
3. Run `pip install -r requirements.txt`.

**Verification:**
- [ ] Run `python -c "import langgraph, pgvector, pypdf; print('OK')"` without module errors.
- [ ] Validate that FastAPI server boots successfully without dependency conflicts.

**Validation:**
- [ ] Environment is secure (no keys hardcoded in the repository).

---

## Phase 3: LangGraph AI Pipeline (The Brain)
**Implementation Steps:**
1. Build the `StateGraph` in `/backend/pipeline/agents.py`.
2. Implement all 8 nodes: `validate`, `categorize`, `sentiment`, `priority`, `rag_retrieve`, `generate`, `action`, `reevaluate`.
3. Implement conditional routing logic (`route_decision`).

**Verification:**
- [ ] Unit Test: Send a known "Angry" email to the sentiment node; verify it outputs `sentiment_score < 0` and `priority == Urgent`.
- [ ] Unit Test: Send a "Spam" email to the validate node; verify execution halts immediately.
- [ ] Integration Test: Run a hardcoded test email through the entire graph and capture the final state dictionary.

**Validation:**
- [ ] The generated response perfectly matches the tone required (calm for angry, helpful for neutral).
- [ ] The system accurately routes extreme cases to `escalate_to_human`.

---

## Phase 4: Document Upload Pipeline (RAG Setup)
**Implementation Steps:**
1. Create `/backend/pipeline/document_processor.py`.
2. Implement PyPDF / python-docx text extraction.
3. Implement text splitting (200-500 words, 50-word overlap).
4. Connect to OpenAI `text-embedding-3-small` and insert into Supabase `chunks`.

**Verification:**
- [ ] Upload a 5-page PDF; verify the `chunk_count` accurately reflects the number of splits.
- [ ] Query the Supabase `chunks` table directly using cosine similarity (`<=>`) and ensure mathematical nearest neighbors return.

**Validation:**
- [ ] Uploaded policies are parsed accurately without garbled text or missing paragraphs.
- [ ] Admin can see the document status change from `processing` to `ready`.

---

## Phase 5: Gmail Integration & Endpoints
**Implementation Steps:**
1. Create `/backend/gmail/gmail_service.py` to poll every 60 seconds.
2. Build FastAPI endpoints (e.g., `POST /api/documents/upload`, `GET /api/tickets`, `POST /api/escalations/{id}/approve`).

**Verification:**
- [ ] Mock a new unread email in Gmail; verify the polling script picks it up within 60 seconds.
- [ ] Call `GET /api/tickets` via Swagger UI/Postman and verify JSON response matches the DB schema.
- [ ] Test the `/api/documents/test-rag` endpoint with a test query to ensure chunks are returned.

**Validation:**
- [ ] The system actively replies to emails via the Gmail API when `auto-send` is triggered.
- [ ] Human agents receive an alert email exactly when a ticket is marked as `escalated`.

---

## Phase 6: Admin Frontend (React)
**Implementation Steps:**
1. Replace current admin layouts with 4 new views: `Ticket Feed`, `Escalation Queue`, `Documents`, `Analytics`.
2. Connect to the FastAPI endpoints via Axios or Fetch.
3. Implement auto-refresh (5s polling or WebSockets) on the Ticket Feed.

**Verification:**
- [ ] Verify React renders the Category and Sentiment badges correctly based on JSON payload values.
- [ ] Test the Document drag-and-drop upload zone; ensure a 200 OK response from the backend.
- [ ] Click "Override" in the Escalation Queue; verify the text editor opens and sends a successful POST request.

**Validation:**
- [ ] The dashboard provides a seamless, real-time "Support Center" experience.
- [ ] The analytics charts accurately reflect the data in the Supabase tickets table.

---

## Phase 7: End-to-End User Acceptance Testing (UAT)
**The Final Gauntlet:**
1. **The Policy Test:** Upload a fake company refund policy via the React frontend.
2. **The Angry Customer Test:** Send an email from a personal account saying: "I demand a refund immediately, your software is broken and unacceptable!"
3. **The Observation:** 
   - Watch the React Ticket Feed.
   - Verify it appears within 60 seconds.
   - Verify it gets tagged as `Angry` and `Urgent`.
   - Verify it lands in the **Escalation Queue**.
   - Review the AI Draft response (ensure it cited the fake refund policy).
4. **The Resolution:** Click "Approve" in the Escalation Queue and verify the reply arrives in your personal Gmail inbox.

**SUCCESS CRITERIA:** If the End-to-End test passes seamlessly, the application is validated for production deployment.
