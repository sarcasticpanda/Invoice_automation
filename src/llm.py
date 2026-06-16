"""
Central LLM factory so the whole app shares one provider/model config.

Switch providers with env vars (in .env):
    LLM_PROVIDER=groq      # generous free tier (~1000/day, 30/min) — default
    LLM_PROVIDER=gemini    # only ~20 requests/day on the free tier

    GROQ_MODEL=llama-3.3-70b-versatile
    GEMINI_MODEL=gemini-2.5-flash-lite
"""
import os
from langchain_core.rate_limiters import InMemoryRateLimiter


def _rate_limiter(requests_per_second: float) -> InMemoryRateLimiter:
    return InMemoryRateLimiter(
        requests_per_second=requests_per_second,
        check_every_n_seconds=0.1,
        max_bucket_size=2,
    )


def get_llm(temperature: float = 0.1):
    """Return the configured chat model, paced to stay under free-tier rate limits."""
    provider = os.getenv("LLM_PROVIDER", "groq").lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        # Groq free tier ~30 req/min; 0.4 rps (=24/min) keeps headroom.
        return ChatGroq(
            model=model,
            temperature=temperature,
            max_retries=5,
            rate_limiter=_rate_limiter(0.4),
        )

    from langchain_google_genai import ChatGoogleGenerativeAI
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        max_retries=5,
        rate_limiter=_rate_limiter(0.15),
    )
