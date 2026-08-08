# 🏙️ CIVICOS — Help Rebuild Your City

A working end-to-end hackathon MVP that connects **Citizen → AI → Civic Priority Engine → Command Center → Resolution Verification**.

## Pipeline

```
CITIZEN REPORT → AI ANALYSIS → DUPLICATE DETECTION → PRIORITY ENGINE
      → CIVIC COMMAND CENTER → DEPARTMENT ASSIGNMENT → RESOLUTION
      → BEFORE/AFTER VERIFICATION → VERIFIED FIX
```

## Tech Stack
- **Frontend**: React + Vite + Leaflet/OpenStreetMap
- **Backend**: Python + FastAPI + SQLAlchemy
- **Database**: SQLite (instant local demo, swappable to Firebase)
- **AI**: Deterministic mock engine (keyword + metadata based) with clean interfaces to plug in a real vision/LLM API (OpenAI, Google Vision, Gemini) later

## Features
- 📢 **Citizen report flow** — photo upload, GPS, description → auto AI classification
- 🤖 **AI pipeline** — category, severity, context, confidence
- 🔁 **Duplicate detection** — geo (<100m) + category + text similarity → merge reports into one incident
- 🔥 **Priority Engine** — 0–100 CIVIC SCORE from 6 weighted factors
- 🛰️ **Command Center** — map with color-coded markers, issue queue, filters, incident detail
- 🏢 **Department assignment** — deterministic rules engine
- 🔧 **Status workflow** — Reported → Verified → Prioritized → Assigned → In Progress → Resolved → Verified
- ✅ **PROVE THE FIX** — before/after AI verification with confidence score
- 🌱 **Environmental intelligence** — hotspot clustering for waste/water/green space

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs at http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Demo Script (Show Judges)
1. Open **Command Center** — see the color-coded city map + priority queue.
2. Go to **Report Issue** and submit a pothole report.
3. Submit a second report near the same spot → **AI detects a duplicate (91%)** → merges into the incident, report count increases.
4. Reload Command Center → priority score rises (more people affected).
5. Click **Assign** → department assigned → status moves to Assigned → In Progress.
6. Upload an **after image** + note → **PROVE THE FIX** returns high confidence → status = ✅ Verified.
7. Watch the marker turn green on the map.

## Project Structure
```
backend/
  main.py            # FastAPI app + demo seed data
  models.py          # User, Report, Incident, Resolution
  schemas.py         # Pydantic request models
  routes/            # reports, incidents, dashboard
  services/          # ai, duplicate, priority, department, verification
  utils/             # geo (haversine), scoring
frontend/
  src/
    pages/           # Home, Report, Nearby, MyReports, CommandCenter, Environmental
    components/      # CivicMap (Leaflet)
    api.js           # API client
