# Panacea Vault - Data Flow Documentation

## End-to-End Data Flow

### 1. Dataset Ingestion Flow

```
CSV Files (dataset/)
    │
    ▼
validate_all.py (scripts/data_validation/)
    │  ├── Check required columns
    │  ├── Validate data types
    │  ├── Check value ranges
    │  ├── Detect duplicates
    │  ├── Verify relationships
    │  └── Generate data dictionary
    │
    ▼
seed_data.py (backend/database/seed/)
    │  ├── Diseases (from ICD_Severity.csv)
    │  ├── Procedures (from Surgery_Mapping.csv)
    │  ├── ESI Reference (from ESI_Reference.csv)
    │  ├── Treatment Packages (from Synthetic_Queue.csv)
    │  └── Synthetic Queue → Funding Requests (demo)
    │
    ▼
MySQL Database (panacea_vault)
```

### 2. Request Creation Flow

```
Doctor (UI) → Create Request Page
    │
    ▼
POST /api/funding-requests
    │  ├── Validate disease exists
    │  ├── Validate procedure exists
    │  ├── Validate hospital exists
    │  ├── Lookup treatment package cost
    │  ├── Calculate funding_gap = surgery + icu + med - surety
    │  └── Create PENDING request
    │
    ▼
POST /api/scoring/requests/{id}/calculate
    │  ├── Load request data
    │  ├── UrgencyScorer.calculate()
    │  │    ├── base_severity (from ICD)
    │  │    ├── ttc_component (from TTC category)
    │  │    ├── success_rate_component (from success_rate)
    │  │    ├── age_component (from age_factor_points_10)
    │  │    ├── waiting_boost (waiting_days × 5)
    │  │    └── emergency_component (if ESI 1-2)
    │  ├── Cap at 100
    │  └── Store UrgencyScore record
    │
    ▼
Request Status: ELIGIBLE
```

### 3. Budget Management Flow

```
Admin (UI) → POST /api/budgets
    │
    ▼
Create Budget Record
    │  ├── budget_date
    │  ├── total_daily_budget_inr
    │  ├── emergency_reserve_percent (15%)
    │  ├── emergency_reserve_inr = total × 15%
    │  ├── normal_budget_inr = total - emergency_reserve
    │  ├── normal_remaining_inr = normal_budget_inr
    │  └── emergency_remaining_inr = emergency_reserve_inr
    │
    ▼
Budget Status: ACTIVE (is_active=true)
```

### 4. Allocation Run Flow

```
Admin (UI) → POST /api/allocation/run
    │
    ▼
GET Eligible Requests
    │  ├── Status: PENDING or ELIGIBLE
    │  ├── is_emergency = false
    │  └── urgency_score > 0
    │
    ▼
Stage 1: Knapsack (0/1 DP)
    │  ├── Items: funding_requests (weight=funding_gap, value=urgency_score)
    │  ├── Capacity: budget.normal_budget_inr
    │  ├── Currency Scale: 10000 (INR → 10k units)
    │  ├── DP Algorithm: O(N × W_scaled)
    │  ├── Reconstruct selected items
    │  └── Output: selected_request_ids, total_allocated, total_urgency
    │
    ▼
Stage 2: Greedy Fallback
    │  ├── Remaining Budget = normal_budget - knapsack_allocated
    │  ├── Exclude already selected
    │  ├── Sort by value_density = urgency_score / funding_gap
    │  ├── Select while budget allows
    │  └── Output: additional selections
    │
    ▼
Create AllocationRun Record
    │  ├── knapsack_budget, knapsack_allocated, knapsack_requests
    │  ├── greedy_budget, greedy_allocated, greedy_requests
    │  ├── total_allocated, total_urgency_funded
    │  └── remaining_budget
    │
    ▼
Create AllocationResult Records
    │  ├── request_id, allocation_run_id
    │  ├── stage (KNAPSACK/GREEDY_FALLBACK)
    │  ├── allocated_amount, urgency_score
    │  └── Request Status → SELECTED
    │
    ▼
Audit Log: ALLOCATION_STARTED, KNAPSACK_COMPLETED, GREEDY_FALLBACK_COMPLETED
```

### 5. Emergency Allocation Flow

```
Doctor/Admin (UI) → POST /api/emergency/allocate
    │  (Requires ADMIN role)
    │
    ▼
Validate Emergency Eligibility
    │  ├── ESI Level 1 or 2
    │  ├── OR ICD in emergency categories (I21, I60, I61, S06, A41, J96, I71, O72, O00, T79, S36, S27)
    │  ├── OR TTC <2h
    │  └── Funding request exists, not already allocated
    │
    ▼
Check Emergency Reserve
    │  ├── Get active budget
    │  ├── Check emergency_remaining_inr >= funding_gap
    │  └── Check not already allocated
    │
    ▼
Create EmergencyAllocation Record
    │  ├── allocated_amount = funding_gap
    │  ├── budget_id, funding_request_id
    │  ├── authorized_by = current_admin
    │  ├── justification
    │  └── Update budget.emergency_remaining_inr
    │
    ▼
Update Request Status → APPROVED (emergency bypasses SELECTED)
    │
    ▼
Audit Log: EMERGENCY_ALLOCATION
```

### 6. Disbursement Flow

```
Admin (UI) → POST /api/disbursements
    │  (For SELECTED requests from allocation run)
    │
    ▼
Create Disbursement Record
    │  ├── allocation_result_id
    │  ├── amount_inr = allocated_amount
    │  ├── disbursement_type: DEMO_PAYMENT (simulated)
    │  ├── status: PENDING
    │  └── simulated_transaction_id
    │
    ▼
Update Request Status → DISBURSED
    │
    ▼
Audit Log: DISBURSEMENT_CREATED
```

### 7. Utilization Verification Flow

```
Hospital (UI) → POST /api/utilization-certificates
    │
    ▼
Create UtilizationCertificate
    │  ├── disbursement_id
    │  ├── certificate_number
    │  ├── submitted_amount_inr
    │  ├── submitted_documents (JSON)
    │  └── status: PENDING
    │
    ▼
Update Request Status → UTILIZATION_PENDING
    │
    ▼
Admin Verification → POST /api/utilization-certificates/{id}/verify
    │
    ▼
Verify Certificate
    │  ├── Check submitted_amount ≈ disbursed_amount
    │  ├── Update status: VERIFIED
    │  └── Update Request Status → VERIFIED
    │
    ▼
Audit Log: UC_SUBMITTED, UC_VERIFIED
```

### 8. Settlement Flow

```
Admin (UI) → Auto/Manual Settlement
    │
    ▼
Update Request Status → SETTLED
    │
    ▼
Audit Log: CASE_SETTLED
```

## Key Data Transformations

### Currency Scaling (Knapsack)
```
Original INR: 1,000,000
Scaled: 1,000,000 / 10,000 = 100 units
DP Table Size: O(N × 100) vs O(N × 1,000,000)
Result: Multiply back by 10,000 for actual amounts
```

### Urgency Score Calculation
```
final_score = min(100, 
    base_severity 
    + ttc_component 
    + success_rate_component 
    + age_component 
    + waiting_boost 
    + emergency_component
)
```

### Budget Split
```
total_daily_budget = X
emergency_reserve = X × 0.15
normal_budget = X × 0.85
```

## Audit Event Flow

Every significant state change creates an AuditLog entry:
```
Actor (User) + Role + Timestamp + Action + Entity + Entity_ID + Metadata + State_Transition
```

Events: USER_LOGIN, REQUEST_CREATED, SCORE_CALCULATED, ALLOCATION_STARTED, 
KNAPSACK_COMPLETED, GREEDY_FALLBACK_COMPLETED, EMERGENCY_ALLOCATION, 
ALLOCATION_APPROVED, DISBURSEMENT_CREATED, UC_SUBMITTED, UC_VERIFIED, CASE_SETTLED