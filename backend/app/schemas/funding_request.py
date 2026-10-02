"""
Funding Request schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class FundingRequestBase(BaseModel):
    patient_id: int
    disease_id: int
    procedure_id: int
    treatment_package_id: int
    hospital_id: int
    surgery_cost_inr: Decimal
    surety_amount_inr: Decimal
    funding_gap_inr: Decimal
    urgency_score: Decimal
    ttc_category: Optional[str] = None
    ttc_points: Optional[int] = None
    success_rate: Optional[float] = None
    success_rate_points: Optional[Decimal] = None
    age_factor_points: Optional[int] = None
    is_emergency: bool = False
    esi_level: Optional[int] = None


class FundingRequestCreate(FundingRequestBase):
    requesting_doctor_id: int


class FundingRequestUpdate(BaseModel):
    status: Optional[str] = None
    urgency_score: Optional[Decimal] = None
    waiting_days: Optional[int] = None
    waiting_boost: Optional[int] = None
    eligibility_notes: Optional[str] = None


class FundingRequestResponse(FundingRequestBase):
    id: int
    request_code: str
    requesting_doctor_id: int
    waiting_days: int
    waiting_boost: int
    status: str
    eligibility_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FundingRequestList(BaseModel):
    items: List[FundingRequestResponse]
    total: int
    page: int
    page_size: int