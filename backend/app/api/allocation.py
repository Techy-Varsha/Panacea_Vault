"""
Allocation API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.auth.dependencies import require_admin
from app.schemas.allocation import AllocationRunRequest, AllocationRunResponse, AllocationResultResponse, AllocationDetailsResponse
from app.models.allocation import AllocationRun, AllocationResult, AllocationStage
from app.models.funding_request import FundingRequest, RequestStatus
from app.models.budget import Budget
from app.models.user import User
from dsa_engine.knapsack.knapsack_solver import KnapsackSolver, KnapsackItem, create_items_from_requests
from dsa_engine.greedy.greedy_fallback import GreedyFallback, run_greedy_fallback


router = APIRouter()


@router.post("/run", response_model=AllocationRunResponse)
async def run_allocation(
    allocation_request: AllocationRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Run allocation (knapsack + greedy fallback)"""
    # Get budget
    budget = db.query(Budget).filter(Budget.id == allocation_request.budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if not budget.is_active:
        raise HTTPException(status_code=400, detail="Budget is not active")

    # Get eligible requests (PENDING or ELIGIBLE status, not emergency)
    eligible_requests = db.query(FundingRequest).filter(
        FundingRequest.status.in_([RequestStatus.PENDING, RequestStatus.ELIGIBLE]),
        FundingRequest.is_emergency == False
    ).all()

    if not eligible_requests:
        raise HTTPException(status_code=400, detail="No eligible requests found")

    # Create allocation run record
    run_code = f"ALLOC-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    allocation_run = AllocationRun(
        run_code=run_code,
        budget_id=budget.id,
        total_requests=len(eligible_requests),
        eligible_requests=len(eligible_requests),
        executed_by=current_user.id
    )
    db.add(allocation_run)
    db.commit()
    db.refresh(allocation_run)

    # Prepare items for knapsack
    request_dicts = []
    for req in eligible_requests:
        request_dicts.append({
            'id': req.id,
            'request_code': req.request_code,
            'funding_gap_inr': int(req.funding_gap_inr),
            'urgency_score': float(req.urgency_score),
            'patient_id': req.patient_id,
            'disease_id': req.disease_id,
            'hospital_id': req.hospital_id
        })

    items = create_items_from_requests(request_dicts)

    # Stage 1: 0/1 Knapsack
    normal_budget = int(budget.normal_budget_inr)
    solver = KnapsackSolver(normal_budget, currency_scale=10000)
    knapsack_details = solver.solve_with_details(items)

    # Create knapsack allocation results
    knapsack_selected_ids = set(knapsack_details['selected_request_ids'])
    for sel in knapsack_details['selected_requests']:
        result = AllocationResult(
            allocation_run_id=allocation_run.id,
            funding_request_id=sel['request_id'],
            allocation_stage=AllocationStage.KNAPSACK,
            allocated_amount_inr=sel['cost_inr'],
            urgency_score=sel['urgency_score'],
            selection_order=sel.get('selection_order')
        )
        db.add(result)

        # Update request status
        req = db.query(FundingRequest).filter(FundingRequest.id == sel['request_id']).first()
        if req:
            req.status = RequestStatus.SELECTED

    # Update allocation run with knapsack results
    allocation_run.knapsack_budget_inr = normal_budget
    allocation_run.knapsack_allocated_inr = knapsack_details['total_allocated_inr']
    allocation_run.knapsack_requests = knapsack_details['selected_count']

    # Stage 2: Greedy Fallback
    remaining_budget = knapsack_details['remaining_budget_inr']
    greedy_details = run_greedy_fallback(
        items,
        type('obj', (object,), {'selected_request_ids': list(knapsack_selected_ids)})(),
        remaining_budget
    )

    # Create greedy allocation results
    for sel in greedy_details['selected_requests']:
        result = AllocationResult(
            allocation_run_id=allocation_run.id,
            funding_request_id=sel['request_id'],
            allocation_stage=AllocationStage.GREEDY_FALLBACK,
            allocated_amount_inr=sel['cost_inr'],
            urgency_score=sel['urgency_score'],
            selection_order=sel['selection_order']
        )
        db.add(result)

        # Update request status
        req = db.query(FundingRequest).filter(FundingRequest.id == sel['request_id']).first()
        if req:
            req.status = RequestStatus.SELECTED

    # Update allocation run with greedy results
    allocation_run.greedy_budget_inr = remaining_budget
    allocation_run.greedy_allocated_inr = greedy_details['total_allocated_inr']
    allocation_run.greedy_requests = greedy_details['selected_count']

    # Final totals
    total_allocated = knapsack_details['total_allocated_inr'] + greedy_details['total_allocated_inr']
    total_urgency = knapsack_details['total_urgency_funded'] + greedy_details['total_urgency_funded']

    allocation_run.total_allocated_inr = total_allocated
    allocation_run.total_urgency_funded = total_urgency
    allocation_run.selected_requests = knapsack_details['selected_count'] + greedy_details['selected_count']
    allocation_run.remaining_budget_inr = greedy_details['remaining_budget_inr']
    allocation_run.status = 'COMPLETED'
    allocation_run.completed_at = datetime.utcnow()

    # Update budget remaining
    budget.normal_remaining_inr = greedy_details['remaining_budget_inr']

    db.commit()
    db.refresh(allocation_run)

    # TODO: Create audit log

    return allocation_run


@router.get("/runs/{run_id}", response_model=AllocationRunResponse)
async def get_allocation_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get allocation run by ID"""
    run = db.query(AllocationRun).filter(AllocationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Allocation run not found")
    return run


@router.get("/runs/{run_id}/results", response_model=List[AllocationResultResponse])
async def get_allocation_results(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get allocation results for a run"""
    run = db.query(AllocationRun).filter(AllocationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Allocation run not found")

    results = db.query(AllocationResult).filter(
        AllocationResult.allocation_run_id == run_id
    ).order_by(AllocationResult.allocation_stage, AllocationResult.selection_order).all()

    return results


@router.get("/runs/{run_id}/details", response_model=AllocationDetailsResponse)
async def get_allocation_details(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed allocation breakdown"""
    run = db.query(AllocationRun).filter(AllocationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Allocation run not found")

    results = db.query(AllocationResult).filter(
        AllocationResult.allocation_run_id == run_id
    ).all()

    # Reconstruct knapsack and greedy details from results
    knapsack_results = [r for r in results if r.allocation_stage == AllocationStage.KNAPSACK]
    greedy_results = [r for r in results if r.allocation_stage == AllocationStage.GREEDY_FALLBACK]

    knapsack_details = {
        'selected_count': len(knapsack_results),
        'total_allocated_inr': sum(r.allocated_amount_inr for r in knapsack_results),
        'total_urgency_funded': sum(float(r.urgency_score) for r in knapsack_results),
        'selected_requests': [
            {
                'request_id': r.funding_request_id,
                'cost_inr': float(r.allocated_amount_inr),
                'urgency_score': float(r.urgency_score)
            }
            for r in knapsack_results
        ]
    }

    greedy_details = {
        'selected_count': len(greedy_results),
        'total_allocated_inr': sum(r.allocated_amount_inr for r in greedy_results),
        'total_urgency_funded': sum(float(r.urgency_score) for r in greedy_results),
        'selected_requests': [
            {
                'request_id': r.funding_request_id,
                'cost_inr': float(r.allocated_amount_inr),
                'urgency_score': float(r.urgency_score),
                'selection_order': r.selection_order
            }
            for r in greedy_results
        ]
    }

    return AllocationDetailsResponse(
        run=run,
        results=results,
        knapsack_details=knapsack_details,
        greedy_details=greedy_details
    )


@router.get("/results", response_model=List[AllocationResultResponse])
async def list_allocation_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all allocation results"""
    results = db.query(AllocationResult).order_by(AllocationResult.created_at.desc()).limit(100).all()
    return results