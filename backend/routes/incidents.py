from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Incident, Report, Resolution
from schemas import AssignRequest, StatusRequest, ResolutionCreate
from services import department_service, priority_engine, verification_service
from utils.scoring import score_label, marker_color, status_color

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _serialize_incident(i):
    return {
        "id": i.id,
        "title": i.title,
        "category": i.category,
        "description": i.description,
        "latitude": i.latitude,
        "longitude": i.longitude,
        "severity": i.severity,
        "priority_score": i.priority_score,
        "priority_label": score_label(i.priority_score),
        "marker_color": marker_color(i.priority_score),
        "status": i.status,
        "status_color": status_color(i.status),
        "department": i.department,
        "ai_confidence": i.ai_confidence,
        "report_count": len(i.reports),
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    }


def _get_incident(db, incident_id):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.get("")
def list_incidents(status: str = "", category: str = "", db: Session = Depends(get_db)):
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if category:
        q = q.filter(Incident.category == category)
    incidents = q.order_by(Incident.priority_score.desc()).all()
    return {"incidents": [_serialize_incident(i) for i in incidents]}


@router.get("/{incident_id}")
def incident_detail(incident_id: int, db: Session = Depends(get_db)):
    inc = _get_incident(db, incident_id)
    reports = []
    for r in inc.reports:
        reports.append({
            "id": r.id,
            "description": r.description,
            "image_url": r.image_url,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "category": r.category,
            "severity": r.severity,
            "ai_confidence": r.ai_confidence,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    resolutions = []
    for res in inc.resolutions:
        resolutions.append({
            "id": res.id,
            "before_image": res.before_image,
            "after_image": res.after_image,
            "ai_confidence": res.ai_confidence,
            "verified": res.verified,
            "note": res.note,
            "created_at": res.created_at.isoformat() if res.created_at else None,
        })
    return {**_serialize_incident(inc), "reports": reports, "resolutions": resolutions}


@router.post("/{incident_id}/priority")
def recalc_priority(incident_id: int, db: Session = Depends(get_db)):
    inc = _get_incident(db, incident_id)
    inc.priority_score = priority_engine.compute_priority(inc)
    db.commit()
    return {"id": inc.id, "priority_score": inc.priority_score,
            "priority_label": score_label(inc.priority_score)}


@router.patch("/{incident_id}/assign")
def assign_department(incident_id: int, payload: AssignRequest, db: Session = Depends(get_db)):
    inc = _get_incident(db, incident_id)
    if payload.department:
        inc.department = payload.department
    else:
        inc.department = department_service.assign_department(inc.category)
    if inc.status not in ("ASSIGNED", "IN_PROGRESS"):
        inc.status = "ASSIGNED"
    db.commit()
    return {"id": inc.id, "department": inc.department, "status": inc.status}


@router.patch("/{incident_id}/status")
def set_status(incident_id: int, payload: StatusRequest, db: Session = Depends(get_db)):
    inc = _get_incident(db, incident_id)
    valid = ["REPORTED", "AI_VERIFIED", "PRIORITIZED", "ASSIGNED",
             "IN_PROGRESS", "RESOLVED", "VERIFIED"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid}")
    inc.status = payload.status
    db.commit()
    return {"id": inc.id, "status": inc.status}


@router.post("/{incident_id}/verify")
def verify_resolution(incident_id: int, payload: ResolutionCreate, db: Session = Depends(get_db)):
    inc = _get_incident(db, incident_id)
    before_report = inc.reports[0] if inc.reports else None
    before_image = before_report.image_url if before_report else ""

    resolution = Resolution(
        incident_id=inc.id,
        before_image=before_image,
        after_image=payload.after_image,
        note=payload.note,
    )
    db.add(resolution)
    db.commit()
    db.refresh(resolution)

    confidence, verdict = verification_service.verify_resolution(before_report, resolution)
    resolution.ai_confidence = confidence
    if confidence >= 0.7:
        resolution.verified = 1
        inc.status = "VERIFIED"
    elif confidence >= 0.45:
        inc.status = "RESOLVED"
    else:
        inc.status = "IN_PROGRESS"
    db.commit()

    return {
        "resolution_id": resolution.id,
        "confidence": confidence,
        "verdict": verdict,
        "status": inc.status,
    }
