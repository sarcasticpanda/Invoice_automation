"""
Policy Chat — service layer.

Multi-turn RAG chat over the company's documents, with history persisted in
Supabase. Retrieval uses the caller-supplied ChromaDB retriever (the same
`db_local/` store the rest of the app uses); the LLM is Gemini.

History storage is ported from reference_project but simplified for the Basic
scope: no auth, all sessions owned by a fixed `USER_ID`. We talk to Supabase
through its PostgREST REST API directly over httpx (using the service key,
which bypasses RLS) — deliberately avoiding the heavy `supabase` SDK, whose
httpx/websockets pins conflict with the Gemini client.
"""
import os
import logging

import httpx
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger(__name__)

# Basic scope: single implicit owner for every conversation.
USER_ID = "company"
HISTORY_LIMIT = 10  # how many prior messages to feed back as memory
TOP_K = 3

SYSTEM_PROMPT = (
    "You are the company's friendly internal policy assistant for staff.\n"
    "- For greetings or small talk, reply naturally and warmly, and offer to help "
    "with company policy questions.\n"
    "- For questions about company policy, processes or documents, answer using the "
    "context below. Don't invent specific figures, dates or rules that aren't there. "
    "If something genuinely isn't covered, say so briefly and suggest what they could "
    "ask or upload instead.\n"
    "- Be concise, clear and conversational.\n\n"
    "Company document context:\n{context}"
)

# ─── Lazy singletons ───
_http = None
_llm = None


def _rest():
    """Cached httpx client pointed at the Supabase PostgREST endpoint."""
    global _http
    if _http is None:
        url = os.environ["SUPABASE_URL"].rstrip("/")
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _http = httpx.Client(
            base_url=f"{url}/rest/v1",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            timeout=30,
        )
    return _http


def _llm_client():
    global _llm
    if _llm is None:
        from .llm import get_llm
        _llm = get_llm(temperature=0.2)
    return _llm


# ─── Sessions ───

def create_session(title: str = "New Conversation") -> dict:
    res = _rest().post("/chat_sessions", json={"user_id": USER_ID, "title": title or "New Conversation"})
    res.raise_for_status()
    return res.json()[0]


def list_sessions() -> list[dict]:
    """All sessions for the company, newest first, with a last-message preview."""
    res = _rest().get(
        "/chat_sessions",
        params={"user_id": f"eq.{USER_ID}", "select": "*", "order": "updated_at.desc"},
    )
    res.raise_for_status()
    sessions = res.json()
    for s in sessions:
        msgs = _rest().get(
            "/chat_messages",
            params={
                "session_id": f"eq.{s['id']}",
                "select": "content,role",
                "order": "created_at.desc",
                "limit": 1,
            },
        )
        data = msgs.json() if msgs.is_success else []
        s["last_message"] = data[0]["content"] if data else None
    return sessions


def get_session(session_id: str) -> dict | None:
    res = _rest().get("/chat_sessions", params={"id": f"eq.{session_id}", "select": "*"})
    res.raise_for_status()
    data = res.json()
    return data[0] if data else None


def delete_session(session_id: str) -> bool:
    # chat_messages cascade-delete via FK
    res = _rest().delete("/chat_sessions", params={"id": f"eq.{session_id}"})
    res.raise_for_status()
    return True


# ─── Messages ───

def get_messages(session_id: str, limit: int = 100) -> list[dict]:
    res = _rest().get(
        "/chat_messages",
        params={"session_id": f"eq.{session_id}", "select": "*", "order": "created_at", "limit": limit},
    )
    res.raise_for_status()
    return res.json()


def get_recent_messages(session_id: str, limit: int = HISTORY_LIMIT) -> list[dict]:
    """Most recent messages, returned oldest-first for prompt ordering."""
    res = _rest().get(
        "/chat_messages",
        params={
            "session_id": f"eq.{session_id}",
            "select": "role,content",
            "order": "created_at.desc",
            "limit": limit,
        },
    )
    res.raise_for_status()
    return list(reversed(res.json()))


def save_message(session_id: str, role: str, content: str, sources: list | None = None) -> dict:
    res = _rest().post("/chat_messages", json={
        "session_id": session_id,
        "user_id": USER_ID,
        "role": role,
        "content": content,
        "sources": sources or [],
    })
    res.raise_for_status()
    # bump the session so it sorts to the top
    _rest().patch("/chat_sessions", params={"id": f"eq.{session_id}"}, json={"updated_at": "now()"})
    return res.json()[0]


# ─── RAG ───

def _build_context_and_sources(docs) -> tuple[str, list[dict]]:
    if not docs:
        return "No relevant documents found.", []
    parts, sources, seen = [], [], set()
    for i, doc in enumerate(docs, 1):
        raw = doc.metadata.get("source", "document")
        # show just the filename, not the full path (e.g. "data\agency.txt" -> "agency.txt")
        name = os.path.basename(raw.replace("\\", "/"))
        parts.append(f"[Source {i}: {name}]\n{doc.page_content}")
        if name not in seen:  # one chip per distinct document
            seen.add(name)
            sources.append({"title": name, "snippet": doc.page_content[:200]})
    return "\n\n---\n\n".join(parts), sources


def generate_answer(question: str, session_id: str | None, retriever) -> dict:
    """Full chat turn: retrieve → add history → Gemini → persist both turns.

    Args:
        question: the user's message.
        session_id: existing session, or None to start a new one.
        retriever: a LangChain retriever over the document vector store.

    Returns:
        {"answer": str, "sources": list, "session_id": str}
    """
    if not session_id:
        session_id = create_session(title=question[:60])["id"]

    docs = retriever.invoke(question)
    context, sources = _build_context_and_sources(docs)
    history = get_recent_messages(session_id)

    messages = [SystemMessage(content=SYSTEM_PROMPT.format(context=context))]
    for m in history:
        if m["role"] == "user":
            messages.append(HumanMessage(content=m["content"]))
        else:
            messages.append(AIMessage(content=m["content"]))
    messages.append(HumanMessage(content=question))

    answer = _llm_client().invoke(messages).content

    save_message(session_id, "user", question)
    save_message(session_id, "assistant", answer, sources=sources)

    return {"answer": answer, "sources": sources, "session_id": session_id}
