import os
from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from docx import Document
import psycopg2
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

def get_db_connection():
    password = "Saubhagya@15"
    encoded_password = quote_plus(password)
    conn_str = f"postgresql://postgres.opfzqagvbglgqanjnkca:{encoded_password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
    return psycopg2.connect(conn_str)

def process_document(file_path: str):
    file_name = os.path.basename(file_path)
    file_type = file_name.split('.')[-1].lower()
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Save to documents table
    cur.execute(
        "INSERT INTO documents (name, file_type, status) VALUES (%s, %s, %s) RETURNING id;",
        (file_name, file_type, 'processing')
    )
    doc_id = cur.fetchone()[0]
    conn.commit()
    
    try:
        # 2. Extract text
        text = ""
        if file_type == 'pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        elif file_type == 'docx':
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

        # 3. Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_text(text)
        
        # 4. Generate embeddings and save
        print(f"Generating embeddings for {len(chunks)} chunks...")
        for i, chunk_text in enumerate(chunks):
            embedding = embeddings.embed_query(chunk_text)
            metadata = {"chunk_index": i, "file_name": file_name}
            
            cur.execute(
                "INSERT INTO chunks (document_id, chunk_text, embedding, metadata) VALUES (%s, %s, %s, %s)",
                (doc_id, chunk_text, embedding, str(metadata).replace("'", '"'))
            )
        
        # 5. Update status
        cur.execute(
            "UPDATE documents SET status = %s, chunk_count = %s WHERE id = %s",
            ('ready', len(chunks), doc_id)
        )
        conn.commit()
        print(f"Document {file_name} processed successfully.")
        
    except Exception as e:
        conn.rollback()
        cur.execute("UPDATE documents SET status = %s WHERE id = %s", ('failed', doc_id))
        conn.commit()
        print(f"Error processing document {file_name}: {e}")
    
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    # Test with agency.txt
    process_document("data/agency.txt")
