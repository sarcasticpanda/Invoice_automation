"""
Central LLM factory with an automatic backup provider.

Primary provider via LLM_PROVIDER (groq | gemini). If OPENROUTER_API_KEY is set,
an OpenRouter model is attached as a **fallback**: when the primary errors
(e.g. a rate-limit 429), the call automatically retries on OpenRouter.

Env (.env):
    LLM_PROVIDER=groq                 # primary
    GROQ_MODEL=llama-3.3-70b-versatile
    GEMINI_MODEL=gemini-2.5-flash-lite
    OPENROUTER_API_KEY=sk-or-...      # optional backup
    OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

Note: OpenRouter's free tier (no credits) is heavily rate-limited, so the
backup may itself be unavailable — it's best-effort.
"""
import os
from langchain_core.rate_limiters import InMemoryRateLimiter


def _rate_limiter(requests_per_second: float) -> InMemoryRateLimiter:
    return InMemoryRateLimiter(
        requests_per_second=requests_per_second,
        check_every_n_seconds=0.1,
        max_bucket_size=2,
    )


def _primary(temperature: float):
    """Build the primary chat model from LLM_PROVIDER."""
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
            temperature=temperature, max_retries=3, rate_limiter=_rate_limiter(0.15),
        )
    from langchain_groq import ChatGroq
    # Pace calls (~8/min) + retry so a RAG reply's burst of calls stays under the
    # free per-minute token limit and COMPLETES, rather than failing over to the
    # (also throttled) free backup. Trades a little speed for reliability.
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        temperature=temperature, max_retries=4, rate_limiter=_rate_limiter(0.15),
    )


def _backup(temperature: float):
    """Build the OpenRouter backup model, or None if no key configured."""
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return None
    from langchain_openai import ChatOpenAI
    # Free OpenRouter "stealth" model occasionally returns a transient error;
    # extra retries make it reliable enough as a free backup.
    return ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "openrouter/owl-alpha"),
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=temperature,
        max_retries=4,
        timeout=60,
    )


def get_llm(temperature: float = 0.1):
    """Plain chat model (primary, with OpenRouter fallback if configured)."""
    primary = _primary(temperature)
    backup = _backup(temperature)
    return primary.with_fallbacks([backup]) if backup is not None else primary


def get_structured_llm(schema, temperature: float = 0.1):
    """Structured-output model (primary, with OpenRouter fallback if configured).
    Primary (Groq) uses tool-calling; the OpenRouter backup uses json_schema mode
    (owl-alpha doesn't reliably tool-call). Both return the same pydantic type."""
    primary = _primary(temperature).with_structured_output(schema)
    backup = _backup(temperature)
    if backup is None:
        return primary
    try:
        backup_structured = backup.with_structured_output(schema, method="json_schema")
    except Exception:
        backup_structured = backup.with_structured_output(schema)
    return primary.with_fallbacks([backup_structured])
