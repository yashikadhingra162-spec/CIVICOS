from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    description: str = Field(min_length=8, max_length=2000)
    latitude: float
    longitude: float
    image_url: str = ""
    category: str = ""  # optional override; AI detects if empty
    user_name: str = "Citizen"
    # Honeypot: real users never fill this field. Bots often do.
    website: str = ""


class AssignRequest(BaseModel):
    department: str = ""


class StatusRequest(BaseModel):
    status: str


class ResolutionCreate(BaseModel):
    after_image: str = ""
    note: str = ""
