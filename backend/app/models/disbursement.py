"""
Disbursement model (Escrow-style)
"""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text, Index, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Disbursement(Base):
    __tablename__ = "disbursements"

    id = Column(Integer, primary_key=True, index=True)
    disbursement_code = Column(String(50), unique=True, nullable=False, index=True)
    allocation_result_id = Column(Integer, ForeignKey("allocation_results.id"), nullable=False)
    funding_request_id = Column(Integer, ForeignKey("funding_requests.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    amount_inr = Column(Numeric(15, 2), nullable=False)
    payment_type = Column(String(50), default='DEMO_PAYMENT_SIMULATED_ESCROW')
    payment_reference = Column(String(255), nullable=True)
    payment_status = Column(String(50), default='PENDING', index=True)
    initiated_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    allocation_result = relationship("AllocationResult")
    funding_request = relationship("FundingRequest", back_populates="disbursements")
    hospital = relationship("Hospital", back_populates="disbursements")
    verifier = relationship("User", back_populates="disbursements_verified")

    __table_args__ = (
        Index('idx_hospital_status', 'hospital_id', 'payment_status'),
    )