"""AI Service.

Deterministic mock engine that works out-of-the-box (no API keys).
The interfaces mirror a real vision-capable LLM so you can swap in
OpenAI / Google Vision / Gemini later without changing the rest of the app.

To plug in a real model, replace the bodies of `classify_image`,
`analyze_text` and `verify_before_after` with API calls.
"""
import re

# Map of category -> keywords that strongly suggest that category.
CATEGORY_KEYWORDS = {
    "ROAD_DAMAGE": [
        "pothole", "road", "crack", "damage", "broken road", "sinkhole",
        "paved", "pavement", "asphalt", "hole in road", "speed breaker",
    ],
    "GARBAGE": [
        "garbage", "trash", "waste", "rubbish", "litter", "dump", "refuse",
        "bins", "debris", "pile of waste",
    ],
    "STREETLIGHT": [
        "streetlight", "street light", "lamp", "light", "lighting", "dark",
        "lamp post", "no light", "street lamp",
    ],
    "DRAINAGE": [
        "drain", "drainage", "sewage", "clogged", "water logging",
        "stagnant", "blocked drain", "manhole",
    ],
    "WATER_POLLUTION": [
        "water pollution", "polluted water", "river", "lake", "pond",
        "contaminated", "chemical", "dead fish", "algae",
    ],
    "ILLEGAL_DUMPING": [
        "illegal dumping", "construction waste", "debris", "dumping",
        "fly-tipping", "abandoned", "construction material",
    ],
    "GREEN_SPACE": [
        "park", "garden", "tree", "greenery", "green space", "plants",
        "lawn", "playground",
    ],
}

SEVERITY_KEYWORDS = {
    "HIGH": [
        "danger", "accident", "risk", "emergency", "hazard", "injured",
        "collapse", "severe", "urgent", "major", "huge", "leak", "exposed",
        "wire", "fire", "flood",
    ],
    "LOW": [
        "cosmetic", "minor", "small", "slight", "little", "aesthetic",
        "paint", "not urgent",
    ],
}

CONTEXT_KEYWORDS = {
    "school": ["school", "college", "university", "institution", "education"],
    "hospital": ["hospital", "clinic", "medical", "health"],
    "residential": ["residential", "housing", "apartment", "colony", "society"],
    "market": ["market", "shopping", "mall", "commercial", "shop"],
}


def classify_image(image_bytes=None, image_url="", filename=""):
    """Return (category, confidence).

    In the real system this calls a vision model on the image.
    For the MVP we infer from filename/metadata and return a base category.
    """
    name = (filename or image_url or "").lower()
    if any(k in name for k in CATEGORY_KEYWORDS["ROAD_DAMAGE"]):
        return "ROAD_DAMAGE", 0.88
    if any(k in name for k in CATEGORY_KEYWORDS["GARBAGE"]):
        return "GARBAGE", 0.90
    if any(k in name for k in CATEGORY_KEYWORDS["STREETLIGHT"]):
        return "STREETLIGHT", 0.86
    if any(k in name for k in CATEGORY_KEYWORDS["ILLEGAL_DUMPING"]):
        return "ILLEGAL_DUMPING", 0.82
    if any(k in name for k in CATEGORY_KEYWORDS["DRAINAGE"]):
        return "DRAINAGE", 0.84
    if any(k in name for k in CATEGORY_KEYWORDS["WATER_POLLUTION"]):
        return "WATER_POLLUTION", 0.85
    if any(k in name for k in CATEGORY_KEYWORDS["GREEN_SPACE"]):
        return "GREEN_SPACE", 0.80
    return "OTHER", 0.55


def analyze_text(description):
    """Return dict with category, severity, context, confidence."""
    text = (description or "").lower()
    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, words in CATEGORY_KEYWORDS.items():
        for w in words:
            if w in text:
                scores[cat] += 1

    category = max(scores, key=scores.get)
    confidence = 0.5 + (scores[category] * 0.12)
    confidence = min(confidence, 0.98)
    if scores[category] == 0:
        category = "OTHER"
        confidence = 0.5

    severity = "MEDIUM"
    high_hits = sum(1 for w in SEVERITY_KEYWORDS["HIGH"] if w in text)
    low_hits = sum(1 for w in SEVERITY_KEYWORDS["LOW"] if w in text)
    if high_hits > low_hits:
        severity = "HIGH"
    elif low_hits > high_hits:
        severity = "LOW"

    context = "general"
    for ctx, words in CONTEXT_KEYWORDS.items():
        if any(w in text for w in words):
            context = ctx
            break

    hazard = bool(high_hits)
    return {
        "category": category,
        "severity": severity,
        "context": context,
        "hazard": hazard,
        "confidence": round(confidence, 2),
    }


def verify_before_after(before_desc, after_desc, before_conf, after_conf):
    """Compare before/after evidence. Returns confidence of resolution.

    Real implementation: vision model change detection.
    MVP: heuristic based on evidence confidence + consistency.
    """
    if not after_desc and not before_desc:
        return 0.0

    # If strongly classified evidence on both sides, assume resolution likely.
    base = (before_conf + after_conf) / 2
    # A meaningful after-image (non-OTHER category) boosts confidence.
    return round(max(0.0, min(0.98, base * 0.9)), 2)
