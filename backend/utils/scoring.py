def clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))


def score_label(score):
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def marker_color(score):
    if score >= 80:
        return "red"
    if score >= 60:
        return "orange"
    if score >= 40:
        return "yellow"
    return "green"


def status_color(status):
    return {
        "REPORTED": "yellow",
        "AI_VERIFIED": "blue",
        "PRIORITIZED": "cyan",
        "ASSIGNED": "orange",
        "IN_PROGRESS": "purple",
        "RESOLVED": "green",
        "VERIFIED": "green",
    }.get(status, "gray")
