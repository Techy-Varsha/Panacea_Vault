"""
Funding Request model
"""

import enum
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text, Boolean, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ELIGIBLE = "ELIGIBLE"
    SELECTED = "SELECTED"
    APPROVED = "APPROVED"
    DISBURSED = "DISBURSED"
    UTILIZATION_PENDING = "UTILIZATION_PENDING"
    VERIFIED = "VERIFIED"
    SETTLED = "SETTLED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class FundingRequest(Base):
    __tablename__ = "funding_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(50), unique=True, nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    procedure_id = Column(Integer, ForeignKey("procedures.id"), nullable=False)
    treatment_package_id = Column(Integer, ForeignKey("treatment_packages.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    requesting_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    surgery_cost_inr = Column(Numeric(15, 2), nullable=False)
    surety_amount_inr = Column(Numeric(15, 2), nullable=False)
    funding_gap_inr = Column(Numeric(15, 2), nullable=False)
    urgency_score = Column(Numeric(10, 2), nullable=False)
    ttc_category = Column(String(20), nullable=True)
    ttc_points = Column(Integer, nullable=True)
    success_rate = Column(Numeric(5, 4), nullable=True)
    success_rate_points = Column(Numeric(5, 2), nullable=True)
    age_factor_points = Column(Integer, nullable=True)
    waiting_days = Column(Integer, default=0)
    waiting_boost = Column(Integer, default=0)
    is_emergency = Column(Boolean, default=False)
    esi_level = Column(Integer, nullable=True)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, index=True)
    eligibility_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="funding_requests")
    disease = relationship("Disease", back_populates="funding_requests")
    procedure = relationship("Procedure", back_populates="funding_requests")
    treatment_package = relationship("TreatmentPackage", back_populates="funding_requests")
    hospital = relationship("Hospital", back_populates="funding_requests")
    requesting_doctor = relationship("User", foreign_keys=[requesting_doctor_id], back_populates="funding_requests")
    urgency_score_detail = relationship("UrgencyScore", back_populates="funding_request", uselist=False)
    allocation_results = relationship("AllocationResult", back_populates="funding_request")
    emergency_allocation = relationship("EmergencyAllocation", back_populates="funding_request", uselist=False)
    disbursements = relationship("Disbursement", back_populates="funding_request")
    utilization_certificates = relationship("UtilizationCertificate", back_populates="funding_request")

    __table_args__ = (
        Index('idx_status', 'status'),
        Index('idx_hospital', 'hospital_id'),
        Index('idx_patient', 'patient_id'),
        Index('idx_urgency', 'urgency_score'),
        Index('idx_emergency', 'is_emergency'),
    )