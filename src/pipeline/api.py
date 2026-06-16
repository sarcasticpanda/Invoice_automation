from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from typing import List, Optional
from pydantic import BaseModel
from src.pipeline.document_processor import process_document
from src.pipeline.agents import get_db_connection, embeddings
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="InvoiceFlow AI API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class OverrideRequest(BaseModel):
    human_response: str

# --- Endpoints ---

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        process_document(file_path)
        return {"message": f"Successfully uploaded and started processing {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/api/documents")
def list_documents():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM documents ORDER BY uploaded_at DESC")
    docs = cur.fetchall()
    cur.close()
    conn.close()
    return docs

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Document and associated chunks deleted."}

@app.get("/api/documents/test-rag")
def test_rag(question: str):
    query_vector = embeddings.embed_query(question)
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM match_chunks(%s, 0.4, 5)", (query_vector,))
    chunks = cur.fetchall()
    cur.close()
    conn.close()
    return chunks

@app.get("/api/tickets")
def list_tickets(status: Optional[str] = None, priority: Optional[str] = None):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    query = "SELECT * FROM tickets WHERE 1=1"
    params = []
    if status:
        query += " AND status = %s"
        params.append(status)
    if priority:
        query += " AND priority = %s"
        params.append(priority)
    query += " ORDER BY created_at DESC"
    cur.execute(query, params)
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return tickets

@app.get("/api/escalations")
def list_escalations():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT t.* FROM tickets t WHERE t.status = 'escalated' ORDER BY t.created_at DESC")
    escalations = cur.fetchall()
    cur.close()
    conn.close()
    return escalations

@app.get("/api/analytics")
def get_analytics():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Total tickets
    cur.execute("SELECT count(*) as total FROM tickets")
    total = cur.fetchone()['total']
    
    # Status breakdown
    cur.execute("SELECT status, count(*) as count FROM tickets GROUP BY status")
    status_counts = cur.fetchall()
    
    # Sentiment breakdown
    cur.execute("SELECT sentiment_label, count(*) as count FROM tickets GROUP BY sentiment_label")
    sentiment_counts = cur.fetchall()
    
    # Category breakdown
    cur.execute("SELECT category, count(*) as count FROM tickets GROUP BY category")
    category_counts = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        "total_tickets": total,
        "status_breakdown": status_counts,
        "sentiment_breakdown": sentiment_counts,
        "category_breakdown": category_counts
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
