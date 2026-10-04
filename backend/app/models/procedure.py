"""
Procedure model (from Surgery_Mapping.csv)
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    department = Column(String(100), nullable=False, index=True)
    surgery_name = Column(String(255), nullable=False)
    example_icd10_pcs_code = Column(String(50), nullable=True)
    source_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    funding_requests = relationship("FundingRequest", back_populates="procedure")
    treatment_packages = relationship("TreatmentPackage", back_populates="procedure")

    __table_args__ = (
        # Unique constraint on department + surgery_name
        # This is handled by the unique_dept_surgery index in the SQL schema
    )