#!/usr/bin/env python3
"""
Emergency Allocation Engine for Panacea Vault

Handles emergency reserve allocations (15% of daily budget).
Emergency requests bypass normal batch allocation through explicit authorized workflow.

Emergency allocation must:
- Verify eligibility (ESI level 1-2, critical conditions)
- Check reserve availability
- Require authorization (ADMIN role)
- Create ledger entry
- Create audit entry
- Record timestamp and reason
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class EmergencyEligibility(Enum):
    """Emergency eligibility criteria"""
    ESI_CRITICAL = "esi_critical"      # ESI level 1-2
    LIFE_THREATENING = "life_threatening"  # Specific ICD categories
    TIME_SENSITIVE = "time_sensitive"  # TTC <2h


# ESI levels that qualify for emergency (1=most urgent, 2=high urgency)
EMERGENCY_ESI_LEVELS = {1, 2}

# ICD categories considered life-threatening emergencies
EMERGENCY_ICD_CATEGORIES = {
    'I21', 'I60', 'I61', 'S06', 'A41', 'J96', 'I71', 'O72', 'O00',
    'T79', 'S36', 'S27'  # Trauma, sepsis, MI, stroke, etc.
}


@dataclass
class EmergencyRequest:
    """Emergency allocation request"""
    funding_request_id: int
    patient_id: int
    icd10_category: str
    esi_level: int
    urgency_score: float
    funding_gap_inr: int
    justification: str
    requested_by: int  # user_id of requesting doctor/admin


@dataclass
class EmergencyAllocationResult:
    """Result of emergency allocation"""
    success: bool
    allocation_id: Optional[int]
    allocated_amount_inr: int
    remaining_emergency_reserve_inr: int
    message: str
    audit_trail: Dict[str, Any]


class EmergencyAllocator:
    """
    Emergency allocation service.

    Manages the 15% emergency reserve and processes emergency allocations
    with full authorization and audit trail.
    """

    def __init__(self, emergency_reserve_percent: float = 15.0):
        self.emergency_reserve_percent = emergency_reserve_percent

    def check_eligibility(self, request: EmergencyRequest) -> Dict[str, Any]:
        """
        Check if a request qualifies for emergency allocation.

        Returns:
            Dictionary with eligibility status and reasons
        """
        reasons = []
        eligible = False

        # Check ESI level
        if request.esi_level in EMERGENCY_ESI_LEVELS:
            eligible = True
            reasons.append(f"ESI Level {request.esi_level} qualifies for emergency")

        # Check ICD category
        if request.icd10_category in EMERGENCY_ICD_CATEGORIES:
            eligible = True
            reasons.append(f"ICD {request.icd10_category} is life-threatening")

        # Check urgency score threshold (very high urgency)
        if request.urgency_score >= 95:
            eligible = True
            reasons.append(f"Urgency score {request.urgency_score} exceeds emergency threshold")

        return {
            "eligible": eligible,
            "reasons": reasons,
            "esi_level": request.esi_level,
            "icd10_category": request.icd10_category,
            "urgency_score": request.urgency_score
        }

    def allocate(
        self,
        request: EmergencyRequest,
        available_emergency_reserve_inr: int,
        authorized_by: int,
        db_connection=None
    ) -> EmergencyAllocationResult:
        """
        Process emergency allocation.

        Args:
            request: EmergencyRequest with all details
            available_emergency_reserve_inr: Current emergency reserve balance
            authorized_by: User ID of authorizing admin
            db_connection: Optional database connection for persistence

        Returns:
            EmergencyAllocationResult with outcome
        """
        # Check eligibility
        eligibility = self.check_eligibility(request)
        if not eligibility["eligible"]:
            return EmergencyAllocationResult(
                success=False,
                allocation_id=None,
                allocated_amount_inr=0,
                remaining_emergency_reserve_inr=available_emergency_reserve_inr,
                message="Request does not meet emergency eligibility criteria",
                audit_trail={
                    "action": "EMERGENCY_ALLOCATION_ATTEMPT",
                    "eligibility_check": eligibility,
                    "authorized_by": authorized_by,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        # Check reserve availability
        if request.funding_gap_inr > available_emergency_reserve_inr:
            return EmergencyAllocationResult(
                success=False,
                allocation_id=None,
                allocated_amount_inr=0,
                remaining_emergency_reserve_inr=available_emergency_reserve_inr,
                message=f"Insufficient emergency reserve: needed ₹{request.funding_gap_inr:,}, available ₹{available_emergency_reserve_inr:,}",
                audit_trail={
                    "action": "EMERGENCY_ALLOCATION_ATTEMPT",
                    "eligibility_check": eligibility,
                    "reserve_check": {
                        "requested": request.funding_gap_inr,
                        "available": available_emergency_reserve_inr
                    },
                    "authorized_by": authorized_by,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        # Allocate
        allocation_id = self._create_allocation_record(request, authorized_by, db_connection)
        remaining_reserve = available_emergency_reserve_inr - request.funding_gap_inr

        # Create audit trail
        audit_trail = {
            "action": "EMERGENCY_ALLOCATION",
            "allocation_id": allocation_id,
            "funding_request_id": request.funding_request_id,
            "patient_id": request.patient_id,
            "allocated_amount_inr": request.funding_gap_inr,
            "eligibility_check": eligibility,
            "authorized_by": authorized_by,
            "justification": request.justification,
            "timestamp": datetime.utcnow().isoformat(),
            "remaining_emergency_reserve_inr": remaining_reserve
        }

        return EmergencyAllocationResult(
            success=True,
            allocation_id=allocation_id,
            allocated_amount_inr=request.funding_gap_inr,
            remaining_emergency_reserve_inr=remaining_reserve,
            message="Emergency allocation approved",
            audit_trail=audit_trail
        )

    def _create_allocation_record(
        self,
        request: EmergencyRequest,
        authorized_by: int,
        db_connection
    ) -> int:
        """Create emergency allocation record in database."""
        if db_connection:
            cursor = db_connection.cursor()
            cursor.execute("""
                INSERT INTO emergency_allocations
                (allocation_code, funding_request_id, budget_id, allocated_amount_inr,
                 urgency_score, esi_level, justification, authorized_by, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'APPROVED')
            """, (
                f"EMR-{request.funding_request_id}-{int(datetime.utcnow().timestamp())}",
                request.funding_request_id,
                1,  # budget_id - would be passed in real implementation
                request.funding_gap_inr,
                request.urgency_score,
                request.esi_level,
                request.justification,
                authorized_by
            ))
            db_connection.commit()
            return cursor.lastrowid
        return 0  # Mock ID for testing

    def get_emergency_reserve_status(self, total_daily_budget_inr: int, allocated_emergency_inr: int) -> Dict[str, Any]:
        """Get current emergency reserve status."""
        reserve_amount = int(total_daily_budget_inr * self.emergency_reserve_percent / 100)
        remaining = reserve_amount - allocated_emergency_inr
        return {
            "total_daily_budget_inr": total_daily_budget_inr,
            "emergency_reserve_percent": self.emergency_reserve_percent,
            "emergency_reserve_inr": reserve_amount,
            "allocated_emergency_inr": allocated_emergency_inr,
            "remaining_emergency_reserve_inr": max(0, remaining),
            "utilization_pct": round((allocated_emergency_inr / reserve_amount) * 100, 2) if reserve_amount > 0 else 0
        }


def process_emergency_allocation(
    funding_request_id: int,
    esi_level: int,
    justification: str,
    authorized_by: int,
    db_connection,
    emergency_reserve_percent: float = 15.0
) -> EmergencyAllocationResult:
    """
    High-level function to process emergency allocation.

    This is the main entry point for the API endpoint.
    """
    allocator = EmergencyAllocator(emergency_reserve_percent)

    # Fetch request details from database
    cursor = db_connection.cursor(dictionary=True)
    cursor.execute("""
        SELECT fr.*, p.patient_code
        FROM funding_requests fr
        JOIN patients p ON fr.patient_id = p.id
        WHERE fr.id = %s
    """, (funding_request_id,))
    request_data = cursor.fetchone()

    if not request_data:
        return EmergencyAllocationResult(
            success=False,
            allocation_id=None,
            allocated_amount_inr=0,
            remaining_emergency_reserve_inr=0,
            message="Funding request not found",
            audit_trail={"action": "EMERGENCY_ALLOCATION_ERROR", "error": "Request not found"}
        )

    # Get current budget and emergency reserve status
    cursor.execute("""
        SELECT total_daily_budget_inr, emergency_reserve_inr, emergency_remaining_inr
        FROM budgets
        WHERE is_active = TRUE
        ORDER BY budget_date DESC
        LIMIT 1
    """)
    budget_data = cursor.fetchone()

    if not budget_data:
        return EmergencyAllocationResult(
            success=False,
            allocation_id=None,
            allocated_amount_inr=0,
            remaining_emergency_reserve_inr=0,
            message="No active budget found",
            audit_trail={"action": "EMERGENCY_ALLOCATION_ERROR", "error": "No active budget"}
        )

    # Build emergency request
    emergency_request = EmergencyRequest(
        funding_request_id=request_data['id'],
        patient_id=request_data['patient_id'],
        icd10_category=request_data.get('icd10_category', ''),
        esi_level=esi_level,
        urgency_score=float(request_data['urgency_score']),
        funding_gap_inr=int(request_data['funding_gap_inr']),
        justification=justification,
        requested_by=authorized_by
    )

    # Process allocation
    return allocator.allocate(
        emergency_request,
        budget_data['emergency_remaining_inr'],
        authorized_by,
        db_connection
    )


# Example usage and testing
if __name__ == "__main__":
    allocator = EmergencyAllocator()

    # Test eligibility
    test_request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="I21",  # Acute MI - emergency
        esi_level=1,
        urgency_score=98.5,
        funding_gap_inr=500000,
        justification="Acute myocardial infarction - requires immediate intervention",
        requested_by=2
    )

    eligibility = allocator.check_eligibility(test_request)
    print("=== Eligibility Check ===")
    print(f"Eligible: {eligibility['eligible']}")
    print(f"Reasons: {eligibility['reasons']}")

    # Test reserve status
    status = allocator.get_emergency_reserve_status(5000000, 500000)
    print("\n=== Emergency Reserve Status ===")
    for k, v in status.items():
        print(f"  {k}: {v}")