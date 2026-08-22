from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import HTTPException

# MVP in-memory sliding window. Production should use Redis or another
# shared store so limits work consistently across multiple instances.
WINDOW_SECONDS = 60
MAX_REPORTS_PER_WINDOW = 5
recent_requests = defaultdict(deque)

SPAM_PHRASES = {"test test test", "asdf", "qwerty", "buy now", "click here"}


def enforce_rate_limit(client_key: str):
    now = datetime.utcnow()
    bucket = recent_requests[client_key]
    cutoff = now - timedelta(seconds=WINDOW_SECONDS)
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= MAX_REPORTS_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Too many reports. Please wait before submitting another report.",
        )
    bucket.append(now)


def validate_report_content(description: str, honeypot: str = ""):
    if honeypot.strip():
        raise HTTPException(status_code=400, detail="Invalid report submission.")

    normalized = " ".join(description.lower().split())
    if normalized in SPAM_PHRASES:
        raise HTTPException(status_code=400, detail="This submission appears to be spam.")

    # Detect low-information repeated-character submissions such as aaaaaaaa.
    compact = "".join(ch for ch in normalized if ch.isalnum())
    if len(compact) >= 8 and len(set(compact)) <= 2:
        raise HTTPException(status_code=400, detail="Please provide a meaningful description.")
