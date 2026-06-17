"""
Central LLM factory with cascading fallbacks.

Chain: Groq (primary) → OpenRouter (1st fallback) → Gemini (2nd fallback)
When primary hits rate limit, automatically tries next provider.

Env (.env):
    LLM_PROVIDER=groq                 # primary
    GROQ_MODEL=llama-3.3-70b-versatile
    GOOGLE_API_KEY=...                # Gemini 2nd fallback
    OPENROUTER_API_KEY=sk-or-...      # optional 1st fallback
    OPENROUTER_MODEL=openrouter/owl-alpha

Free tier quotas:
    - Groq: ~1000/day, 30/min (most reliable)
    - OpenRouter: ~500/day free (best-effort, may hit limit)
    - Gemini: ~20/day (last resort, fallback only)
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


def _openrouter_fallback(temperature: float):
    """Build the OpenRouter fallback model, or None if no key configured."""
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return None
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "openrouter/owl-alpha"),
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=temperature,
        max_retries=4,
        timeout=60,
    )


def _gemini_fallback(temperature: float):
    """Build the Gemini fallback model, or None if no key configured."""
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        return None
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        api_key=key,
        temperature=temperature,
        max_retries=3,
        rate_limiter=_rate_limiter(0.05),
    )


def get_llm(temperature: float = 0.1):
    """Plain chat model with cascading fallbacks: Groq → OpenRouter → Gemini."""
    primary = _primary(temperature)
    fallbacks = []
    openrouter = _openrouter_fallback(temperature)
    if openrouter:
        fallbacks.append(openrouter)
    gemini = _gemini_fallback(temperature)
    if gemini:
        fallbacks.append(gemini)
    return primary.with_fallbacks(fallbacks) if fallbacks else primary


def get_structured_llm(schema, temperature: float = 0.1):
    """Structured-output model with cascading fallbacks.
    Groq uses tool-calling; OpenRouter uses json_schema mode; Gemini uses default."""
    primary = _primary(temperature).with_structured_output(schema)
    fallbacks = []

    openrouter = _openrouter_fallback(temperature)
    if openrouter:
        try:
            fallbacks.append(openrouter.with_structured_output(schema, method="json_schema"))
        except Exception:
            fallbacks.append(openrouter.with_structured_output(schema))

    gemini = _gemini_fallback(temperature)
    if gemini:
        try:
            fallbacks.append(gemini.with_structured_output(schema))
        except Exception:
            pass

    return primary.with_fallbacks(fallbacks) if fallbacks else primary
