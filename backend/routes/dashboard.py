from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Incident, Report
from utils.geo import haversine

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    reports = db.query(Report).count()
    counts = {}
    for i in incidents:
        counts[i.status] = counts.get(i.status, 0) + 1

    critical = sum(1 for i in incidents if i.priority_score >= 80 and i.status not in ("RESOLVED", "VERIFIED"))
    high = sum(1 for i in incidents if 60 <= i.priority_score < 80 and i.status not in ("RESOLVED", "VERIFIED"))
    medium = sum(1 for i in incidents if 40 <= i.priority_score < 60 and i.status not in ("RESOLVED", "VERIFIED"))
    resolved = sum(1 for i in incidents if i.status in ("RESOLVED", "VERIFIED"))

    return {
        "total_incidents": len(incidents),
        "total_reports": reports,
        "critical": critical,
        "high": high,
        "medium": medium,
        "resolved": resolved,
        "by_status": counts,
    }


@router.get("/hotspots")
def hotspots(db: Session = Depends(get_db)):
    """Cluster reports by proximity to identify environmental/pressure hotspots."""
    reports = db.query(Report).all()
    clusters = []
    used = set()
    radius = 150  # meters
    for a in range(len(reports)):
        if a in used:
            continue
        cluster = [reports[a]]
        used.add(a)
        for b in range(a + 1, len(reports)):
            if b in used:
                continue
            d = haversine(reports[a].latitude, reports[a].longitude,
                          reports[b].latitude, reports[b].longitude)
            if d <= radius:
                cluster.append(reports[b])
                used.add(b)
        if len(cluster) >= 2:
            lat = sum(r.latitude for r in cluster) / len(cluster)
            lon = sum(r.longitude for r in cluster) / len(cluster)
            cats = {}
            for r in cluster:
                cats[r.category] = cats.get(r.category, 0) + 1
            top_cat = max(cats, key=cats.get)
            clusters.append({
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "report_count": len(cluster),
                "category": top_cat,
                "locations": len(set((round(r.latitude, 3), round(r.longitude, 3)) for r in cluster)),
            })
    clusters.sort(key=lambda c: c["report_count"], reverse=True)
    return {"hotspots": clusters}
