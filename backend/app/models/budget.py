"""
Budget model
"""

from sqlalchemy import Column, Integer, Date, Numeric, ForeignKey, DateTime, Boolean, Computed
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    budget_date = Column(Date, unique=True, nullable=False, index=True)
    total_daily_budget_inr = Column(Numeric(15, 2), nullable=False)
    emergency_reserve_percent = Column(Numeric(5, 2), default=15.00)
    emergency_reserve_inr = Column(Numeric(15, 2), Computed("total_daily_budget_inr * emergency_reserve_percent / 100"), nullable=False)
    normal_budget_inr = Column(Numeric(15, 2), Computed("total_daily_budget_inr - (total_daily_budget_inr * emergency_reserve_percent / 100)"), nullable=False)
    normal_remaining_inr = Column(Numeric(15, 2), default=0)
    emergency_remaining_inr = Column(Numeric(15, 2), default=0)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User", back_populates="created_budgets")
    allocation_runs = relationship("AllocationRun", back_populates="budget")
    emergency_allocations = relationship("EmergencyAllocation", back_populates="budget")