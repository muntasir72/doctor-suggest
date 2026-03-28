from pydantic import BaseModel
from typing import Optional, Literal


VALID_SPECIALTIES = [
    "cardiologist",
    "neurologist",
    "dermatologist",
    "general physician",
    "orthopedist",
    "gastroenterologist",
    "pulmonologist",
    "ent specialist",
    "psychiatrist",
    "ophthalmologist",
]


# ── Auth ──

class LoginRequest(BaseModel):
    email: str
    password: str
    role: Literal["hospital", "doctor"]


class LoginResponse(BaseModel):
    token: str
    role: str
    id: int
    name: str


# ── Doctor entry (inline, no auth) ──

class DoctorEntry(BaseModel):
    """Doctor data submitted as part of hospital registration (no password needed)."""
    name: str
    specialty: str
    experience_years: int = 0
    availability: Optional[str] = ""
    contact_info: Optional[str] = ""


# ── Hospital ──

class HospitalCreate(BaseModel):
    name: str
    address: str
    city: str
    contact_number: str
    email: str
    password: str
    description: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    doctors: Optional[list[DoctorEntry]] = []


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HospitalResponse(BaseModel):
    id: int
    name: str
    address: str
    city: str
    contact_number: str
    email: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


# ── Doctor ──

class DoctorCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    password: Optional[str] = ""
    specialty: str
    experience_years: int
    hospital_id: Optional[int] = None
    availability: Optional[str] = ""
    contact_info: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    experience_years: Optional[int] = None
    availability: Optional[str] = None
    contact_info: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DoctorResponse(BaseModel):
    id: int
    name: str
    email: str = ""
    specialty: str
    experience_years: int
    hospital_id: Optional[int] = None
    availability: str
    contact_info: str
    address: str = ""
    city: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hospital: Optional[HospitalResponse] = None

    class Config:
        from_attributes = True
