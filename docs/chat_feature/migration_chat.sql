-- Policy Chat — Supabase migration (Basic scope, no auth)
-- Ported & simplified from reference_project/supabase/migrations/001_initial_schema.sql
-- Run once in the Supabase SQL editor (or via the service key).
--
-- Differences from the reference schema:
--   * user_id is a plain text tag (default 'company'), NOT a FK to profiles.
--   * Row Level Security is left DISABLED — the backend uses the service key.
--   * Document chunks / pgvector are intentionally omitted (retrieval stays on
--     the local ChromaDB db_local/).

create extension if not exists "pgcrypto";

-- Chat sessions (one conversation thread)
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default 'company',
  title       text default 'New Conversation',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Chat messages (user + assistant turns within a session)
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  user_id     text not null default 'company',
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  sources     jsonb default '[]',
  created_at  timestamptz default now()
);

create index if not exists idx_chat_messages_session
  on public.chat_messages (session_id, created_at);

create index if not exists idx_chat_sessions_updated
  on public.chat_sessions (updated_at desc);
