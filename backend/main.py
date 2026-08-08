from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
import models
from routes import reports, incidents, dashboard
from services import ai_service, duplicate_service, priority_engine, department_service

app = FastAPI(title="CIVICOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database.Base.metadata.create_all(bind=database.engine)

app.include_router(reports.router)
app.include_router(incidents.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"app": "CIVICOS", "status": "running", "version": "1.0.0"}


@app.on_event("startup")
def seed_demo_data():
    """Seed demo data so the Command Center demo works instantly."""
    db = database.SessionLocal()
    try:
        if db.query(models.Incident).count() > 0:
            return
        _seed(db)
    finally:
        db.close()


def _seed(db):
    from models import User, Report, Incident
    demo_user = db.query(User).filter(User.email == "aryan@civicos.app").first()
    if not demo_user:
        demo_user = User(name="Aryan", email="aryan@civicos.app", role="admin")
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    demo_reports = [
        ("Large pothole outside college gate, dangerous for students", 28.6139, 77.2090, ""),
        ("Huge garbage pile near Gate 2, waste not collected", 28.6300, 77.2200, ""),
        ("Garbage dump outside Gate 2, smells terrible", 28.6305, 77.2205, ""),
        ("Waste hasn't been collected near Gate 2 for a week", 28.6298, 77.2196, ""),
        ("Streetlight not working on the main road, very dark at night", 28.6400, 77.2300, ""),
        ("Broken drainage pipe causing water logging after rain", 28.6200, 77.2400, ""),
        ("Illegal construction dumping debris near the park", 28.6150, 77.2150, ""),
        ("Dangerous sinkhole on the highway, risk of accident", 28.6000, 77.2000, ""),
        ("Water pollution in the lake, dead fish floating", 28.6500, 77.2500, ""),
        ("Park needs maintenance, broken playground equipment", 28.6350, 77.2250, ""),
    ]

    for desc, lat, lon, cat in demo_reports:
        analysis = ai_service.analyze_text(desc)
        category = cat or analysis["category"]
        report = Report(
            user_id=demo_user.id,
            description=desc,
            latitude=lat,
            longitude=lon,
            category=category,
            ai_confidence=analysis["confidence"],
            severity=analysis["severity"],
        )
        db.add(report)
        # Commit each report so duplicate detection sees prior reports.
        db.commit()
        db.refresh(report)
        incident, prob, bd = duplicate_service.find_duplicate(db, report)
        if incident:
            incident.reports.append(report)
            incident.priority_score = priority_engine.compute_priority(incident)
        else:
            title_words = desc.split()[:5]
            inc = Incident(
                title=f"{category.replace('_', ' ').title()} - {' '.join(title_words)}",
                category=category,
                description=desc,
                latitude=lat,
                longitude=lon,
                severity=report.severity,
                ai_confidence=analysis["confidence"],
                status="PRIORITIZED",
                department=department_service.assign_department(category),
            )
            inc.reports.append(report)
            inc.priority_score = priority_engine.compute_priority(inc)
            db.add(inc)
        db.commit()
