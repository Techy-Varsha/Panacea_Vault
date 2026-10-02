"""
User and Role models
"""

import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    HOSPITAL = "HOSPITAL"
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"
    DONOR = "DONOR"


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    role = relationship("Role", back_populates="users")
    patient = relationship("Patient", back_populates="user", uselist=False)
    funding_requests = relationship("FundingRequest", foreign_keys="FundingRequest.requesting_doctor_id", back_populates="requesting_doctor")
    created_budgets = relationship("Budget", back_populates="creator")
    allocation_runs = relationship("AllocationRun", back_populates="executor")
    emergency_authorizations = relationship("EmergencyAllocation", back_populates="authorizer")
    disbursements_verified = relationship("Disbursement", back_populates="verifier")
    utilization_certificates_submitted = relationship("UtilizationCertificate", foreign_keys="UtilizationCertificate.submitted_by", back_populates="submitter")
    utilization_certificates_verified = relationship("UtilizationCertificate", foreign_keys="UtilizationCertificate.verified_by", back_populates="verifier")
    audit_logs = relationship("AuditLog", back_populates="actor")