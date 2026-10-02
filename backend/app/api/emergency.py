"""
Emergency Allocation API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.auth.dependencies import require_admin
from app.schemas.emergency import EmergencyAllocationRequest, EmergencyAllocationResponse
from app.models.funding_request import FundingRequest
from app.models.budget import Budget
from app.models.emergency import EmergencyAllocation
from app.models.user import User
from app.models.audit import AuditLog, AuditAction
from dsa_engine.emergency.emergency_allocator import EmergencyAllocator, EmergencyRequest


router = APIRouter()


@router.post("/allocate", response_model=EmergencyAllocationResponse)
async def allocate_emergency(
    request: EmergencyAllocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Process emergency allocation from reserve"""
    # Get funding request
    funding_request = db.query(FundingRequest).filter(
        FundingRequest.id == request.funding_request_id
    ).first()
    if not funding_request:
        raise HTTPException(status_code=404, detail="Funding request not found")

    # Get active budget
    budget = db.query(Budget).filter(Budget.is_active == True).order_by(Budget.budget_date.desc()).first()
    if not budget:
        raise HTTPException(status_code=404, detail="No active budget found")

    # Check if already allocated
    existing = db.query(EmergencyAllocation).filter(
        EmergencyAllocation.funding_request_id == request.funding_request_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Request already has emergency allocation")

    # Create emergency request object
    emergency_request = EmergencyRequest(
        funding_request_id=funding_request.id,
        patient_id=funding_request.patient_id,
        icd10_category=funding_request.disease.icd10_category if funding_request.disease else "",
        esi_level=request.esi_level,
        urgency_score=float(funding_request.urgency_score),
        funding_gap_inr=int(funding_request.funding_gap_inr),
        justification=request.justification,
        requested_by=current_user.id
    )

    # Process allocation
    allocator = EmergencyAllocator()
    result = allocator.allocate(
        emergency_request,
        int(budget.emergency_remaining_inr),
        current_user.id,
        db
    )

    if result.success:
        # Update budget
        budget.emergency_remaining_inr = result.remaining_emergency_reserve_inr

        # Update funding request
        funding_request.status = "SELECTED"
        funding_request.is_emergency = True

        # Create audit log
        audit_log = AuditLog(
            actor_id=current_user.id,
            actor_role=current_user.role.name,
            action=AuditAction.EMERGENCY_ALLOCATION,
            entity_type="emergency_allocation",
            entity_id=str(result.allocation_id),
            new_state=result.audit_trail,
            metadata={
                "funding_request_id": request.funding_request_id,
                "esi_level": request.esi_level,
                "justification": request.justification
            }
        )
        db.add(audit_log)

        db.commit()

    return EmergencyAllocationResponse(
        success=result.success,
        allocation_id=result.allocation_id,
        allocated_amount_inr=Decimal(str(result.allocated_amount_inr)),
        remaining_emergency_reserve_inr=Decimal(str(result.remaining_emergency_reserve_inr)),
        message=result.message,
        audit_trail=result.audit_trail
    )


@router.get("/reserve/status")
async def get_reserve_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get emergency reserve status"""
    budget = db.query(Budget).filter(Budget.is_active == True).order_by(Budget.budget_date.desc()).first()
    if not budget:
        raise HTTPException(status_code=404, detail="No active budget found")

    allocator = EmergencyAllocator()
    status = allocator.get_emergency_reserve_status(
        int(budget.total_daily_budget_inr),
        int(budget.emergency_reserve_inr - budget.emergency_remaining_inr)
    )

    return status


@router.get("/allocations")
async def list_emergency_allocations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all emergency allocations"""
    allocations = db.query(EmergencyAllocation).order_by(
        EmergencyAllocation.authorized_at.desc()
    ).limit(100).all()

    return allocations