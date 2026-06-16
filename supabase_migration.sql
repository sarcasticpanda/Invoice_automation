-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_from text,
  email_subject text,
  email_body text,
  category text,  -- billing / technical / general
  sentiment_label text,  -- Angry / Frustrated / Neutral / Happy
  sentiment_score float,  -- -1.0 to 1.0
  sentiment_triggers text[],  -- phrases that caused the sentiment
  priority text,  -- Urgent / Normal / Low
  rag_context text,  -- what was retrieved
  draft_response text,
  suggested_action text,  -- refund / escalate / follow-up / close
  final_response text,
  status text,  -- auto-sent / escalated / resolved
  escalated boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  file_type text,  -- pdf / docx
  status text,  -- processing / ready / failed
  chunk_count int,
  version int DEFAULT 1,
  uploaded_at timestamp DEFAULT now()
);

-- Create chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text text,
  embedding vector(1536),
  metadata jsonb,  -- section name, category, page number
  created_at timestamp DEFAULT now()
);

-- Create escalations table
CREATE TABLE IF NOT EXISTS escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  handled_by text,  -- agent email
  action_taken text,  -- approved / overridden
  human_response text,
  resolved_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.document_id,
    chunks.chunk_text,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;
