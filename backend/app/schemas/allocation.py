"""
Allocation schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class AllocationRunRequest(BaseModel):
    budget_id: int


class AllocationRunResponse(BaseModel):
    id: int
    run_code: str
    budget_id: int
    total_requests: int
    eligible_requests: int
    selected_requests: int
    total_allocated_inr: Decimal
    total_urgency_funded: Decimal
    knapsack_budget_inr: Decimal
    knapsack_allocated_inr: Decimal
    knapsack_requests: int
    greedy_budget_inr: Decimal
    greedy_allocated_inr: Decimal
    greedy_requests: int
    emergency_budget_inr: Decimal
    emergency_allocated_inr: Decimal
    emergency_requests: int
    remaining_budget_inr: Decimal
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    executed_by: int

    class Config:
        from_attributes = True


class AllocationResultResponse(BaseModel):
    id: int
    allocation_run_id: int
    funding_request_id: int
    allocation_stage: str
    allocated_amount_inr: Decimal
    urgency_score: Decimal
    selection_order: Optional[int] = None
    is_selected: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AllocationDetailsResponse(BaseModel):
    run: AllocationRunResponse
    results: List[AllocationResultResponse]
    knapsack_details: dict
    greedy_details: dict