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


class HospitalCreate(BaseModel):
    name: str
    address: str
    city: str
    contact_number: str
    email: str
    description: Optional[str] = ""
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


class DoctorCreate(BaseModel):
    name: str
    specialty: str
    experience_years: int
    hospital_id: int
    availability: Optional[str] = ""
    contact_info: Optional[str] = ""


class DoctorResponse(BaseModel):
    id: int
    name: str
    specialty: str
    experience_years: int
    hospital_id: int
    availability: str
    contact_info: str
    hospital: Optional[HospitalResponse] = None

    class Config:
        from_attributes = True
