from pydantic import BaseModel


class ReportCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    image_url: str = ""
    category: str = ""  # optional override; AI detects if empty
    user_name: str = "Citizen"


class AssignRequest(BaseModel):
    department: str = ""


class StatusRequest(BaseModel):
    status: str


class ResolutionCreate(BaseModel):
    after_image: str = ""
    note: str = ""
