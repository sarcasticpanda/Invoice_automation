import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any


HISTORY_FILE = "email_history.json"

REVIEW_STATUSES = {"draft", "needs_review"}
SENT_STATUSES = {"sent", "auto_sent"}
ACTIVE_STATUSES = REVIEW_STATUSES | {"follow_up"}
SENSITIVE_TERMS = (
    "refund",
    "cancel",
    "cancellation",
    "billing",
    "invoice",
    "legal",
    "privacy",
    "security",
    "delete account",
    "account deletion",
    "chargeback",
    "lawsuit",
)


def now_iso() -> str:
    return datetime.now().isoformat()


def parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_history() -> list[dict[str, Any]]:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    return []


def save_history(history: list[dict[str, Any]]) -> None:
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)


def append_history(entry: dict[str, Any]) -> None:
    history = load_history()
    history.append(enrich_entry(entry))
    save_history(history)


def get_thread_entries(thread_id: str) -> list[dict[str, Any]]:
    return sorted(
        [enrich_entry(e) for e in load_history() if e.get("thread_id") == thread_id],
        key=lambda e: e.get("timestamp", ""),
    )


def _entry_text(entry: dict[str, Any]) -> str:
    return " ".join(
        str(entry.get(k, "") or "")
        for k in ("incoming_body", "generated_reply", "sentiment_summary", "human_reason")
    ).lower()


def priority_for_entry(entry: dict[str, Any]) -> str:
    status = entry.get("status", "")
    category = entry.get("category", "")
    sentiment = entry.get("sentiment", "")
    confidence = float(entry.get("sentiment_confidence") or 0)
    text = _entry_text(entry)

    if sentiment == "urgent" or status in ACTIVE_STATUSES and category == "customer_complaint":
        return "urgent"
    if sentiment == "negative" or category == "customer_complaint":
        return "high"
    if confidence and confidence < 0.6:
        return "high"
    if any(term in text for term in SENSITIVE_TERMS):
        return "high"
    if status in ACTIVE_STATUSES:
        return "normal"
    return "low"


def human_review_reason(entry: dict[str, Any], thread_entries: list[dict[str, Any]] | None = None) -> str:
    reasons: list[str] = []
    category = entry.get("category", "")
    sentiment = entry.get("sentiment", "")
    confidence = float(entry.get("sentiment_confidence") or 0)
    text = _entry_text(entry)

    if category == "customer_complaint":
        reasons.append("customer complaint")
    if sentiment in {"negative", "urgent"}:
        reasons.append(f"{sentiment} sentiment")
    if confidence and confidence < 0.6:
        reasons.append("low AI confidence")
    sensitive_hits = [term for term in SENSITIVE_TERMS if term in text]
    if sensitive_hits:
        reasons.append(f"sensitive topic: {sensitive_hits[0]}")
    if thread_entries:
        inbound_count = len([e for e in thread_entries if e.get("incoming_body")])
        ai_reply_count = len([e for e in thread_entries if e.get("generated_reply")])
        if inbound_count > 1 and ai_reply_count > 0:
            reasons.append("customer replied in an existing AI-handled thread")
    if entry.get("status") in REVIEW_STATUSES and not reasons:
        reasons.append("queued for human review")
    return "; ".join(dict.fromkeys(reasons))


def enrich_entry(entry: dict[str, Any], thread_entries: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    enriched = dict(entry)
    enriched.setdefault("timestamp", now_iso())
    enriched.setdefault("status", "unknown")
    enriched.setdefault("thread_id", enriched.get("message_id") or enriched.get("timestamp"))
    enriched.setdefault("sender_email", enriched.get("sender", "unknown"))
    enriched.setdefault("sender_subject", enriched.get("subject", ""))
    enriched.setdefault("category", "unknown")
    enriched.setdefault("sentiment", "unknown")
    enriched.setdefault("sentiment_confidence", 0)
    enriched.setdefault("generated_reply", "")
    enriched["priority"] = enriched.get("priority") or priority_for_entry(enriched)
    enriched["requires_human"] = bool(
        enriched.get("requires_human")
        or enriched.get("status") in REVIEW_STATUSES
        or enriched["priority"] in {"high", "urgent"}
    )
    enriched["human_reason"] = enriched.get("human_reason") or human_review_reason(enriched, thread_entries)
    return enriched


def build_threads(history: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for raw in history if history is not None else load_history():
        grouped[raw.get("thread_id") or raw.get("message_id") or raw.get("timestamp", "unknown")].append(raw)

    threads = []
    for thread_id, raw_entries in grouped.items():
        entries = sorted(raw_entries, key=lambda e: e.get("timestamp", ""))
        enriched_entries = [enrich_entry(e, entries) for e in entries]
        latest = enriched_entries[-1]
        statuses = {e.get("status") for e in enriched_entries}
        requires_human = any(e.get("requires_human") for e in enriched_entries if e.get("status") in REVIEW_STATUSES)
        priority_order = {"low": 0, "normal": 1, "high": 2, "urgent": 3}
        priority = max((e["priority"] for e in enriched_entries), key=lambda p: priority_order.get(p, 0))

        threads.append({
            "thread_id": thread_id,
            "subject": latest.get("sender_subject", ""),
            "customer_email": latest.get("sender_email", "unknown"),
            "status": latest.get("status", "unknown"),
            "statuses": sorted(s for s in statuses if s),
            "priority": priority,
            "category": latest.get("category", "unknown"),
            "sentiment": latest.get("sentiment", "unknown"),
            "sentiment_confidence": latest.get("sentiment_confidence", 0),
            "last_updated": latest.get("timestamp", ""),
            "requires_human": requires_human,
            "human_reason": latest.get("human_reason") or human_review_reason(latest, enriched_entries),
            "message_count": len(enriched_entries),
            "latest_preview": latest.get("incoming_body") or latest.get("generated_reply") or "",
            "messages": thread_messages(enriched_entries),
            "latest_entry": latest,
        })
    return sorted(threads, key=lambda t: t.get("last_updated", ""), reverse=True)


def thread_messages(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for entry in entries:
        if entry.get("incoming_body"):
            messages.append({
                "id": entry.get("message_id") or f"{entry.get('timestamp')}-in",
                "timestamp": entry.get("timestamp"),
                "direction": "inbound",
                "sender": entry.get("sender_email"),
                "body": entry.get("incoming_body"),
                "status": "received",
                "generated_by": "customer",
                "category": entry.get("category"),
                "sentiment": entry.get("sentiment"),
                "sentiment_confidence": entry.get("sentiment_confidence"),
            })
        if entry.get("generated_reply"):
            messages.append({
                "id": f"{entry.get('timestamp')}-out",
                "timestamp": entry.get("reviewed_at") or entry.get("timestamp"),
                "direction": "outbound",
                "sender": "InvoiceFlow AI",
                "body": entry.get("generated_reply"),
                "status": entry.get("status"),
                "generated_by": "human" if entry.get("reviewed_at") and entry.get("status") == "sent" else "ai",
                "rag_sources": entry.get("rag_sources", []),
                "ai_confidence": entry.get("sentiment_confidence"),
                "decision_reason": entry.get("human_reason") or entry.get("decision_reason", ""),
            })
    return sorted(messages, key=lambda m: m.get("timestamp") or "")


def build_thread_context(thread_id: str, limit: int = 8) -> str:
    entries = get_thread_entries(thread_id)
    messages = thread_messages(entries)[-limit:]
    if not messages:
        return "No previous conversation context is available."
    lines = []
    for message in messages:
        who = "Customer" if message["direction"] == "inbound" else "Previous reply"
        timestamp = message.get("timestamp", "")
        body = (message.get("body") or "").strip()
        lines.append(f"{who} at {timestamp}:\n{body}")
    return "\n\n---\n\n".join(lines)


def filter_threads(
    threads: list[dict[str, Any]],
    status: str | None = None,
    sentiment: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    date_range: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    cutoff = None
    today = datetime.now().date()
    if date_range == "today":
        cutoff = datetime.combine(today, datetime.min.time())
    elif date_range == "yesterday":
        start = datetime.combine(today - timedelta(days=1), datetime.min.time())
        end = datetime.combine(today, datetime.min.time())
        threads = [t for t in threads if (dt := parse_time(t.get("last_updated"))) and start <= dt < end]
    elif date_range == "7d":
        cutoff = datetime.now() - timedelta(days=7)
    elif date_range == "30d":
        cutoff = datetime.now() - timedelta(days=30)
    if cutoff:
        threads = [t for t in threads if (dt := parse_time(t.get("last_updated"))) and dt >= cutoff]

    if status and status != "all":
        if status == "needs_review":
            threads = [t for t in threads if t.get("requires_human") or t.get("status") in REVIEW_STATUSES]
        elif status == "auto_handled":
            threads = [t for t in threads if t.get("status") == "auto_sent"]
        else:
            threads = [t for t in threads if status in t.get("statuses", []) or t.get("status") == status]
    if sentiment and sentiment != "all":
        threads = [t for t in threads if t.get("sentiment") == sentiment]
    if category and category != "all":
        threads = [t for t in threads if t.get("category") == category]
    if priority and priority != "all":
        threads = [t for t in threads if t.get("priority") == priority]
    if search:
        q = search.lower()
        threads = [
            t for t in threads
            if q in " ".join([
                t.get("customer_email", ""),
                t.get("subject", ""),
                t.get("latest_preview", ""),
                t.get("human_reason", ""),
            ]).lower()
        ]
    return threads


def analytics(history: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    entries = [enrich_entry(e) for e in (history if history is not None else load_history())]
    threads = build_threads(entries)
    total = len(entries)
    status_counts = Counter(e.get("status", "unknown") for e in entries)
    sentiment_counts = Counter(e.get("sentiment", "unknown") for e in entries)
    category_counts = Counter(e.get("category", "unknown") for e in entries)
    priority_counts = Counter(t.get("priority", "low") for t in threads)
    review_count = sum(1 for t in threads if t.get("requires_human") or t.get("status") in REVIEW_STATUSES)
    auto_count = status_counts.get("auto_sent", 0)
    sent_total = status_counts.get("sent", 0) + auto_count
    automation_rate = round((auto_count / total) * 100, 1) if total else 0
    intervention_rate = round((review_count / len(threads)) * 100, 1) if threads else 0
    estimated_minutes_saved = sent_total * 5 + status_counts.get("skipped", 0) * 1

    by_date: dict[str, Counter] = defaultdict(Counter)
    for entry in entries:
        dt = parse_time(entry.get("timestamp"))
        day = dt.date().isoformat() if dt else "unknown"
        by_date[day][entry.get("status", "unknown")] += 1

    top_customers = Counter(e.get("sender_email", "unknown") for e in entries).most_common(8)
    return {
        "total_processed": total,
        "thread_count": len(threads),
        "auto_handled": auto_count,
        "human_review": review_count,
        "sent": sent_total,
        "drafted": status_counts.get("draft", 0) + status_counts.get("needs_review", 0),
        "rejected": status_counts.get("rejected", 0),
        "skipped": status_counts.get("skipped", 0),
        "unresolved": review_count,
        "urgent_or_negative": sentiment_counts.get("urgent", 0) + sentiment_counts.get("negative", 0),
        "automation_rate": automation_rate,
        "human_intervention_rate": intervention_rate,
        "estimated_minutes_saved": estimated_minutes_saved,
        "estimated_hours_saved": round(estimated_minutes_saved / 60, 1),
        "estimated_cost_saved": round((estimated_minutes_saved / 60) * 15, 2),
        "cost_per_reply": 0,
        "status_counts": dict(status_counts),
        "sentiment_counts": dict(sentiment_counts),
        "category_counts": dict(category_counts),
        "priority_counts": dict(priority_counts),
        "daily_status": [
            {"date": day, **dict(counts)}
            for day, counts in sorted(by_date.items())
        ],
        "top_customers": [
            {"email": email, "count": count}
            for email, count in top_customers
        ],
    }
