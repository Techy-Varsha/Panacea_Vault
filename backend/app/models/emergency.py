"""
Emergency Allocation model
"""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EmergencyAllocation(Base):
    __tablename__ = "emergency_allocations"

    id = Column(Integer, primary_key=True, index=True)
    allocation_code = Column(String(50), unique=True, nullable=False, index=True)
    funding_request_id = Column(Integer, ForeignKey("funding_requests.id"), nullable=False)
    budget_id = Column(Integer, ForeignKey("budgets.id"), nullable=False)
    allocated_amount_inr = Column(Numeric(15, 2), nullable=False)
    urgency_score = Column(Numeric(10, 2), nullable=False)
    esi_level = Column(Integer, nullable=False)
    justification = Column(Text, nullable=False)
    authorized_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    authorized_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default='APPROVED')

    funding_request = relationship("FundingRequest", back_populates="emergency_allocation")
    budget = relationship("Budget", back_populates="emergency_allocations")
    authorizer = relationship("User", back_populates="emergency_authorizations")