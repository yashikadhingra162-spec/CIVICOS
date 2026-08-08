"""CIVIC PRIORITY ENGINE.

Computes a 0-100 CIVIC SCORE from 6 weighted factors.

    Safety              25
    Severity            20
    People affected     20
    Duration            10
    Evidence confidence 10
    Nearby reports      15
    ------------------  ---
    TOTAL              100
"""
from datetime import datetime


def compute_priority(incident):
    score = 0.0

    # 1. Safety (0-25)
    safety = 15.0
    if incident.severity == "HIGH":
        safety = 25.0
    elif incident.severity == "LOW":
        safety = 8.0
    score += safety * 1.0

    # 2. Severity (0-20)
    sev = {"HIGH": 20.0, "MEDIUM": 12.0, "LOW": 5.0}.get(incident.severity, 12.0)
    score += sev

    # 3. People affected (0-20) — driven by report density
    n = max(1, len(incident.reports))
    people = min(20.0, 8.0 + (n - 1) * 4.0)
    score += people

    # 4. Duration (0-10) — older issues are more urgent (age in hours capped at ~48h)
    if incident.created_at:
        age_h = (datetime.utcnow() - incident.created_at).total_seconds() / 3600
        duration = min(10.0, age_h / 4.8)
    else:
        duration = 0.0
    score += duration

    # 5. Evidence confidence (0-10)
    conf = incident.ai_confidence or 0.5
    score += conf * 10.0

    # 6. Nearby report density (0-15)
    density = min(15.0, (n - 1) * 7.5)
    score += density

    return int(round(max(0.0, min(100.0, score))))


def compute_resolution_priority(incident):
    """Recompute priority after a resolution changes status."""
    return compute_priority(incident)
