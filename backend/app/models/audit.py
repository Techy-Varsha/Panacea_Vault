"""
Audit Log model
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean, ForeignKey, Index, Enum as SQLEnum, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditAction(str, enum.Enum):
    USER_LOGIN = "USER_LOGIN"
    REQUEST_CREATED = "REQUEST_CREATED"
    REQUEST_UPDATED = "REQUEST_UPDATED"
    SCORE_CALCULATED = "SCORE_CALCULATED"
    ALLOCATION_STARTED = "ALLOCATION_STARTED"
    KNAPSACK_COMPLETED = "KNAPSACK_COMPLETED"
    GREEDY_FALLBACK_COMPLETED = "GREEDY_FALLBACK_COMPLETED"
    EMERGENCY_ALLOCATION = "EMERGENCY_ALLOCATION"
    ALLOCATION_APPROVED = "ALLOCATION_APPROVED"
    DISBURSEMENT_CREATED = "DISBURSEMENT_CREATED"
    UC_SUBMITTED = "UC_SUBMITTED"
    UC_VERIFIED = "UC_VERIFIED"
    CASE_SETTLED = "CASE_SETTLED"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)
    old_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    metadata = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    actor = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index('idx_actor', 'actor_id'),
        Index('idx_entity', 'entity_type', 'entity_id'),
        Index('idx_action', 'action'),
        Index('idx_created', 'created_at'),
    )