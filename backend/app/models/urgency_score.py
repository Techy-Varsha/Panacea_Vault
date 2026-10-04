"""
Urgency Score model (detailed breakdown)
"""

from sqlalchemy import Column, Integer, Numeric, ForeignKey, DateTime, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UrgencyScore(Base):
    __tablename__ = "urgency_scores"

    id = Column(Integer, primary_key=True, index=True)
    funding_request_id = Column(Integer, ForeignKey("funding_requests.id", ondelete="CASCADE"), nullable=False, unique=True)
    base_severity = Column(Integer, nullable=False)
    esi_component = Column(Integer, default=0)
    ttc_component = Column(Integer, default=0)
    success_rate_component = Column(Numeric(5, 2), default=0)
    age_component = Column(Integer, default=0)
    waiting_boost = Column(Integer, default=0)
    emergency_component = Column(Integer, default=0)
    final_score = Column(Numeric(10, 2), nullable=False)
    calculation_details = Column(JSON, nullable=True)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    calculated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    funding_request = relationship("FundingRequest", back_populates="urgency_score_detail")
    calculator = relationship("User")