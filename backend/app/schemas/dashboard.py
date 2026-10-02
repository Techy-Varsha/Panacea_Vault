"""
Dashboard schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal


class DashboardSummary(BaseModel):
    total_budget_inr: Decimal
    allocated_amount_inr: Decimal
    remaining_budget_inr: Decimal
    treatment_packages_funded: int
    emergency_allocations: int
    utilization_rate: float
    settlement_rate: float


class AllocationFlowNode(BaseModel):
    id: str
    label: str
    value: Decimal
    percentage: float


class AllocationFlowLink(BaseModel):
    source: str
    target: str
    value: Decimal


class AllocationFlowData(BaseModel):
    nodes: List[AllocationFlowNode]
    links: List[AllocationFlowLink]