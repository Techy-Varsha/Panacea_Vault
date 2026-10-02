#!/usr/bin/env python3
"""
Unit tests for Emergency Allocator
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from emergency.emergency_allocator import EmergencyAllocator, EmergencyRequest, EmergencyEligibility


def test_eligibility_esi_critical():
    """Test eligibility for ESI level 1-2"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="K35",
        esi_level=1,
        urgency_score=80.0,
        funding_gap_inr=500000,
        justification="Test",
        requested_by=1
    )
    result = allocator.check_eligibility(request)
    assert result["eligible"] is True
    assert any("ESI Level 1" in r for r in result["reasons"])

    request.esi_level = 2
    result = allocator.check_eligibility(request)
    assert result["eligible"] is True
    assert any("ESI Level 2" in r for r in result["reasons"])
    print("✓ test_eligibility_esi_critical passed")


def test_eligibility_life_threatening_icd():
    """Test eligibility for life-threatening ICD categories"""
    allocator = EmergencyAllocator()
    emergency_icds = ['I21', 'I60', 'I61', 'S06', 'A41', 'J96', 'I71', 'O72', 'O00', 'T79', 'S36', 'S27']

    for icd in emergency_icds:
        request = EmergencyRequest(
            funding_request_id=1,
            patient_id=1,
            icd10_category=icd,
            esi_level=3,  # Not ESI critical
            urgency_score=80.0,
            funding_gap_inr=500000,
            justification="Test",
            requested_by=1
        )
        result = allocator.check_eligibility(request)
        assert result["eligible"] is True, f"ICD {icd} should be eligible"
        assert any(icd in r for r in result["reasons"]), f"Reason should mention {icd}"
    print("✓ test_eligibility_life_threatening_icd passed")


def test_eligibility_high_urgency():
    """Test eligibility for very high urgency score"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="K35",  # Not emergency ICD
        esi_level=3,  # Not ESI critical
        urgency_score=95.0,  # High urgency
        funding_gap_inr=500000,
        justification="Test",
        requested_by=1
    )
    result = allocator.check_eligibility(request)
    assert result["eligible"] is True
    assert any("95.0" in r or "urgency" in r.lower() for r in result["reasons"])
    print("✓ test_eligibility_high_urgency passed")


def test_eligibility_not_eligible():
    """Test non-eligible request"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="N39",  # Not emergency
        esi_level=4,  # Not critical
        urgency_score=50.0,  # Low urgency
        funding_gap_inr=500000,
        justification="Test",
        requested_by=1
    )
    result = allocator.check_eligibility(request)
    assert result["eligible"] is False
    print("✓ test_eligibility_not_eligible passed")


def test_allocate_success():
    """Test successful emergency allocation"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="I21",
        esi_level=1,
        urgency_score=98.0,
        funding_gap_inr=500000,
        justification="Acute MI - immediate intervention required",
        requested_by=2
    )
    result = allocator.allocate(request, available_emergency_reserve_inr=1000000, authorized_by=3)

    assert result.success is True
    assert result.allocated_amount_inr == 500000
    assert result.remaining_emergency_reserve_inr == 500000
    assert result.allocation_id is not None
    assert "approved" in result.message.lower()
    print("✓ test_allocate_success passed")


def test_allocate_insufficient_reserve():
    """Test allocation with insufficient reserve"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="I21",
        esi_level=1,
        urgency_score=98.0,
        funding_gap_inr=1500000,
        justification="Acute MI",
        requested_by=2
    )
    result = allocator.allocate(request, available_emergency_reserve_inr=1000000, authorized_by=3)

    assert result.success is False
    assert result.allocated_amount_inr == 0
    assert result.remaining_emergency_reserve_inr == 1000000
    assert "insufficient" in result.message.lower()
    print("✓ test_allocate_insufficient_reserve passed")


def test_allocate_not_eligible():
    """Test allocation for non-eligible request"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="N39",
        esi_level=4,
        urgency_score=50.0,
        funding_gap_inr=500000,
        justification="Routine",
        requested_by=2
    )
    result = allocator.allocate(request, available_emergency_reserve_inr=1000000, authorized_by=3)

    assert result.success is False
    assert "eligibility" in result.message.lower()
    print("✓ test_allocate_not_eligible passed")


def test_reserve_status():
    """Test emergency reserve status calculation"""
    allocator = EmergencyAllocator(emergency_reserve_percent=15.0)
    status = allocator.get_emergency_reserve_status(5000000, 500000)

    assert status["total_daily_budget_inr"] == 5000000
    assert status["emergency_reserve_percent"] == 15.0
    assert status["emergency_reserve_inr"] == 750000
    assert status["allocated_emergency_inr"] == 500000
    assert status["remaining_emergency_reserve_inr"] == 250000
    assert status["utilization_pct"] == 66.67
    print("✓ test_reserve_status passed")


def test_audit_trail():
    """Test that audit trail is created"""
    allocator = EmergencyAllocator()
    request = EmergencyRequest(
        funding_request_id=1,
        patient_id=1,
        icd10_category="I21",
        esi_level=1,
        urgency_score=98.0,
        funding_gap_inr=500000,
        justification="Acute MI",
        requested_by=2
    )
    result = allocator.allocate(request, available_emergency_reserve_inr=1000000, authorized_by=3)

    audit = result.audit_trail
    assert audit["action"] == "EMERGENCY_ALLOCATION"
    assert audit["allocation_id"] is not None
    assert audit["funding_request_id"] == 1
    assert audit["allocated_amount_inr"] == 500000
    assert audit["authorized_by"] == 3
    assert "justification" in audit
    assert "timestamp" in audit
    assert "remaining_emergency_reserve_inr" in audit
    print("✓ test_audit_trail passed")


if __name__ == "__main__":
    test_eligibility_esi_critical()
    test_eligibility_life_threatening_icd()
    test_eligibility_high_urgency()
    test_eligibility_not_eligible()
    test_allocate_success()
    test_allocate_insufficient_reserve()
    test_allocate_not_eligible()
    test_reserve_status()
    test_audit_trail()
    print("\n✅ All emergency tests passed!")