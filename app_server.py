"""
InvoiceFlow — API Server
Unified backend: document upload, RAG query, email history, pipeline control
"""
import os
import json
import shutil
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from dotenv import load_dotenv
from src import history_store

load_dotenv()

app = FastAPI(title="InvoiceFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared embeddings + vectorstore (singleton)
from langchain_community.embeddings import HuggingFaceEmbeddings
import chromadb

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
_chroma_client = chromadb.PersistentClient(path="db_local")
_vectorstore = Chroma(client=_chroma_client, embedding_function=embeddings)

HISTORY_FILE = "email_history.json"
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)


def _load_history():
    return history_store.load_history()


# ─── Document Upload ───

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document, extract text, chunk it, and index into ChromaDB."""
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        ext = file.filename.rsplit('.', 1)[-1].lower()

        if ext == "pdf":
            from langchain_community.document_loaders import PyPDFLoader
            loader = PyPDFLoader(file_path)
            pages = loader.load()
            text = "\n".join([p.page_content for p in pages])
        elif ext == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        elif ext == "docx":
            from docx import Document
            doc = Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs])
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported: {ext}")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Document is empty")

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_text(text)

        # Save to data/ for persistence
        data_path = os.path.join(DATA_DIR, file.filename)
        shutil.copy2(file_path, data_path)

        # Index into ChromaDB
        metadatas = [{"source": file.filename, "chunk_index": i} for i in range(len(chunks))]
        _vectorstore.add_texts(texts=chunks, metadatas=metadatas)

        return {"message": f"Indexed '{file.filename}' — {len(chunks)} chunks", "chunks": len(chunks)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.get("/api/documents")
def list_documents():
    """List all documents in the data/ folder."""
    docs = []
    if os.path.exists(DATA_DIR):
        for f in os.listdir(DATA_DIR):
            fpath = os.path.join(DATA_DIR, f)
            if os.path.isfile(fpath):
                size_kb = round(os.path.getsize(fpath) / 1024, 1)
                docs.append({"name": f, "size_kb": size_kb})
    return docs


@app.get("/api/documents/{filename}/view")
def view_document(filename: str):
    """Open a document: return text for .txt, otherwise serve the raw file."""
    from fastapi.responses import FileResponse
    fpath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Not found")
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "txt":
        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
            return {"name": filename, "type": "text", "content": f.read()}
    # pdf/docx: stream the file so the browser can open/download it
    return FileResponse(fpath, filename=filename)


@app.delete("/api/documents/{filename}")
def delete_document(filename: str):
    """Delete a document from the data folder."""
    fpath = os.path.join(DATA_DIR, filename)
    if os.path.exists(fpath):
        os.remove(fpath)
        return {"message": f"Deleted {filename}"}
    raise HTTPException(status_code=404, detail="Not found")


@app.get("/api/stats")
def get_stats():
    """Get system statistics."""
    try:
        total = _vectorstore._collection.count()
    except Exception:
        total = 0
    doc_count = len([f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))]) if os.path.exists(DATA_DIR) else 0
    metrics = history_store.analytics()

    return {
        "total_chunks": total,
        "total_docs": doc_count,
        "db_status": "Online" if total > 0 else "Empty",
        "emails_sent": metrics["sent"],
        "emails_drafted": metrics["drafted"],
        "needs_review": metrics["human_review"],
        "emails_skipped": metrics["skipped"],
        "emails_rejected": metrics["rejected"],
        "total_processed": metrics["total_processed"],
        "thread_count": metrics["thread_count"],
        "auto_handled": metrics["auto_handled"],
        "human_intervention_rate": metrics["human_intervention_rate"],
        "automation_rate": metrics["automation_rate"],
        "estimated_hours_saved": metrics["estimated_hours_saved"],
        "urgent_or_negative": metrics["urgent_or_negative"],
    }


# ─── RAG Query ───

@app.get("/api/rag-query")
def rag_query(q: str):
    """Test a RAG query against ChromaDB."""
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.runnables import RunnablePassthrough
    from langchain_core.output_parsers import StrOutputParser
    from langchain_groq import ChatGroq

    retriever = _vectorstore.as_retriever(search_kwargs={"k": 3})

    prompt = ChatPromptTemplate.from_template(
        "Using the following context, answer the question. If you don't know, say 'I don't know.'\n\nContext: {context}\n\nQuestion: {question}"
    )
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1)

    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke(q)
    return {"query": q, "answer": answer}


# ─── Email History ───

@app.get("/api/history")
def get_history():
    """Get all email conversation history."""
    history = [history_store.enrich_entry(h) for h in _load_history()]
    # Sort by timestamp descending (newest first)
    history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return history


@app.get("/api/history/contacts")
def get_contacts():
    """Get unique contacts with their conversation counts and latest activity."""
    history = _load_history()
    contacts = {}
    for entry in history:
        email = entry.get("sender_email", "unknown")
        if email not in contacts:
            contacts[email] = {
                "email": email,
                "total_conversations": 0,
                "latest_timestamp": "",
                "latest_subject": "",
                "sentiments": [],
                "categories": [],
            }
        contacts[email]["total_conversations"] += 1
        if entry.get("timestamp", "") > contacts[email]["latest_timestamp"]:
            contacts[email]["latest_timestamp"] = entry["timestamp"]
            contacts[email]["latest_subject"] = entry.get("sender_subject", "")
        if entry.get("sentiment"):
            contacts[email]["sentiments"].append(entry["sentiment"])
        if entry.get("category"):
            contacts[email]["categories"].append(entry["category"])
    
    # Calculate dominant sentiment for each contact
    for c in contacts.values():
        if c["sentiments"]:
            c["dominant_sentiment"] = max(set(c["sentiments"]), key=c["sentiments"].count)
        else:
            c["dominant_sentiment"] = "neutral"
        del c["sentiments"]
        c["categories"] = list(set(c["categories"]))
    
    result = list(contacts.values())
    result.sort(key=lambda x: x["latest_timestamp"], reverse=True)
    return result


@app.get("/api/history/contact/{email}")
def get_contact_conversations(email: str):
    """Get all conversations for a specific contact email."""
    history = _load_history()
    conversations = [h for h in history if h.get("sender_email") == email]
    conversations.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return conversations


# ─── Human Review Queue ───

def _save_history(history):
    history_store.save_history(history)


_gmail_client = None


def _gmail():
    global _gmail_client
    if _gmail_client is None:
        from src.tools.GmailTools import GmailToolsClass
        _gmail_client = GmailToolsClass()
    return _gmail_client


def _delete_gmail_draft_for_thread(thread_id):
    """Best-effort: remove the Gmail draft for a thread so we don't double up."""
    try:
        g = _gmail()
        for d in g.fetch_draft_replies():
            if d.get("threadId") == thread_id:
                g.service.users().drafts().delete(userId="me", id=d["draft_id"]).execute()
    except Exception:
        pass


@app.get("/api/review")
def list_review_queue():
    """AI replies awaiting human approval (status == 'draft')."""
    pending = [
        history_store.enrich_entry(h)
        for h in _load_history()
        if h.get("status") in history_store.REVIEW_STATUSES
    ]
    pending.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return pending


def _send_review_entry(entry, reply_text):
    from src.state import Email
    email = Email(
        id="", threadId=entry.get("thread_id", ""), messageId=entry.get("message_id", ""),
        references=entry.get("references", ""), sender=entry.get("sender_email", ""),
        subject=entry.get("sender_subject", ""), body=entry.get("incoming_body", ""),
    )
    _gmail().send_reply(email, reply_text)
    _delete_gmail_draft_for_thread(entry.get("thread_id", ""))


@app.post("/api/review/send")
async def review_send(request: Request):
    """Approve a (possibly edited) reply and actually send it via Gmail."""
    body = await request.json()
    ts = body.get("timestamp")
    reply_text = (body.get("reply_text") or "").strip()
    if not ts or not reply_text:
        raise HTTPException(status_code=400, detail="timestamp and reply_text required")
    history = _load_history()
    entry = next((h for h in history if h.get("timestamp") == ts), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    try:
        _send_review_entry(entry, reply_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send failed: {e}")
    entry["status"] = "sent"
    entry["requires_human"] = False
    entry["human_reason"] = entry.get("human_reason", "Approved by human reviewer")
    entry["generated_reply"] = reply_text
    entry["reviewed_at"] = datetime.now().isoformat()
    _save_history(history)
    return {"message": "Reply sent", "timestamp": ts}


@app.post("/api/review/reject")
async def review_reject(request: Request):
    """Discard a pending reply (and its Gmail draft)."""
    body = await request.json()
    ts = body.get("timestamp")
    history = _load_history()
    entry = next((h for h in history if h.get("timestamp") == ts), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    _delete_gmail_draft_for_thread(entry.get("thread_id", ""))
    entry["status"] = "rejected"
    entry["requires_human"] = False
    entry["reviewed_at"] = datetime.now().isoformat()
    _save_history(history)
    return {"message": "Rejected", "timestamp": ts}


# Threaded AI Inbox

@app.get("/api/threads")
def list_threads(
    status: str = "all",
    sentiment: str = "all",
    category: str = "all",
    priority: str = "all",
    date_range: str = "all",
    search: str = "",
):
    threads = history_store.build_threads()
    filtered = history_store.filter_threads(
        threads,
        status=status,
        sentiment=sentiment,
        category=category,
        priority=priority,
        date_range=date_range,
        search=search,
    )
    return {"threads": filtered, "total": len(filtered)}


@app.get("/api/threads/{thread_id}")
def get_thread(thread_id: str):
    thread = next((t for t in history_store.build_threads() if t["thread_id"] == thread_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.get("/api/threads/{thread_id}/context")
def get_thread_context(thread_id: str):
    return {"thread_id": thread_id, "context": history_store.build_thread_context(thread_id)}


@app.post("/api/threads/{thread_id}/approve")
async def approve_thread(thread_id: str, request: Request):
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    reply_text = (body.get("reply_text") or "").strip()
    history = _load_history()
    candidates = [
        h for h in history
        if h.get("thread_id") == thread_id and h.get("status") in history_store.REVIEW_STATUSES
    ]
    if not candidates:
        raise HTTPException(status_code=404, detail="No pending draft found for this thread")
    entry = sorted(candidates, key=lambda h: h.get("timestamp", ""))[-1]
    reply_text = reply_text or entry.get("generated_reply", "")
    if not reply_text.strip():
        raise HTTPException(status_code=400, detail="reply_text required")
    try:
        _send_review_entry(entry, reply_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send failed: {e}")
    entry["status"] = "sent"
    entry["requires_human"] = False
    entry["generated_reply"] = reply_text
    entry["reviewed_at"] = datetime.now().isoformat()
    entry["human_reason"] = entry.get("human_reason", "Approved by human reviewer")
    _save_history(history)
    return {"message": "Thread reply sent", "thread_id": thread_id}


@app.post("/api/threads/{thread_id}/reject")
def reject_thread(thread_id: str):
    history = _load_history()
    candidates = [
        h for h in history
        if h.get("thread_id") == thread_id and h.get("status") in history_store.REVIEW_STATUSES
    ]
    if not candidates:
        raise HTTPException(status_code=404, detail="No pending draft found for this thread")
    entry = sorted(candidates, key=lambda h: h.get("timestamp", ""))[-1]
    _delete_gmail_draft_for_thread(thread_id)
    entry["status"] = "rejected"
    entry["requires_human"] = False
    entry["reviewed_at"] = datetime.now().isoformat()
    _save_history(history)
    return {"message": "Thread draft rejected", "thread_id": thread_id}


@app.post("/api/threads/{thread_id}/mark-resolved")
def mark_thread_resolved(thread_id: str):
    history = _load_history()
    changed = False
    for entry in history:
        if entry.get("thread_id") == thread_id:
            entry["status"] = "resolved" if entry.get("status") in history_store.ACTIVE_STATUSES else entry.get("status", "resolved")
            entry["requires_human"] = False
            entry["resolved_at"] = datetime.now().isoformat()
            changed = True
    if not changed:
        raise HTTPException(status_code=404, detail="Thread not found")
    _save_history(history)
    return {"message": "Thread marked resolved", "thread_id": thread_id}


@app.get("/api/analytics")
def get_analytics():
    return history_store.analytics()


# ─── Pipeline Control ───

import asyncio

POLLING_ENABLED = False
POLLING_INTERVAL = 60
_polling_task = None


def gmail_status():
    """Check Gmail auth WITHOUT triggering an interactive browser login.
    Returns (ready: bool, message: str). Prevents the pipeline from spawning
    a main.py that hangs forever on run_local_server when the token is dead."""
    SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
    if not os.path.exists("token.json"):
        return False, "No token.json — run `python main.py` once locally to sign in to Gmail."
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request as GRequest
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
        if creds and creds.valid:
            return True, "Gmail connected."
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GRequest())  # silent refresh, no browser
            with open("token.json", "w") as f:
                f.write(creds.to_json())
            return True, "Gmail token refreshed."
        return False, "Gmail token invalid. Run `python main.py` locally to re-authorize."
    except Exception as e:
        return False, f"Gmail re-auth needed ({type(e).__name__}). Run `python main.py` locally to sign in again."


@app.get("/api/pipeline/gmail-status")
def get_gmail_status():
    ready, message = gmail_status()
    return {"ready": ready, "message": message}

async def poll_pipeline():
    """Background task to continuously run the pipeline when enabled."""
    global POLLING_ENABLED, POLLING_INTERVAL
    import sys
    while True:
        if POLLING_ENABLED:
            ready, _ = gmail_status()
            if not ready:
                # Don't spawn a main.py that will hang on browser auth.
                await asyncio.sleep(POLLING_INTERVAL)
                continue
            try:
                # We run it with auto-send enabled during polling
                process = await asyncio.create_subprocess_exec(
                    sys.executable, "main.py", "--smart",
                    cwd=os.path.dirname(os.path.abspath(__file__)),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await process.communicate()
            except Exception as e:
                print(f"Polling error: {e}")
        await asyncio.sleep(POLLING_INTERVAL)

@app.on_event("startup")
async def startup_event():
    global _polling_task
    _polling_task = asyncio.create_task(poll_pipeline())

@app.get("/api/pipeline/polling")
def get_polling_status():
    return {"enabled": POLLING_ENABLED, "interval": POLLING_INTERVAL}

@app.post("/api/pipeline/polling")
async def set_polling_status(request: Request):
    global POLLING_ENABLED, POLLING_INTERVAL
    body = await request.json()
    if "enabled" in body:
        POLLING_ENABLED = body["enabled"]
    if "interval" in body:
        POLLING_INTERVAL = body["interval"]
    return {"enabled": POLLING_ENABLED, "interval": POLLING_INTERVAL}

@app.post("/api/pipeline/run")
async def run_pipeline(request: Request):
    """Run the email processing pipeline."""
    import subprocess
    import sys
    
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    # mode: smart (default) | auto | review. Back-compat: auto_send=False -> review.
    mode = body.get("mode")
    if mode is None:
        mode = "auto" if body.get("auto_send", None) is True else (
            "review" if body.get("auto_send", None) is False else "smart")

    # Fail fast if Gmail isn't authed — otherwise main.py hangs on browser login.
    ready, message = gmail_status()
    if not ready:
        return {"status": "auth_required", "message": message}

    try:
        args = [sys.executable, "main.py"]
        args.append({"auto": "--auto-send", "review": "--no-auto-send"}.get(mode, "--smart"))

        result = subprocess.run(
            args,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True,
            text=True,
            timeout=300,
        )
        return {
            "status": "completed",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "message": "Pipeline took too long"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Policy Chat ───
# Multi-turn RAG chat over company docs, history persisted in Supabase.
# Reuses the shared _vectorstore retriever defined above.
from src import chat_service

_chat_retriever = _vectorstore.as_retriever(search_kwargs={"k": chat_service.TOP_K})


@app.post("/api/chat/session")
async def chat_create_session(request: Request):
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    title = body.get("title", "New Conversation")
    return {"session": chat_service.create_session(title)}


@app.get("/api/chat/sessions")
def chat_list_sessions():
    return {"sessions": chat_service.list_sessions()}


@app.get("/api/chat/session/{session_id}/messages")
def chat_get_messages(session_id: str):
    session = chat_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": session, "messages": chat_service.get_messages(session_id)}


@app.post("/api/chat/query")
async def chat_query(request: Request):
    body = await request.json()
    question = (body.get("question") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        return chat_service.generate_answer(
            question, body.get("session_id"), _chat_retriever
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/chat/session/{session_id}")
def chat_delete_session(session_id: str):
    chat_service.delete_session(session_id)
    return {"message": "Session deleted"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "5000"))  # Render/Railway inject $PORT
    print(f"\n>>> InvoiceFlow API Server running at: http://localhost:{port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
