from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Report, Incident, User
from schemas import ReportCreate
from services import ai_service, duplicate_service, priority_engine, department_service
from utils.scoring import score_label

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_or_create_user(db: Session, name: str):
    user = db.query(User).filter(User.name == name).first()
    if not user:
        user = User(name=name, email=f"{name.replace(' ', '').lower()}@civicos.app")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _serialize_report(r):
    return {
        "id": r.id,
        "description": r.description,
        "image_url": r.image_url,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "category": r.category,
        "ai_confidence": r.ai_confidence,
        "severity": r.severity,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("")
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """Full citizen report pipeline: save -> AI classify -> duplicate check -> merge/create incident."""
    user = _get_or_create_user(db, payload.user_name)

    # AI text analysis
    analysis = ai_service.analyze_text(payload.description)
    category = payload.category or analysis["category"]
    img_cat, img_conf = ai_service.classify_image(image_url=payload.image_url,
                                                  filename=payload.image_url or "")
    # Blend: if user provided no category, prefer image category when confident.
    if not payload.category and img_conf > analysis["confidence"]:
        category = img_cat
    confidence = max(analysis["confidence"], img_conf)

    report = Report(
        user_id=user.id,
        description=payload.description,
        image_url=payload.image_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        category=category,
        ai_confidence=confidence,
        severity=analysis["severity"],
    )
    db.add(report)

    # Duplicate detection against existing active incidents
    incident, prob, breakdown = duplicate_service.find_duplicate(db, report)
    if incident:
        incident.reports.append(report)
        # Recompute priority since report density increased
        incident.priority_score = priority_engine.compute_priority(incident)
        db.commit()
        db.refresh(report)
        return {
            "report": _serialize_report(report),
            "ai": analysis,
            "duplicate": {
                "is_duplicate": True,
                "probability": round(prob, 2),
                "breakdown": breakdown,
                "merged_into_incident": incident.id,
                "total_reports": len(incident.reports),
            },
            "incident_id": incident.id,
        }

    # No duplicate -> create new incident
    title = _make_title(category, payload.description)
    incident = Incident(
        title=title,
        category=category,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        severity=report.severity,
        ai_confidence=confidence,
        status="AI_VERIFIED",
        department=department_service.assign_department(category),
    )
    incident.reports.append(report)
    incident.priority_score = priority_engine.compute_priority(incident)
    db.add(incident)
    db.commit()
    db.refresh(incident)

    return {
        "report": _serialize_report(report),
        "ai": analysis,
        "duplicate": {"is_duplicate": False, "probability": 0.0, "breakdown": {}},
        "incident_id": incident.id,
        "priority": {
            "score": incident.priority_score,
            "label": score_label(incident.priority_score),
        },
    }


def _make_title(category, description):
    labels = {
        "ROAD_DAMAGE": "Road Damage",
        "GARBAGE": "Garbage Issue",
        "ILLEGAL_DUMPING": "Illegal Dumping",
        "STREETLIGHT": "Streetlight Issue",
        "DRAINAGE": "Drainage Issue",
        "WATER_POLLUTION": "Water Pollution",
        "GREEN_SPACE": "Green Space Issue",
        "OTHER": "Civic Issue",
    }
    words = (description or "").split()
    snippet = " ".join(words[:5]) if words else ""
    return f"{labels.get(category, 'Civic Issue')} - {snippet}"
