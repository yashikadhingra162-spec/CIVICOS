"""Duplicate detection.

Three signals combined into a duplicate probability:
    1. Geographic similarity (distance < 100m)
    2. Category similarity
    3. Text similarity (semantic / keyword overlap)

For the MVP we use a deterministic keyword-overlap similarity for text.
In production, swap `text_similarity` for an embeddings-based model.
"""
from utils.geo import haversine

# Categories that are considered interchangeable.
CATEGORY_GROUPS = {
    "GARBAGE": {"GARBAGE", "ILLEGAL_DUMPING"},
    "ILLEGAL_DUMPING": {"GARBAGE", "ILLEGAL_DUMPING"},
    "ROAD_DAMAGE": {"ROAD_DAMAGE"},
    "STREETLIGHT": {"STREETLIGHT"},
    "DRAINAGE": {"DRAINAGE", "WATER_POLLUTION"},
    "WATER_POLLUTION": {"DRAINAGE", "WATER_POLLUTION"},
    "GREEN_SPACE": {"GREEN_SPACE"},
}

CATEGORY_ALIASES = {
    "GARBAGE": "GARBAGE",
    "TRASH": "GARBAGE",
    "ROAD DAMAGE": "ROAD_DAMAGE",
    "POTHOLE": "ROAD_DAMAGE",
    "STREETLIGHT": "STREETLIGHT",
    "DRAINAGE": "DRAINAGE",
    "WATER POLLUTION": "WATER_POLLUTION",
    "ILLEGAL DUMPING": "ILLEGAL_DUMPING",
    "GREEN SPACE": "GREEN_SPACE",
}


def _normalize_cat(cat):
    return CATEGORY_ALIASES.get((cat or "").upper().replace("_", " "), (cat or "").upper())


def category_similarity(cat_a, cat_b):
    a = _normalize_cat(cat_a)
    b = _normalize_cat(cat_b)
    if a == b:
        return 1.0
    ga = CATEGORY_GROUPS.get(a, {a})
    gb = CATEGORY_GROUPS.get(b, {b})
    if ga & gb:
        return 0.8
    return 0.0


def _tokenize(text):
    import re
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    stop = {"the", "a", "an", "is", "are", "at", "near", "of", "to", "in",
            "and", "there", "been", "not", "has", "have", "it", "this", "that",
            "for", "outside", "by", "on", "with", "from", "very", "huge", "large"}
    return set(w for w in words if w not in stop and len(w) > 2)


def text_similarity(desc_a, desc_b):
    ta = _tokenize(desc_a)
    tb = _tokenize(desc_b)
    if not ta or not tb:
        return 0.0
    inter = ta & tb
    return len(inter) / max(1.0, min(len(ta), len(tb)))


def duplicate_probability(report, incident):
    """Return (probability, breakdown) that `report` is a duplicate of `incident`."""
    dist = haversine(report.latitude, report.longitude,
                     incident.latitude, incident.longitude)

    # Geographic similarity
    geo = 1.0 if dist <= 100 else (max(0.0, 1.0 - (dist - 100) / 300) if dist <= 400 else 0.0)

    # Category similarity
    cat = category_similarity(report.category, incident.category)

    # Text similarity
    txt = text_similarity(report.description, incident.description)

    # Weighted combination
    prob = 0.45 * geo + 0.30 * cat + 0.25 * txt
    prob = max(0.0, min(1.0, prob))

    breakdown = {
        "distance_m": round(dist, 1),
        "geo_similarity": round(geo, 2),
        "category_similarity": round(cat, 2),
        "text_similarity": round(txt, 2),
    }
    return prob, breakdown


def find_duplicate(session, report, threshold=0.55):
    """Search recent incidents near the report for a duplicate."""
    from models import Incident
    candidates = session.query(Incident).filter(
        Incident.status.in_([
            "REPORTED", "AI_VERIFIED", "PRIORITIZED", "ASSIGNED", "IN_PROGRESS"
        ])
    ).all()

    best = None
    best_prob = 0.0
    best_breakdown = {}
    for inc in candidates:
        prob, bd = duplicate_probability(report, inc)
        if prob > best_prob:
            best_prob = prob
            best = inc
            best_breakdown = bd

    if best and best_prob >= threshold:
        return best, best_prob, best_breakdown
    return None, 0.0, {}
