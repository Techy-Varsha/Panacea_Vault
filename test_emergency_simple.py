import sys
sys.path.insert(0, 'D:/Panacea_Vault/dsa-engine')
from emergency.emergency_allocator import EmergencyAllocator, EmergencyRequest, EmergencyEligibility

# Test eligibility for ESI critical (level 1-2)
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
print('test_eligibility_esi_1 passed')

request.esi_level = 2
result = allocator.check_eligibility(request)
assert result["eligible"] is True
assert any("ESI Level 2" in r for r in result["reasons"])
print('test_eligibility_esi_2 passed')

# Test eligibility for life-threatening ICD categories
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
print('test_eligibility_life_threatening_icd passed')

# Test non-emergency cases
request = EmergencyRequest(
    funding_request_id=1,
    patient_id=1,
    icd10_category="K35",  # Appendicitis - not life-threatening
    esi_level=3,
    urgency_score=70.0,
    funding_gap_inr=500000,
    justification="Test",
    requested_by=1
)
result = allocator.check_eligibility(request)
assert result["eligible"] is False
print('test_non_emergency_ineligible passed')

# Test high urgency score eligibility
request = EmergencyRequest(
    funding_request_id=1,
    patient_id=1,
    icd10_category="K35",
    esi_level=3,
    urgency_score=95.0,  # High urgency
    funding_gap_inr=500000,
    justification="Test",
    requested_by=1
)
result = allocator.check_eligibility(request)
assert result["eligible"] is True
assert any("urgency score" in r.lower() for r in result["reasons"])
print('test_high_urgency_eligibility passed')

# Test allocation with reserve
request = EmergencyRequest(
    funding_request_id=1,
    patient_id=1,
    icd10_category="I61",
    esi_level=1,
    urgency_score=90.0,
    funding_gap_inr=300000,
    justification="Critical stroke case",
    requested_by=1
)
result = allocator.allocate(request, available_emergency_reserve_inr=5000000, authorized_by=1)
assert result.success is True
assert result.allocated_amount_inr == 300000
assert result.remaining_emergency_reserve_inr == 4700000
print('test_allocation passed')

# Test allocation exceeds reserve
request = EmergencyRequest(
    funding_request_id=2,
    patient_id=2,
    icd10_category="I21",
    esi_level=1,
    urgency_score=95.0,
    funding_gap_inr=6000000,  # More than reserve
    justification="Critical MI case",
    requested_by=1
)
result = allocator.allocate(request, available_emergency_reserve_inr=5000000, authorized_by=1)
assert result.success is False
assert "insufficient" in result.message.lower()
print('test_allocation_exceeds_reserve passed')

# Test reserve depletion
request1 = EmergencyRequest(
    funding_request_id=1,
    patient_id=1,
    icd10_category="I61",
    esi_level=1,
    urgency_score=90.0,
    funding_gap_inr=300000,
    justification="Case 1",
    requested_by=1
)
result1 = allocator.allocate(request1, available_emergency_reserve_inr=500000, authorized_by=1)
assert result1.success is True

request2 = EmergencyRequest(
    funding_request_id=2,
    patient_id=2,
    icd10_category="I21",
    esi_level=1,
    urgency_score=95.0,
    funding_gap_inr=300000,
    justification="Case 2",
    requested_by=1
)
result2 = allocator.allocate(request2, available_emergency_reserve_inr=200000, authorized_by=1)  # Only 200k left
assert result2.success is False
print('test_reserve_depletion passed')

# Test audit trail
request = EmergencyRequest(
    funding_request_id=1,
    patient_id=1,
    icd10_category="I61",
    esi_level=1,
    urgency_score=90.0,
    funding_gap_inr=300000,
    justification="Test audit",
    requested_by=1
)
result = allocator.allocate(request, available_emergency_reserve_inr=5000000, authorized_by=1)
assert "allocation_id" in result.audit_trail
assert "timestamp" in result.audit_trail
assert "funding_request_id" in result.audit_trail
assert "patient_id" in result.audit_trail
assert "allocated_amount_inr" in result.audit_trail
assert "authorized_by" in result.audit_trail
assert result.audit_trail["funding_request_id"] == 1
assert result.audit_trail["patient_id"] == 1
assert result.audit_trail["authorized_by"] == 1
print('test_audit_trail passed')

print('All emergency tests passed!')