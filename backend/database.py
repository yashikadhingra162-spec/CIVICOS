import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Vercel Functions have a read-only filesystem except for /tmp.
# SQLite is still suitable for the local MVP, but deployed demo requests
# must use the writable scratch directory to avoid EROFS errors.
if os.environ.get("VERCEL"):
    DATABASE_URL = "sqlite:////tmp/civicos.db"
else:
    DATABASE_URL = "sqlite:///./civicos.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
