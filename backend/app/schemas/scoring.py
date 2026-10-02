"""
Scoring schemas
"""

from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class ScoreBreakdown(BaseModel):
    base_severity: int
    ttc_component: int
    success_rate_component: Decimal
    age_component: int
    waiting_boost: int
    emergency_component: int
    esi_component: int
    final_score: Decimal


class ScoreRequest(BaseModel):
    icd10_category: str
    prototype_base_severity: int
    ttc_category: str
    success_rate: float
    age: int
    age_factor_points_10: int
    waiting_days: int = 0
    is_emergency: bool = False
    esi_level: Optional[int] = None


class ScoreResponse(BaseModel):
    breakdown: ScoreBreakdown
    calculated_at: str  # ISO format datetime