import os
import json
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
from exa_py import Exa
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, init_db
from models import Hospital, Doctor
from schemas import (
    HospitalCreate, HospitalResponse,
    DoctorCreate, DoctorResponse,
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

        hospitals = [
            Hospital(name="City Heart Hospital", address="123 Main St, Manhattan", city="New York", contact_number="+1-555-0100", email="info@cityheart.com", description="Leading cardiac care center", latitude=40.7580, longitude=-73.9855),
            Hospital(name="NeuroLife Clinic", address="456 Oak Ave, Brooklyn", city="New York", contact_number="+1-555-0200", email="info@neurolife.com", description="Advanced neurological treatments", latitude=40.6892, longitude=-73.9857),
            Hospital(name="SkinCare Advanced Center", address="789 Pine Rd, Beverly Hills", city="Los Angeles", contact_number="+1-555-0300", email="info@skincare.com", description="Comprehensive dermatology services", latitude=34.0736, longitude=-118.4004),
            Hospital(name="City General Hospital", address="321 Elm St, Midtown", city="New York", contact_number="+1-555-0400", email="info@citygeneral.com", description="Multi-specialty hospital", latitude=40.7488, longitude=-73.9856),
            Hospital(name="Wellness Medical Center", address="654 Maple Dr, Lincoln Park", city="Chicago", contact_number="+1-555-0500", email="info@wellness.com", description="Full-service medical center", latitude=41.9214, longitude=-87.6513),
            Hospital(name="Community Health Clinic", address="987 Cedar Ln, Hyde Park", city="Chicago", contact_number="+1-555-0600", email="info@communityhealth.com", description="Affordable community healthcare", latitude=41.7943, longitude=-87.5907),
            Hospital(name="BoneJoint Specialty Hospital", address="147 Birch Blvd, Santa Monica", city="Los Angeles", contact_number="+1-555-0700", email="info@bonejoint.com", description="Orthopedic excellence", latitude=34.0195, longitude=-118.4912),
            Hospital(name="Digestive Health Institute", address="258 Spruce St, Upper East Side", city="New York", contact_number="+1-555-0800", email="info@digestive.com", description="GI and digestive care", latitude=40.7736, longitude=-73.9566),
        ]
        db.add_all(hospitals)
        db.flush()

        hospital_map = {h.name: h.id for h in hospitals}

        doctors = [
            Doctor(name="Dr. Sarah Mitchell", specialty="cardiologist", experience_years=15, hospital_id=hospital_map["City Heart Hospital"], availability="Mon-Fri", contact_info="+1-555-0101"),
            Doctor(name="Dr. James Carter", specialty="cardiologist", experience_years=12, hospital_id=hospital_map["Wellness Medical Center"], availability="Mon-Sat", contact_info="+1-555-0102"),
            Doctor(name="Dr. Priya Sharma", specialty="neurologist", experience_years=10, hospital_id=hospital_map["NeuroLife Clinic"], availability="Mon-Fri", contact_info="+1-555-0201"),
            Doctor(name="Dr. Robert Kim", specialty="neurologist", experience_years=8, hospital_id=hospital_map["City General Hospital"], availability="Tue-Sat", contact_info="+1-555-0202"),
            Doctor(name="Dr. Emily Chen", specialty="dermatologist", experience_years=9, hospital_id=hospital_map["SkinCare Advanced Center"], availability="Mon-Thu", contact_info="+1-555-0301"),
            Doctor(name="Dr. Michael Davis", specialty="dermatologist", experience_years=14, hospital_id=hospital_map["Wellness Medical Center"], availability="Mon-Fri", contact_info="+1-555-0302"),
            Doctor(name="Dr. Anna Lopez", specialty="general physician", experience_years=20, hospital_id=hospital_map["City General Hospital"], availability="Mon-Sat", contact_info="+1-555-0401"),
            Doctor(name="Dr. David Brown", specialty="general physician", experience_years=7, hospital_id=hospital_map["Community Health Clinic"], availability="7 days", contact_info="+1-555-0402"),
            Doctor(name="Dr. Lisa Wang", specialty="orthopedist", experience_years=11, hospital_id=hospital_map["BoneJoint Specialty Hospital"], availability="Mon-Fri", contact_info="+1-555-0501"),
            Doctor(name="Dr. Thomas Green", specialty="orthopedist", experience_years=16, hospital_id=hospital_map["City General Hospital"], availability="Mon-Thu", contact_info="+1-555-0502"),
            Doctor(name="Dr. Rachel Foster", specialty="gastroenterologist", experience_years=13, hospital_id=hospital_map["Digestive Health Institute"], availability="Tue-Sat", contact_info="+1-555-0601"),
            Doctor(name="Dr. Kevin Patel", specialty="gastroenterologist", experience_years=6, hospital_id=hospital_map["Wellness Medical Center"], availability="Mon-Fri", contact_info="+1-555-0602"),
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

    query = db.query(Doctor).join(Hospital)

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
            hospital=d.hospital.name,
            phone=d.contact_info or "",
            experience_years=d.experience_years,
            availability=d.availability or "",
            hospital_latitude=d.hospital.latitude,
            hospital_longitude=d.hospital.longitude,
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


# ── Hospital Endpoints ──

@app.post("/hospitals/register", response_model=HospitalResponse, status_code=201)
def register_hospital(data: HospitalCreate, db: Session = Depends(get_db)):
    if not data.name.strip() or not data.city.strip() or not data.email.strip():
        raise HTTPException(status_code=400, detail="Name, city, and email are required.")

    duplicate = db.query(Hospital).filter(
        func.lower(Hospital.name) == data.name.strip().lower(),
        func.lower(Hospital.city) == data.city.strip().lower(),
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A hospital with this name already exists in this city.")

    hospital = Hospital(
        name=data.name.strip(),
        address=data.address.strip(),
        city=data.city.strip(),
        contact_number=data.contact_number.strip(),
        email=data.email.strip(),
        description=(data.description or "").strip(),
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(hospital)
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


# ── Doctor Endpoints ──

@app.post("/doctors/add", response_model=DoctorResponse, status_code=201)
def add_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    if not data.name.strip() or not data.specialty.strip():
        raise HTTPException(status_code=400, detail="Name and specialty are required.")

    if data.specialty.lower().strip() not in VALID_SPECIALTIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid specialty. Must be one of: {', '.join(VALID_SPECIALTIES)}",
        )

    hospital = db.query(Hospital).filter(Hospital.id == data.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found. Register the hospital first.")

    doctor = Doctor(
        name=data.name.strip(),
        specialty=data.specialty.lower().strip(),
        experience_years=data.experience_years,
        hospital_id=data.hospital_id,
        availability=(data.availability or "").strip(),
        contact_info=(data.contact_info or "").strip(),
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
    query = db.query(Doctor).join(Hospital)
    if specialty:
        query = query.filter(func.lower(Doctor.specialty) == specialty.strip().lower())
    if city:
        query = query.filter(func.lower(Hospital.city) == city.strip().lower())
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
