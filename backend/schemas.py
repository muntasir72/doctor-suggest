from pydantic import BaseModel, EmailStr
from typing import Optional


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


class DoctorEntry(BaseModel):
    """Doctor data submitted as part of hospital registration (no hospital_id needed)."""
    name: str
    specialty: str
    experience_years: int = 0
    availability: Optional[str] = ""
    contact_info: Optional[str] = ""


class HospitalCreate(BaseModel):
    name: str
    address: str
    city: str
    contact_number: str
    email: str
    description: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    doctors: Optional[list[DoctorEntry]] = []


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


class DoctorCreate(BaseModel):
    name: str
    specialty: str
    experience_years: int
    hospital_id: int
    availability: Optional[str] = ""
    contact_info: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DoctorResponse(BaseModel):
    id: int
    name: str
    specialty: str
    experience_years: int
    hospital_id: int
    availability: str
    contact_info: str
    address: str = ""
    city: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hospital: Optional[HospitalResponse] = None

    class Config:
        from_attributes = True
