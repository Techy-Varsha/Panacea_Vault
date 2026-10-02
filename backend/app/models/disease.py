"""
Disease model (from ICD_Severity.csv)
"""

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Disease(Base):
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, index=True)
    icd10_category = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    prototype_base_severity = Column(Integer, nullable=False)
    source_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    funding_requests = relationship("FundingRequest", back_populates="disease")
    treatment_packages = relationship("TreatmentPackage", back_populates="disease")