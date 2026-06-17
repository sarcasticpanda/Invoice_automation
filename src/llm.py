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
    # ~8 req/min and 6 retries: paces RAG-heavy runs under the free per-minute
    # token limit so a reply completes instead of erroring out mid-way.
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        temperature=temperature, max_retries=6, rate_limiter=_rate_limiter(0.13),
    )


def _backup(temperature: float):
    """Build the OpenRouter backup model, or None if no key configured."""
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return None
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=temperature,
        max_retries=2,
        timeout=40,
    )


def get_llm(temperature: float = 0.1):
    """Plain chat model (primary, with OpenRouter fallback if configured)."""
    primary = _primary(temperature)
    backup = _backup(temperature)
    return primary.with_fallbacks([backup]) if backup is not None else primary


def get_structured_llm(schema, temperature: float = 0.1):
    """Structured-output model (primary, with OpenRouter fallback if configured).
    Fallbacks are applied AFTER with_structured_output so both paths return the
    same pydantic type."""
    primary = _primary(temperature).with_structured_output(schema)
    backup = _backup(temperature)
    if backup is None:
        return primary
    return primary.with_fallbacks([backup.with_structured_output(schema)])
