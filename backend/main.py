import os
import json
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
from exa_py import Exa
from sqlalchemy.orm import Session
from sqlalchemy import func
import bcrypt
from jose import jwt, JWTError

from database import get_db, init_db
from models import Hospital, Doctor
from schemas import (
    HospitalCreate, HospitalResponse, HospitalUpdate,
    DoctorCreate, DoctorResponse, DoctorUpdate,
    DoctorEntry,
    LoginRequest, LoginResponse,
    VALID_SPECIALTIES,
)

load_dotenv()

app = FastAPI(title="Healthcare Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
exa_client = Exa(api_key=os.getenv("EXA_API_KEY"))


# ── Auth Utilities ──

JWT_SECRET = os.getenv("JWT_SECRET", "medimatch-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(data: dict) -> str:
    to_encode = {**data, "sub": str(data["sub"])}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _extract_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        payload["sub"] = int(payload["sub"])
    except (JWTError, Exception):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return payload


def get_current_hospital(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Hospital:
    payload = _extract_token(authorization)
    if payload.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Hospital access required.")
    hospital = db.query(Hospital).filter(Hospital.id == payload["sub"]).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return hospital


def get_current_doctor(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Doctor:
    payload = _extract_token(authorization)
    if payload.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access required.")
    doctor = db.query(Doctor).filter(Doctor.id == payload["sub"]).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    return doctor


# ── Startup ──

@app.on_event("startup")
def on_startup():
    init_db()
    seed_default_data()


def seed_default_data():
    """Populate database with default hospitals and doctors if empty."""
    db = next(get_db())
    try:
        if db.query(Hospital).count() > 0:
            return

        default_hash = hash_password("password123")

        hospitals = [
            Hospital(name="SMHS Hospital", address="Karan Nagar, Srinagar", city="Srinagar", contact_number="+91-194-2452052", email="info@smhs.org", password_hash=default_hash, description="Premier multi-specialty government hospital in Kashmir", latitude=34.0837, longitude=74.7973),
            Hospital(name="SKIMS Soura", address="Soura, Srinagar", city="Srinagar", contact_number="+91-194-2403404", email="info@skims.ac.in", password_hash=default_hash, description="Advanced tertiary care and medical research institute", latitude=34.1340, longitude=74.8380),
            Hospital(name="Lal Ded Hospital", address="Sonwar, Srinagar", city="Srinagar", contact_number="+91-194-2450246", email="info@lalled.org", password_hash=default_hash, description="Largest maternity and gynecology hospital in the valley", latitude=34.0750, longitude=74.8070),
            Hospital(name="District Hospital Anantnag", address="KP Road, Anantnag", city="Anantnag", contact_number="+91-1932-222153", email="dh.anantnag@jk.gov.in", password_hash=default_hash, description="Key district-level hospital serving south Kashmir", latitude=33.7311, longitude=75.1487),
            Hospital(name="District Hospital Baramulla", address="Hospital Road, Baramulla", city="Baramulla", contact_number="+91-1952-234510", email="dh.baramulla@jk.gov.in", password_hash=default_hash, description="Major healthcare facility for north Kashmir", latitude=34.1980, longitude=74.3436),
            Hospital(name="Sub District Hospital Sopore", address="Main Road, Sopore", city="Sopore", contact_number="+91-1954-222345", email="sdh.sopore@jk.gov.in", password_hash=default_hash, description="Healthcare centre serving the apple town of Kashmir", latitude=34.3000, longitude=74.4700),
            Hospital(name="District Hospital Pulwama", address="Rajpora Road, Pulwama", city="Pulwama", contact_number="+91-1933-241230", email="dh.pulwama@jk.gov.in", password_hash=default_hash, description="District hospital serving the saffron heartland", latitude=33.8748, longitude=74.8952),
            Hospital(name="District Hospital Kupwara", address="Main Town, Kupwara", city="Kupwara", contact_number="+91-1955-252140", email="dh.kupwara@jk.gov.in", password_hash=default_hash, description="Primary healthcare facility for Kupwara district", latitude=34.5310, longitude=74.2540),
        ]
        db.add_all(hospitals)
        db.flush()

        hospital_map = {h.name: h.id for h in hospitals}

        doctors = [
            Doctor(name="Dr. Fayaz Ahmad Bhat", email="fayaz.bhat@smhs.org", password_hash=default_hash, specialty="cardiologist", experience_years=18, hospital_id=hospital_map["SMHS Hospital"], availability="Mon-Sat", contact_info="+91-194-2452101"),
            Doctor(name="Dr. Ruqaya Shaheen", email="ruqaya.shaheen@skims.ac.in", password_hash=default_hash, specialty="neurologist", experience_years=14, hospital_id=hospital_map["SKIMS Soura"], availability="Mon-Fri", contact_info="+91-194-2403501"),
            Doctor(name="Dr. Tariq Rashid Mir", email="tariq.mir@smhs.org", password_hash=default_hash, specialty="orthopedist", experience_years=20, hospital_id=hospital_map["SMHS Hospital"], availability="Mon-Sat", contact_info="+91-194-2452102"),
            Doctor(name="Dr. Nazia Habib", email="nazia.habib@lalled.org", password_hash=default_hash, specialty="general physician", experience_years=10, hospital_id=hospital_map["Lal Ded Hospital"], availability="Mon-Fri", contact_info="+91-194-2450301"),
            Doctor(name="Dr. Irfan Mushtaq Wani", email="irfan.wani@skims.ac.in", password_hash=default_hash, specialty="gastroenterologist", experience_years=12, hospital_id=hospital_map["SKIMS Soura"], availability="Mon-Sat", contact_info="+91-194-2403502"),
            Doctor(name="Dr. Sameena Yousuf", email="sameena.yousuf@dh.anantnag.org", password_hash=default_hash, specialty="dermatologist", experience_years=9, hospital_id=hospital_map["District Hospital Anantnag"], availability="Mon-Fri", contact_info="+91-1932-222201"),
            Doctor(name="Dr. Showkat Ahmad Dar", email="showkat.dar@dh.baramulla.org", password_hash=default_hash, specialty="pulmonologist", experience_years=15, hospital_id=hospital_map["District Hospital Baramulla"], availability="Mon-Sat", contact_info="+91-1952-234601"),
            Doctor(name="Dr. Asifa Jan", email="asifa.jan@sdh.sopore.org", password_hash=default_hash, specialty="ent specialist", experience_years=8, hospital_id=hospital_map["Sub District Hospital Sopore"], availability="Mon-Fri", contact_info="+91-1954-222401"),
            Doctor(name="Dr. Bilal Ahmad Sheikh", email="bilal.sheikh@dh.pulwama.org", password_hash=default_hash, specialty="psychiatrist", experience_years=11, hospital_id=hospital_map["District Hospital Pulwama"], availability="Tue-Sat", contact_info="+91-1933-241301"),
            Doctor(name="Dr. Mehvish Saleem", email="mehvish.saleem@dh.kupwara.org", password_hash=default_hash, specialty="ophthalmologist", experience_years=7, hospital_id=hospital_map["District Hospital Kupwara"], availability="Mon-Fri", contact_info="+91-1955-252201"),
            Doctor(name="Dr. Owais Hamid Lone", email="owais.lone@skims.ac.in", password_hash=default_hash, specialty="cardiologist", experience_years=9, hospital_id=hospital_map["SKIMS Soura"], availability="Mon-Sat", contact_info="+91-194-2403503"),
            Doctor(name="Dr. Sabia Rashid", email="sabia.rashid@dh.anantnag.org", password_hash=default_hash, specialty="general physician", experience_years=16, hospital_id=hospital_map["District Hospital Anantnag"], availability="Mon-Sat", contact_info="+91-1932-222202"),
            Doctor(name="Dr. Adil Farooq Rather", email="adil.rather@clinic.com", password_hash=default_hash, specialty="dermatologist", experience_years=13, hospital_id=None, availability="Mon-Fri", contact_info="+91-194-2456789", address="Main Chowk, Budgam", city="Budgam", latitude=33.8900, longitude=74.7200),
            Doctor(name="Dr. Huma Maqbool", email="huma.maqbool@clinic.com", password_hash=default_hash, specialty="general physician", experience_years=10, hospital_id=None, availability="Mon-Sat", contact_info="+91-194-2462345", address="Duderhama, Ganderbal", city="Ganderbal", latitude=34.2268, longitude=74.7826),
            Doctor(name="Dr. Zahoor Ahmad Naikoo", email="zahoor.naikoo@clinic.com", password_hash=default_hash, specialty="orthopedist", experience_years=17, hospital_id=None, availability="Tue-Sat", contact_info="+91-1936-243210", address="Near Bus Stand, Pahalgam", city="Pahalgam", latitude=34.0161, longitude=75.3150),
        ]
        db.add_all(doctors)
        db.commit()
    finally:
        db.close()


# ── Constants ──

EMERGENCY_KEYWORDS = [
    "chest pain", "breathing difficulty", "difficulty breathing",
    "heart attack", "stroke", "unconscious",
]


# ── Pydantic Models for AI pipeline ──

class SymptomRequest(BaseModel):
    symptoms: str


class DoctorInfo(BaseModel):
    name: str
    specialty: str
    hospital: str
    phone: str
    experience_years: Optional[int] = None
    availability: Optional[str] = None
    hospital_latitude: Optional[float] = None
    hospital_longitude: Optional[float] = None


class AnalysisResponse(BaseModel):
    specialist: str
    doctors: list[DoctorInfo]
    medical_context: str
    extracted_symptoms: list[str]
    disclaimer: str
    emergency: bool = False
    emergency_message: Optional[str] = None


# ── AI Pipeline Functions ──

def check_emergency(user_input: str) -> bool:
    text = user_input.lower()
    return any(kw in text for kw in EMERGENCY_KEYWORDS)


async def extract_symptoms(user_input: str) -> list[str]:
    response = await openai_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a medical symptom extractor. Extract key medical symptoms from the user's text. Return ONLY a valid JSON array of strings, nothing else. Example: [\"headache\", \"fever\", \"nausea\"]",
            },
            {"role": "user", "content": user_input},
        ],
        temperature=0.1,
    )
    raw = response.choices[0].message.content.strip()
    try:
        symptoms = json.loads(raw)
        if isinstance(symptoms, list):
            return [str(s) for s in symptoms]
    except json.JSONDecodeError:
        pass
    return [s.strip().strip('"').strip("'") for s in raw.strip("[]").split(",") if s.strip()]


async def get_medical_context(symptoms: list[str]) -> str:
    query = f"{', '.join(symptoms)} causes and which doctor to consult"
    try:
        results = exa_client.search_and_contents(
            query=query, num_results=3, type="auto", text=True,
        )
        combined = ""
        for result in results.results:
            text = getattr(result, "text", "") or ""
            combined += text[:1500] + "\n\n"
        return combined.strip() if combined.strip() else "No additional medical context found."
    except Exception as e:
        return f"Could not fetch medical context: {str(e)}"


async def decide_specialist(symptoms: list[str], context: str) -> str:
    response = await openai_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a medical routing assistant. Given symptoms and medical context, "
                    "return ONLY the type of doctor the patient should consult. Use one of these "
                    "specialties (lowercase): cardiologist, neurologist, dermatologist, "
                    "general physician, orthopedist, gastroenterologist, pulmonologist, "
                    "ent specialist, psychiatrist, ophthalmologist. "
                    "Return ONLY the specialty name, nothing else."
                ),
            },
            {
                "role": "user",
                "content": f"Symptoms: {', '.join(symptoms)}\n\nMedical Context:\n{context[:3000]}",
            },
        ],
        temperature=0.1,
    )
    return response.choices[0].message.content.strip().lower()


def get_doctors_from_db(specialist: str, db: Session) -> list[DoctorInfo]:
    """Query database for doctors matching the specialist type."""
    specialist = specialist.lower().strip()

    query = db.query(Doctor).outerjoin(Hospital)

    matches = query.filter(Doctor.specialty == specialist).all()

    if not matches:
        matches = query.filter(
            Doctor.specialty.contains(specialist) | func.instr(specialist, Doctor.specialty)
        ).all()

    if not matches:
        matches = query.filter(Doctor.specialty == "general physician").all()

    return [
        DoctorInfo(
            name=d.name,
            specialty=d.specialty,
            hospital=d.hospital.name if d.hospital else "Independent Clinic",
            phone=d.contact_info or "",
            experience_years=d.experience_years,
            availability=d.availability or "",
            hospital_latitude=d.hospital.latitude if d.hospital else d.latitude,
            hospital_longitude=d.hospital.longitude if d.hospital else d.longitude,
        )
        for d in matches
    ]


# ── AI Analysis Endpoint ──

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_symptoms(request: SymptomRequest, db: Session = Depends(get_db)):
    if not request.symptoms or not request.symptoms.strip():
        raise HTTPException(status_code=400, detail="Please provide your symptoms.")

    disclaimer = "⚠️ This is not medical advice. Please consult a qualified doctor for proper diagnosis and treatment."

    if check_emergency(request.symptoms):
        return AnalysisResponse(
            specialist="emergency medicine",
            doctors=[],
            medical_context="",
            extracted_symptoms=[],
            disclaimer=disclaimer,
            emergency=True,
            emergency_message=(
                "🚨 EMERGENCY: Your symptoms suggest a potentially life-threatening condition. "
                "Please call emergency services (911) immediately or go to the nearest emergency room. "
                "Do NOT wait for a scheduled appointment."
            ),
        )

    try:
        symptoms = await extract_symptoms(request.symptoms)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to extract symptoms: {str(e)}")

    try:
        context = await get_medical_context(symptoms)
    except Exception:
        context = "Medical context unavailable."

    try:
        specialist = await decide_specialist(symptoms, context)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to determine specialist: {str(e)}")

    doctors = get_doctors_from_db(specialist, db)

    return AnalysisResponse(
        specialist=specialist,
        doctors=doctors,
        medical_context=context[:2000],
        extracted_symptoms=symptoms,
        disclaimer=disclaimer,
    )


# ── Auth Endpoints ──

@app.post("/auth/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    if data.role == "hospital":
        user = db.query(Hospital).filter(
            func.lower(Hospital.email) == data.email.strip().lower()
        ).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        token = create_token({"sub": user.id, "role": "hospital"})
        return LoginResponse(token=token, role="hospital", id=user.id, name=user.name)

    elif data.role == "doctor":
        user = db.query(Doctor).filter(
            func.lower(Doctor.email) == data.email.strip().lower(),
            Doctor.email != "",
        ).first()
        if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        token = create_token({"sub": user.id, "role": "doctor"})
        return LoginResponse(token=token, role="doctor", id=user.id, name=user.name)

    raise HTTPException(status_code=400, detail="Role must be 'hospital' or 'doctor'.")


@app.get("/auth/me")
def get_me(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    payload = _extract_token(authorization)
    role = payload.get("role")
    uid = payload.get("sub")

    if role == "hospital":
        hospital = db.query(Hospital).filter(Hospital.id == uid).first()
        if not hospital:
            raise HTTPException(status_code=404, detail="Hospital not found.")
        return {
            "role": "hospital",
            "id": hospital.id,
            "name": hospital.name,
            "address": hospital.address,
            "city": hospital.city,
            "contact_number": hospital.contact_number,
            "email": hospital.email,
            "description": hospital.description,
            "latitude": hospital.latitude,
            "longitude": hospital.longitude,
        }

    elif role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.id == uid).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found.")
        return {
            "role": "doctor",
            "id": doctor.id,
            "name": doctor.name,
            "email": doctor.email,
            "specialty": doctor.specialty,
            "experience_years": doctor.experience_years,
            "hospital_id": doctor.hospital_id,
            "hospital_name": doctor.hospital.name if doctor.hospital else "",
            "availability": doctor.availability,
            "contact_info": doctor.contact_info,
            "address": doctor.address,
            "city": doctor.city,
            "latitude": doctor.latitude,
            "longitude": doctor.longitude,
        }

    raise HTTPException(status_code=400, detail="Unknown role in token.")


# ── Hospital Dashboard Endpoints ──

@app.put("/auth/me/hospital", response_model=HospitalResponse)
def update_my_hospital(
    data: HospitalUpdate,
    hospital: Hospital = Depends(get_current_hospital),
    db: Session = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(hospital, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(hospital)
    return hospital


@app.get("/auth/me/hospital/doctors", response_model=list[DoctorResponse])
def list_my_doctors(
    hospital: Hospital = Depends(get_current_hospital),
    db: Session = Depends(get_db),
):
    return db.query(Doctor).filter(Doctor.hospital_id == hospital.id).order_by(Doctor.name).all()


@app.put("/auth/me/hospital/doctors/{doctor_id}", response_model=DoctorResponse)
def update_my_doctor(
    doctor_id: int,
    data: DoctorUpdate,
    hospital: Hospital = Depends(get_current_hospital),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id, Doctor.hospital_id == hospital.id
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found in your hospital.")

    updates = data.model_dump(exclude_unset=True)
    if "specialty" in updates and updates["specialty"]:
        if updates["specialty"].lower().strip() not in VALID_SPECIALTIES:
            raise HTTPException(status_code=400, detail=f"Invalid specialty. Must be one of: {', '.join(VALID_SPECIALTIES)}")

    for field, value in updates.items():
        if value is not None:
            setattr(doctor, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(doctor)
    return doctor


@app.delete("/auth/me/hospital/doctors/{doctor_id}")
def delete_my_doctor(
    doctor_id: int,
    hospital: Hospital = Depends(get_current_hospital),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id, Doctor.hospital_id == hospital.id
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found in your hospital.")
    db.delete(doctor)
    db.commit()
    return {"detail": "Doctor removed."}


# ── Doctor Dashboard Endpoint ──

@app.put("/auth/me/doctor", response_model=DoctorResponse)
def update_my_doctor_profile(
    data: DoctorUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    updates = data.model_dump(exclude_unset=True)
    if "specialty" in updates and updates["specialty"]:
        if updates["specialty"].lower().strip() not in VALID_SPECIALTIES:
            raise HTTPException(status_code=400, detail=f"Invalid specialty. Must be one of: {', '.join(VALID_SPECIALTIES)}")

    for field, value in updates.items():
        if value is not None:
            setattr(doctor, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(doctor)
    return doctor


# ── Hospital Registration ──

@app.post("/hospitals/register", response_model=HospitalResponse, status_code=201)
def register_hospital(data: HospitalCreate, db: Session = Depends(get_db)):
    if not data.name.strip() or not data.city.strip() or not data.email.strip():
        raise HTTPException(status_code=400, detail="Name, city, and email are required.")

    if not data.password or len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    duplicate = db.query(Hospital).filter(
        func.lower(Hospital.name) == data.name.strip().lower(),
        func.lower(Hospital.city) == data.city.strip().lower(),
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A hospital with this name already exists in this city.")

    email_taken = db.query(Hospital).filter(
        func.lower(Hospital.email) == data.email.strip().lower()
    ).first()
    if email_taken:
        raise HTTPException(status_code=409, detail="This email is already registered.")

    if data.doctors:
        for doc in data.doctors:
            if not doc.name.strip() or not doc.specialty.strip():
                raise HTTPException(status_code=400, detail="Each doctor must have a name and specialty.")
            if doc.specialty.lower().strip() not in VALID_SPECIALTIES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid specialty '{doc.specialty}' for doctor '{doc.name}'. Must be one of: {', '.join(VALID_SPECIALTIES)}",
                )

    hospital = Hospital(
        name=data.name.strip(),
        address=data.address.strip(),
        city=data.city.strip(),
        contact_number=data.contact_number.strip(),
        email=data.email.strip(),
        password_hash=hash_password(data.password),
        description=(data.description or "").strip(),
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(hospital)
    db.flush()

    if data.doctors:
        for doc in data.doctors:
            doctor = Doctor(
                name=doc.name.strip(),
                specialty=doc.specialty.lower().strip(),
                experience_years=doc.experience_years,
                hospital_id=hospital.id,
                availability=(doc.availability or "").strip(),
                contact_info=(doc.contact_info or "").strip(),
            )
            db.add(doctor)

    db.commit()
    db.refresh(hospital)
    return hospital


@app.get("/hospitals", response_model=list[HospitalResponse])
def list_hospitals(city: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Hospital)
    if city:
        query = query.filter(func.lower(Hospital.city) == city.strip().lower())
    return query.order_by(Hospital.name).all()


@app.get("/hospitals/{hospital_id}", response_model=HospitalResponse)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return hospital


# ── Doctor Registration ──

@app.post("/doctors/add", response_model=DoctorResponse, status_code=201)
def add_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    if not data.name.strip() or not data.specialty.strip():
        raise HTTPException(status_code=400, detail="Name and specialty are required.")

    if data.specialty.lower().strip() not in VALID_SPECIALTIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid specialty. Must be one of: {', '.join(VALID_SPECIALTIES)}",
        )

    if data.hospital_id is not None:
        hospital = db.query(Hospital).filter(Hospital.id == data.hospital_id).first()
        if not hospital:
            raise HTTPException(status_code=404, detail="Hospital not found. Register the hospital first.")

    p_hash = ""
    if data.password and data.email:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        email_taken = db.query(Doctor).filter(
            func.lower(Doctor.email) == data.email.strip().lower(),
            Doctor.email != "",
        ).first()
        if email_taken:
            raise HTTPException(status_code=409, detail="A doctor with this email already exists.")
        p_hash = hash_password(data.password)

    doctor = Doctor(
        name=data.name.strip(),
        email=(data.email or "").strip(),
        password_hash=p_hash,
        specialty=data.specialty.lower().strip(),
        experience_years=data.experience_years,
        hospital_id=data.hospital_id,
        availability=(data.availability or "").strip(),
        contact_info=(data.contact_info or "").strip(),
        address=(data.address or "").strip(),
        city=(data.city or "").strip(),
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@app.get("/doctors", response_model=list[DoctorResponse])
def list_doctors(
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Doctor).outerjoin(Hospital)
    if specialty:
        query = query.filter(func.lower(Doctor.specialty) == specialty.strip().lower())
    if city:
        city_lower = city.strip().lower()
        query = query.filter(
            (func.lower(Hospital.city) == city_lower) | (func.lower(Doctor.city) == city_lower)
        )
    return query.order_by(Doctor.name).all()


@app.get("/specialties")
def list_specialties():
    return VALID_SPECIALTIES


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/chat")
async def chat_symptom(request: ChatRequest):
    system_prompt = (
        "You are a friendly medical intake assistant for MediMatch. Your job is to gather "
        "enough symptom information from the patient through a short conversation (2-3 exchanges). "
        "Ask focused follow-up questions about: location of pain, duration, severity, triggers, "
        "and any related symptoms.\n\n"
        "RULES:\n"
        "- Keep responses to 1-2 short sentences\n"
        "- Be warm and reassuring\n"
        "- After you have gathered sufficient details (typically after 2-3 user messages), "
        "respond with EXACTLY this format on its own line:\n"
        "READY_TO_ANALYZE: <comprehensive summary of all symptoms mentioned>\n"
        "- Only use READY_TO_ANALYZE when you have enough detail to recommend a specialist\n"
        "- Never diagnose — only gather information"
    )
    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in request.messages:
        if m.role in ("user", "assistant"):
            llm_messages.append({"role": m.role, "content": m.content})

    try:
        response = await openai_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=llm_messages,
            temperature=0.6,
            max_tokens=300,
        )
        reply = response.choices[0].message.content.strip()

        if "READY_TO_ANALYZE:" in reply:
            summary = reply.split("READY_TO_ANALYZE:", 1)[1].strip()
            return {"ready": True, "summary": summary, "reply": ""}

        return {"ready": False, "summary": "", "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat error: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
