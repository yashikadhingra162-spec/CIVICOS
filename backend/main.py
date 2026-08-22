from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import database
from routes import reports, incidents, dashboard, admin, notifications

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
app.include_router(admin.router)
app.include_router(notifications.router)

FRONTEND_URL = "https://civicos-6nvfpfvg4-aryan-rais-projects-060f8c7e.vercel.app"

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url=FRONTEND_URL, status_code=307)

@app.get("/health")
def health():
    return {"app": "CIVICOS", "status": "running", "version": "1.0.0"}
