from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False, index=True)
    contact_number = Column(String, nullable=False)
    email = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    description = Column(String, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    doctors = relationship("Doctor", back_populates="hospital", cascade="all, delete-orphan")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, default="")
    password_hash = Column(String, default="")
    specialty = Column(String, nullable=False, index=True)
    experience_years = Column(Integer, default=0)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    availability = Column(String, default="")
    contact_info = Column(String, default="")
    address = Column(String, default="")
    city = Column(String, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    hospital = relationship("Hospital", back_populates="doctors")
