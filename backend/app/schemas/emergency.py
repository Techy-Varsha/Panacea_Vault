"""
Emergency allocation schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class EmergencyAllocationRequest(BaseModel):
    funding_request_id: int
    esi_level: int
    justification: str


class EmergencyAllocationResponse(BaseModel):
    success: bool
    allocation_id: Optional[int] = None
    allocated_amount_inr: Decimal
    remaining_emergency_reserve_inr: Decimal
    message: str
    audit_trail: dict