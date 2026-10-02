"""
Treatment Package model
"""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, DateTime, Boolean, Computed
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TreatmentPackage(Base):
    __tablename__ = "treatment_packages"

    id = Column(Integer, primary_key=True, index=True)
    package_code = Column(String(50), unique=True, nullable=False, index=True)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    procedure_id = Column(Integer, ForeignKey("procedures.id"), nullable=False)
    surgery_cost_inr = Column(Numeric(15, 2), nullable=False)
    icu_cost_inr = Column(Numeric(15, 2), default=0)
    medication_cost_inr = Column(Numeric(15, 2), default=0)
    # Computed total cost
    total_package_cost_inr = Column(Numeric(15, 2), Computed("surgery_cost_inr + icu_cost_inr + medication_cost_inr"), nullable=False)
    estimated_stay_days = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    disease = relationship("Disease", back_populates="treatment_packages")
    procedure = relationship("Procedure", back_populates="treatment_packages")
    funding_requests = relationship("FundingRequest", back_populates="treatment_package")