"""
Scoring API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.auth.dependencies import require_doctor, require_admin, get_current_active_user
from app.schemas.scoring import ScoreRequest, ScoreResponse, ScoreBreakdown
from app.models.funding_request import FundingRequest
from app.models.urgency_score import UrgencyScore
from app.models.user import User
from dsa_engine.scoring.urgency_scorer import UrgencyScorer, ScoringInput


router = APIRouter()


@router.post("/calculate", response_model=ScoreResponse)
async def calculate_score(
    score_request: ScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Calculate urgency score from input parameters"""
    scorer = UrgencyScorer()

    input_data = ScoringInput(
        icd10_category=score_request.icd10_category,
        prototype_base_severity=score_request.prototype_base_severity,
        ttc_category=score_request.ttc_category,
        success_rate=score_request.success_rate,
        age=score_request.age,
        age_factor_points_10=score_request.age_factor_points_10,
        waiting_days=score_request.waiting_days,
        is_emergency=score_request.is_emergency,
        esi_level=score_request.esi_level
    )

    result = scorer.calculate(input_data)

    return ScoreResponse(
        breakdown=ScoreBreakdown(**result.to_dict()),
        calculated_at="2026-10-02T00:00:00Z"  # TODO: use actual datetime
    )


@router.post("/requests/{request_id}/calculate", response_model=ScoreResponse)
async def calculate_request_score(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Calculate and store urgency score for a funding request"""
    request = db.query(FundingRequest).filter(FundingRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Funding request not found")

    if request.requesting_doctor_id != current_user.id and current_user.role.name != "ADMIN":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Calculate score
    scorer = UrgencyScorer()
    input_data = ScoringInput(
        icd10_category=request.disease.icd10_category if request.disease else "",
        prototype_base_severity=request.disease.prototype_base_severity if request.disease else 50,
        ttc_category=request.ttc_category or "7d+",
        success_rate=float(request.success_rate) if request.success_rate else 0.5,
        age=0,  # Not stored directly, use age_factor_points
        age_factor_points_10=request.age_factor_points or 5,
        waiting_days=request.waiting_days,
        is_emergency=request.is_emergency,
        esi_level=request.esi_level
    )

    result = scorer.calculate(input_data)

    # Update request
    request.urgency_score = Decimal(str(result.final_score))
    request.waiting_boost = result.waiting_boost

    # Store detailed breakdown
    urgency_score = db.query(UrgencyScore).filter(
        UrgencyScore.funding_request_id == request_id
    ).first()

    if urgency_score:
        urgency_score.base_severity = result.base_severity
        urgency_score.esi_component = result.esi_component
        urgency_score.ttc_component = result.ttc_component
        urgency_score.success_rate_component = result.success_rate_component
        urgency_score.age_component = result.age_component
        urgency_score.waiting_boost = result.waiting_boost
        urgency_score.emergency_component = result.emergency_component
        urgency_score.final_score = Decimal(str(result.final_score))
        urgency_score.calculation_details = result.to_dict()
        urgency_score.calculated_by = current_user.id
    else:
        urgency_score = UrgencyScore(
            funding_request_id=request_id,
            base_severity=result.base_severity,
            esi_component=result.esi_component,
            ttc_component=result.ttc_component,
            success_rate_component=result.success_rate_component,
            age_component=result.age_component,
            waiting_boost=result.waiting_boost,
            emergency_component=result.emergency_component,
            final_score=Decimal(str(result.final_score)),
            calculation_details=result.to_dict(),
            calculated_by=current_user.id
        )
        db.add(urgency_score)

    db.commit()

    # TODO: Create audit log

    return ScoreResponse(
        breakdown=ScoreBreakdown(**result.to_dict()),
        calculated_at="2026-10-02T00:00:00Z"
    )


@router.get("/requests/{request_id}/breakdown", response_model=ScoreBreakdown)
async def get_score_breakdown(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get stored score breakdown for a request"""
    request = db.query(FundingRequest).filter(FundingRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Funding request not found")

    # Check permissions (similar to request access)
    if current_user.role.name not in ["ADMIN", "AUDITOR"]:
        if current_user.role.name == "DOCTOR" and request.requesting_doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if current_user.role.name == "HOSPITAL" and request.hospital_id != current_user.id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    urgency_score = db.query(UrgencyScore).filter(
        UrgencyScore.funding_request_id == request_id
    ).first()

    if not urgency_score:
        raise HTTPException(status_code=404, detail="Score not calculated yet")

    return ScoreBreakdown(
        base_severity=urgency_score.base_severity,
        ttc_component=urgency_score.ttc_component,
        success_rate_component=urgency_score.success_rate_component,
        age_component=urgency_score.age_component,
        waiting_boost=urgency_score.waiting_boost,
        emergency_component=urgency_score.emergency_component,
        esi_component=urgency_score.esi_component,
        final_score=urgency_score.final_score
    )