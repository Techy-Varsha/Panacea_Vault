"""
Utilization Certificate model
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UtilizationCertificate(Base):
    __tablename__ = "utilization_certificates"

    id = Column(Integer, primary_key=True, index=True)
    uc_code = Column(String(50), unique=True, nullable=False, index=True)
    disbursement_id = Column(Integer, ForeignKey("disbursements.id"), nullable=False)
    funding_request_id = Column(Integer, ForeignKey("funding_requests.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    treatment_details = Column(Text, nullable=True)
    actual_cost_inr = Column(Numeric(15, 2), nullable=True)
    patient_outcome = Column(String(100), nullable=True)
    discharge_date = Column(Date, nullable=True)
    supporting_documents = Column(JSON, nullable=True)
    status = Column(String(50), default='SUBMITTED')
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)

    disbursement = relationship("Disbursement")
    funding_request = relationship("FundingRequest", back_populates="utilization_certificates")
    hospital = relationship("Hospital", back_populates="utilization_certificates")
    submitter = relationship("User", foreign_keys=[submitted_by], back_populates="utilization_certificates_submitted")
    verifier = relationship("User", foreign_keys=[verified_by], back_populates="utilization_certificates_verified")