# Panacea Vault - Emergency Reserve Allocation Documentation

## Overview

The Emergency Reserve Allocation system handles urgent, life-threatening cases that cannot wait for the normal batch allocation cycle. It reserves 15% of the daily budget for emergency cases and requires explicit ADMIN authorization.

## Emergency Reserve Configuration

### Budget Split

```
Total Daily Budget: 100%
    │
    ├── Normal Budget: 85%  → Knapsack + Greedy allocation
    │
    └── Emergency Reserve: 15%  → Emergency Allocator (separate)
```

### Constants

| Parameter | Default | Description |
|-----------|---------|-------------|
| EMERGENCY_RESERVE_PERCENT | 15.0 | % of daily budget reserved |
| EMERGENCY_ESI_LEVELS | {1, 2} | ESI levels qualifying for emergency |
| EMERGENCY_ICD_CATEGORIES | Set of 13 codes | Life-threatening ICD categories |

## Emergency Eligibility Criteria

A request qualifies for emergency allocation if **ANY** of the following:

### 1. ESI Level Critical (Primary)
```python
EMERGENCY_ESI_LEVELS = {1, 2}
# ESI 1: Immediate life-saving intervention
# ESI 2: High-risk/severe distress/time-sensitive
```

### 2. Life-Threatening ICD Categories
```python
EMERGENCY_ICD_CATEGORIES = {
    'I21',   # Acute myocardial infarction
    'I60',   # Subarachnoid hemorrhage
    'I61',   # Intracerebral hemorrhage
    'S06',   # Intracranial injury
    'A41',   # Sepsis
    'J96',   # Respiratory failure
    'I71',   # Aortic aneurysm/dissection
    'O72',   # Postpartum hemorrhage
    'O00',   # Ectopic pregnancy
    'T79',   # Traumatic shock
    'S36',   # Intra-abdominal organ injury
    'S27',   # Thoracic injury
}
```

### 3. Time-Critical (TTC <2h)
```python
# TTC category "<2h" = 30 points = immediate treatment needed
# Covered by ESI check usually, but explicit for completeness
```

## Emergency Request Structure

```python
@dataclass
class EmergencyRequest:
    funding_request_id: int     # Database ID of funding request
    patient_id: int
    icd10_category: str         # e.g., "I61"
    esi_level: int              # 1 or 2
    urgency_score: float        # Pre-calculated urgency score
    funding_gap_inr: int        # Amount needed
    justification: str          # Doctor/admin justification
    requested_by: int           # User ID of requester
```

## Allocation Process

### 1. Request Submission (Doctor/Admin)
```
POST /api/emergency/allocate
{
    "funding_request_id": 123,
    "justification": "Patient deteriorating, needs immediate neurosurgery",
    "esi_level": 1
}
```
**Requires**: ADMIN role (authorization)

### 2. Validation Checks
```
□ Funding request exists
□ Request not already allocated (normal or emergency)
□ Request is_emergency = true or meets eligibility criteria
□ Active budget exists
□ Emergency reserve has sufficient funds
```

### 3. Emergency Allocator Logic

```python
class EmergencyAllocator:
    def __init__(self, daily_budget_inr: int, reserve_percent: float = 15.0):
        self.total_budget = daily_budget_inr
        self.reserve_percent = reserve_percent
        self.emergency_reserve = int(daily_budget_inr * reserve_percent / 100)
        self.allocated_emergency = 0  # Track from DB
    
    def allocate(self, request: EmergencyRequest, db: Session) -> EmergencyAllocationResult:
        # 1. Check eligibility
        if not self._is_eligible(request):
            return EmergencyAllocationResult(
                success=False,
                message="Request does not meet emergency criteria"
            )
        
        # 2. Check reserve availability
        remaining = self.emergency_reserve - self.allocated_emergency
        if request.funding_gap_inr > remaining:
            return EmergencyAllocationResult(
                success=False,
                message=f"Insufficient emergency reserve: {remaining} available, {request.funding_gap_inr} needed"
            )
        
        # 3. Create allocation record
        allocation = EmergencyAllocation(
            budget_id=active_budget.id,
            funding_request_id=request.funding_request_id,
            allocated_amount_inr=request.funding_gap_inr,
            justification=request.justification,
            authorized_by=request.requested_by
        )
        db.add(allocation)
        
        # 4. Update budget remaining
        active_budget.emergency_remaining_inr -= request.funding_gap_inr
        
        # 5. Update request status (bypasses SELECTED)
        funding_request.status = RequestStatus.APPROVED
        funding_request.is_emergency = True
        
        # 6. Audit log
        audit = AuditLog(
            actor_id=request.requested_by,
            actor_role="ADMIN",
            action="EMERGENCY_ALLOCATION",
            entity_type="funding_request",
            entity_id=str(request.funding_request_id),
            metadata={
                "esi_level": request.esi_level,
                "icd10": request.icd10_category,
                "amount": request.funding_gap_inr,
                "justification": request.justification
            },
            from_state="ELIGIBLE",
            to_state="APPROVED"
        )
        db.add(audit)
        
        db.commit()
        
        return EmergencyAllocationResult(
            success=True,
            allocation_id=allocation.id,
            allocated_amount_inr=request.funding_gap_inr,
            remaining_emergency_reserve_inr=active_budget.emergency_remaining_inr,
            message="Emergency allocation approved"
        )
    
    def _is_eligible(self, request: EmergencyRequest) -> bool:
        # Check ESI
        if request.esi_level in EMERGENCY_ESI_LEVELS:
            return True
        
        # Check ICD
        if request.icd10_category in EMERGENCY_ICD_CATEGORIES:
            return True
        
        return False
```

## Database Updates

### EmergencyAllocation Table
```sql
INSERT INTO emergency_allocations (
    budget_id, funding_request_id, allocated_amount_inr,
    justification, authorized_by
) VALUES (?, ?, ?, ?, ?);
```

### Budget Table Update
```sql
UPDATE budgets 
SET emergency_remaining_inr = emergency_remaining_inr - ?
WHERE id = ?;
```

### FundingRequest Table Update
```sql
UPDATE funding_requests 
SET status = 'APPROVED', is_emergency = TRUE
WHERE id = ?;
```

## Audit Trail

### Emergency Allocation Event
```json
{
  "actor_id": 5,
  "actor_role": "ADMIN",
  "action": "EMERGENCY_ALLOCATION",
  "entity_type": "funding_request",
  "entity_id": "123",
  "metadata": {
    "esi_level": 1,
    "icd10": "I61",
    "allocated_amount_inr": 2500000,
    "justification": "Patient deteriorating, needs immediate neurosurgery",
    "emergency_reserve_before": 15000000,
    "emergency_reserve_after": 12500000
  },
  "from_state": "ELIGIBLE",
  "to_state": "APPROVED",
  "created_at": "2026-10-03T10:30:00Z"
}
```

## Comparison: Normal vs Emergency

| Aspect | Normal Allocation | Emergency Allocation |
|--------|-------------------|---------------------|
| Budget Source | Normal (85%) | Emergency Reserve (15%) |
| Algorithm | Knapsack + Greedy | Direct authorization |
| Timing | Batch (daily) | On-demand |
| Authorization | Admin runs allocation | Admin authorizes specific case |
| Request Status Path | PENDING→ELIGIBLE→SELECTED→APPROVED | ELIGIBLE→APPROVED |
| Wait Time | Next allocation run | Immediate |
| Audit | ALLOCATION_STARTED, etc. | EMERGENCY_ALLOCATION |

## Reserve Management

### Tracking
```python
# In Budget model
emergency_reserve_inr = total_daily_budget_inr * 15 / 100  # Computed
emergency_remaining_inr = emergency_reserve_inr - SUM(emergency_allocations.allocated_amount_inr)
```

### Replenishment
- Emergency reserve resets daily with new budget
- Unused emergency reserve does NOT roll over to normal budget
- New budget created each day by admin

## Integration Points

### API Endpoint
```
POST /api/emergency/allocate  (ADMIN only)
GET  /api/emergency/reserve   (View remaining reserve)
```

### Frontend
- EmergencyPage.tsx: Admin interface for emergency allocations
- Shows remaining reserve, eligible requests, allocation history

### Allocation Run
- Emergency allocations excluded from normal Knapsack/Greedy
- AllocationRun.emergency_* fields track emergency separately
- Dashboard shows emergency vs normal metrics

## Testing

### Unit Tests Needed
- Eligibility: ESI 1, ESI 2, ESI 3 (not eligible)
- Eligibility: Emergency ICD categories
- Eligibility: TTC <2h
- Reserve check: sufficient, insufficient
- Duplicate allocation prevention
- Budget remaining update
- Audit log creation

### Test Command
```bash
python -m pytest dsa-engine/tests/test_emergency.py -v
```

## Configuration

| Setting | Default | Location |
|---------|---------|----------|
| EMERGENCY_RESERVE_PERCENT | 15.0 | config.py / .env |
| EMERGENCY_ESI_LEVELS | {1, 2} | emergency_allocator.py |
| EMERGENCY_ICD_CATEGORIES | 13 codes | emergency_allocator.py |

## Limitations & Future Improvements

1. **Fixed 15%**: Not configurable per-day; could be dynamic based on demand
2. **No Auto-Approval**: Requires manual admin action; could add rules engine
3. **Single Reserve**: One reserve for all emergencies; could have tiers
4. **No Partial Allocation**: All-or-nothing; could allow partial if reserve low
5. **Future**: ML triage to pre-screen emergency eligibility
6. **Future**: Integration with hospital EHR for real-time ESI

## Security Considerations

- Only ADMIN role can authorize emergency allocations
- All emergency allocations create immutable audit records
- Justification field required and audited
- Emergency reserve tracked separately from normal budget
- Cannot exceed 15% of daily budget