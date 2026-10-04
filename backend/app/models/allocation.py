"""
Allocation models
"""

import enum
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text,Boolean, Enum as SQLEnum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AllocationStage(str, enum.Enum):
    KNAPSACK = "KNAPSACK"
    GREEDY_FALLBACK = "GREEDY_FALLBACK"
    EMERGENCY = "EMERGENCY"


class AllocationRun(Base):
    __tablename__ = "allocation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_code = Column(String(50), unique=True, nullable=False, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id"), nullable=False)
    total_requests = Column(Integer, default=0)
    eligible_requests = Column(Integer, default=0)
    selected_requests = Column(Integer, default=0)
    total_allocated_inr = Column(Numeric(15, 2), default=0)
    total_urgency_funded = Column(Numeric(15, 2), default=0)
    knapsack_budget_inr = Column(Numeric(15, 2), default=0)
    knapsack_allocated_inr = Column(Numeric(15, 2), default=0)
    knapsack_requests = Column(Integer, default=0)
    greedy_budget_inr = Column(Numeric(15, 2), default=0)
    greedy_allocated_inr = Column(Numeric(15, 2), default=0)
    greedy_requests = Column(Integer, default=0)
    emergency_budget_inr = Column(Numeric(15, 2), default=0)
    emergency_allocated_inr = Column(Numeric(15, 2), default=0)
    emergency_requests = Column(Integer, default=0)
    remaining_budget_inr = Column(Numeric(15, 2), default=0)
    status = Column(String(50), default='COMPLETED')
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    executed_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    budget = relationship("Budget", back_populates="allocation_runs")
    executor = relationship("User", back_populates="allocation_runs")
    results = relationship("AllocationResult", back_populates="allocation_run", cascade="all, delete-orphan")


class AllocationResult(Base):
    __tablename__ = "allocation_results"

    id = Column(Integer, primary_key=True, index=True)
    allocation_run_id = Column(Integer, ForeignKey("allocation_runs.id", ondelete="CASCADE"), nullable=False)
    funding_request_id = Column(Integer, ForeignKey("funding_requests.id"), nullable=False)
    allocation_stage = Column(SQLEnum(AllocationStage), nullable=False)
    allocated_amount_inr = Column(Numeric(15, 2), nullable=False)
    urgency_score = Column(Numeric(10, 2), nullable=False)
    selection_order = Column(Integer, nullable=True)
    is_selected = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    allocation_run = relationship("AllocationRun", back_populates="results")
    funding_request = relationship("FundingRequest", back_populates="allocation_results")

    __table_args__ = (
        UniqueConstraint('allocation_run_id', 'funding_request_id', name='unique_run_request'),
        Index('idx_run_stage', 'allocation_run_id', 'allocation_stage'),
    )