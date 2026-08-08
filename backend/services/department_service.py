"""Rules engine for department assignment.

Deterministic rules are more reliable than AI for the MVP.
AI can later recommend departments; rules remain the fallback.
"""


def recommended_department(category):
    return {
        "ROAD_DAMAGE": "Public Works",
        "GARBAGE": "Sanitation",
        "ILLEGAL_DUMPING": "Sanitation",
        "STREETLIGHT": "Electrical",
        "DRAINAGE": "Water & Drainage",
        "WATER_POLLUTION": "Environment",
        "GREEN_SPACE": "Parks & Recreation",
        "OTHER": "General Services",
    }.get(category, "General Services")


def assign_department(category):
    return recommended_department(category)
