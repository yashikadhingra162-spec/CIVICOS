from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# Many-to-many: incidents <-> reports
incident_reports = Table(
    "incident_reports",
    Base.metadata,
    Column("incident_id", Integer, ForeignKey("incidents.id"), primary_key=True),
    Column("report_id", Integer, ForeignKey("reports.id"), primary_key=True),
)

CATEGORIES = [
    "ROAD_DAMAGE",
    "GARBAGE",
    "STREETLIGHT",
    "DRAINAGE",
    "WATER_POLLUTION",
    "ILLEGAL_DUMPING",
    "GREEN_SPACE",
    "OTHER",
]

STATUS_FLOW = [
    "REPORTED",
    "AI_VERIFIED",
    "PRIORITIZED",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "VERIFIED",
]


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Citizen")
    email = Column(String, unique=True, index=True)
    role = Column(String, default="citizen")  # citizen | admin
    created_at = Column(DateTime, default=datetime.utcnow)

    reports = relationship("Report", back_populates="user")


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    description = Column(Text)
    image_url = Column(String, default="")
    latitude = Column(Float)
    longitude = Column(Float)
    category = Column(String, default="OTHER")
    ai_confidence = Column(Float, default=0.0)
    severity = Column(String, default="MEDIUM")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    incidents = relationship(
        "Incident", secondary=incident_reports, back_populates="reports"
    )


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    category = Column(String, default="OTHER")
    description = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    severity = Column(String, default="MEDIUM")
    priority_score = Column(Integer, default=0)
    status = Column(String, default="REPORTED")
    department = Column(String, default="Unassigned")
    ai_confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports = relationship(
        "Report", secondary=incident_reports, back_populates="incidents"
    )
    resolutions = relationship("Resolution", back_populates="incident")


class Resolution(Base):
    __tablename__ = "resolutions"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    before_image = Column(String, default="")
    after_image = Column(String, default="")
    ai_confidence = Column(Float, default=0.0)
    verified = Column(Integer, default=0)  # 0 = not verified
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="resolutions")
