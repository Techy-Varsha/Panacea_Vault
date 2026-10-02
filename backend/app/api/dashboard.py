"""
Dashboard API endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal

from app.database import get_db
from app.auth.dependencies import get_current_active_user
from app.schemas.dashboard import DashboardSummary, AllocationFlowData, AllocationFlowNode, AllocationFlowLink
from app.models.budget import Budget
from app.models.funding_request import FundingRequest, RequestStatus
from app.models.allocation import AllocationRun, AllocationResult, AllocationStage
from app.models.emergency import EmergencyAllocation
from app.models.disbursement import Disbursement
from app.models.utilization import UtilizationCertificate
from app.models.user import User


router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard summary metrics"""
    # Get active budget
    budget = db.query(Budget).filter(Budget.is_active == True).order_by(Budget.budget_date.desc()).first()

    if not budget:
        return DashboardSummary(
            total_budget_inr=Decimal('0'),
            allocated_amount_inr=Decimal('0'),
            remaining_budget_inr=Decimal('0'),
            treatment_packages_funded=0,
            emergency_allocations=0,
            utilization_rate=0.0,
            settlement_rate=0.0
        )

    # Total allocated (from allocation runs)
    total_allocated = db.query(func.coalesce(func.sum(AllocationRun.total_allocated_inr), 0)).scalar() or Decimal('0')
    total_emergency = db.query(func.coalesce(func.sum(EmergencyAllocation.allocated_amount_inr), 0)).scalar() or Decimal('0')

    # Treatment packages funded (selected requests)
    funded_count = db.query(FundingRequest).filter(
        FundingRequest.status.in_([RequestStatus.SELECTED, RequestStatus.APPROVED, RequestStatus.DISBURSED, RequestStatus.VERIFIED, RequestStatus.SETTLED])
    ).count()

    # Emergency allocations count
    emergency_count = db.query(EmergencyAllocation).count()

    # Utilization rate (verified disbursements / total disbursements)
    total_disbursements = db.query(Disbursement).count()
    verified_disbursements = db.query(Disbursement).filter(Disbursement.payment_status == 'VERIFIED').count()
    utilization_rate = (verified_disbursements / total_disbursements * 100) if total_disbursements > 0 else 0.0

    # Settlement rate (settled / verified)
    settled_count = db.query(FundingRequest).filter(FundingRequest.status == RequestStatus.SETTLED).count()
    verified_count = db.query(FundingRequest).filter(FundingRequest.status == RequestStatus.VERIFIED).count()
    settlement_rate = (settled_count / verified_count * 100) if verified_count > 0 else 0.0

    remaining = float(budget.normal_remaining_inr) + float(budget.emergency_remaining_inr)

    return DashboardSummary(
        total_budget_inr=budget.total_daily_budget_inr,
        allocated_amount_inr=total_allocated + total_emergency,
        remaining_budget_inr=Decimal(str(remaining)),
        treatment_packages_funded=funded_count,
        emergency_allocations=emergency_count,
        utilization_rate=round(utilization_rate, 2),
        settlement_rate=round(settlement_rate, 2)
    )


@router.get("/allocation-flow", response_model=AllocationFlowData)
async def get_allocation_flow(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Sankey diagram data for allocation flow"""
    budget = db.query(Budget).filter(Budget.is_active == True).order_by(Budget.budget_date.desc()).first()

    if not budget:
        return AllocationFlowData(nodes=[], links=[])

    # Get latest allocation run
    latest_run = db.query(AllocationRun).order_by(AllocationRun.started_at.desc()).first()

    total_budget = float(budget.total_daily_budget_inr)
    emergency_reserve = float(budget.emergency_reserve_inr)
    normal_budget = float(budget.normal_budget_inr)

    knapsack_allocated = float(latest_run.knapsack_allocated_inr) if latest_run else 0
    greedy_allocated = float(latest_run.greedy_allocated_inr) if latest_run else 0
    emergency_allocated = float(latest_run.emergency_allocated_inr) if latest_run else 0

    # Hospital disbursements
    disbursed = db.query(func.coalesce(func.sum(Disbursement.amount_inr), 0)).scalar() or 0
    settled = db.query(func.coalesce(func.sum(Disbursement.amount_inr), 0)).filter(
        Disbursement.payment_status == 'SETTLED'
    ).scalar() or 0

    nodes = [
        AllocationFlowNode(id="total", label="Total Budget", value=Decimal(str(total_budget)), percentage=100.0),
        AllocationFlowNode(id="emergency_reserve", label="Emergency Reserve (15%)", value=Decimal(str(emergency_reserve)), percentage=round(emergency_reserve/total_budget*100, 1)),
        AllocationFlowNode(id="normal_budget", label="Normal Allocation", value=Decimal(str(normal_budget)), percentage=round(normal_budget/total_budget*100, 1)),
        AllocationFlowNode(id="knapsack", label="0/1 Knapsack", value=Decimal(str(knapsack_allocated)), percentage=round(knapsack_allocated/total_budget*100, 1) if total_budget > 0 else 0),
        AllocationFlowNode(id="greedy", label="Greedy Fallback", value=Decimal(str(greedy_allocated)), percentage=round(greedy_allocated/total_budget*100, 1) if total_budget > 0 else 0),
        AllocationFlowNode(id="emergency_alloc", label="Emergency Allocations", value=Decimal(str(emergency_allocated)), percentage=round(emergency_allocated/total_budget*100, 1) if total_budget > 0 else 0),
        AllocationFlowNode(id="hospitals", label="Hospital Disbursement", value=Decimal(str(disbursed)), percentage=round(disbursed/total_budget*100, 1) if total_budget > 0 else 0),
        AllocationFlowNode(id="settled", label="Settled", value=Decimal(str(settled)), percentage=round(settled/total_budget*100, 1) if total_budget > 0 else 0),
    ]

    links = [
        AllocationFlowLink(source="total", target="emergency_reserve", value=Decimal(str(emergency_reserve))),
        AllocationFlowLink(source="total", target="normal_budget", value=Decimal(str(normal_budget))),
        AllocationFlowLink(source="normal_budget", target="knapsack", value=Decimal(str(knapsack_allocated))),
        AllocationFlowLink(source="normal_budget", target="greedy", value=Decimal(str(greedy_allocated))),
        AllocationFlowLink(source="emergency_reserve", target="emergency_alloc", value=Decimal(str(emergency_allocated))),
        AllocationFlowLink(source="knapsack", target="hospitals", value=Decimal(str(knapsack_allocated))),
        AllocationFlowLink(source="greedy", target="hospitals", value=Decimal(str(greedy_allocated))),
        AllocationFlowLink(source="emergency_alloc", target="hospitals", value=Decimal(str(emergency_allocated))),
        AllocationFlowLink(source="hospitals", target="settled", value=Decimal(str(settled))),
    ]

    return AllocationFlowData(nodes=nodes, links=links)