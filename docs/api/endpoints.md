# Panacea Vault - API Endpoints Documentation

## Base URL
```
Development: http://localhost:8000/api
Production: https://api.panaceavault.example.com/api
```

## Authentication

All protected endpoints require JWT Bearer token:
```
Authorization: Bearer <access_token>
```

Token obtained via `POST /api/auth/login`

---

## Authentication Endpoints

### POST /api/auth/login
**User login**

**Request:**
```json
{
  "email": "doctor@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Errors:** 401 (invalid credentials), 400 (inactive user)

---

### POST /api/auth/register
**Register new user (development only - admin restricted in production)**

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "full_name": "Dr. Jane Smith",
  "role": "DOCTOR"
}
```

**Response (201):** UserResponse object

**Errors:** 400 (email exists), 403 (production restriction)

---

### GET /api/auth/me
**Get current user profile**

**Response (200):** UserResponse object

---

## User Endpoints (Auditor/Admin)

### GET /api/users
**List users with filters**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 50, max 500)
- `role` (string, optional): PATIENT, DOCTOR, HOSPITAL, ADMIN, AUDITOR, DONOR
- `is_active` (boolean, optional)

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

---

### GET /api/users/me
**Get current user profile**

**Response (200):** UserResponse object

---

### GET /api/users/{user_id}
**Get user by ID (Auditor/Admin only)**

**Response (200):** UserResponse object

---

### POST /api/users
**Create user (Admin only)**

**Request:** UserCreate object

**Response (201):** UserResponse object

---

### PATCH /api/users/{user_id}
**Update user (Admin only)**

**Request:** UserUpdate object

**Response (200):** UserResponse object

---

### DELETE /api/users/{user_id}
**Deactivate user (Admin only)**

**Response (204):** No content

---

## Hospital Endpoints

### GET /api/hospitals
**List hospitals**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 50, max 500)
- `verified_only` (boolean, default false)

**Response (200):** List of HospitalResponse objects

---

### GET /api/hospitals/{hospital_id}
**Get hospital by ID**

**Response (200):** HospitalResponse object

---

### POST /api/hospitals
**Create hospital (Admin only)**

**Request:**
```json
{
  "name": "Apollo Hospital",
  "license_number": "MH-12345",
  "address": "123 Medical District",
  "city": "Mumbai",
  "state": "Maharashtra",
  "contact_email": "admin@apollo.com",
  "contact_phone": "+91-22-12345678"
}
```

**Response (201):** HospitalResponse object

---

### PATCH /api/hospitals/{hospital_id}
**Update hospital (Admin only)**

**Request:** HospitalUpdate object

**Response (200):** HospitalResponse object

---

### POST /api/hospitals/{hospital_id}/verify
**Verify hospital (Admin only)**

**Response (200):** HospitalResponse object

---

## Reference Data Endpoints (All Authenticated Users)

### GET /api/reference/diseases
**List all diseases**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 500, max 1000)
- `department` (string, optional)

**Response (200):**
```json
[
  {
    "id": 1,
    "icd10_category": "I21",
    "description": "Acute myocardial infarction",
    "department": "Cardiology",
    "prototype_base_severity": 95,
    "source_note": "ICD terminology based on WHO..."
  }
]
```

---

### GET /api/reference/diseases/{disease_id}
**Get disease by ID**

---

### GET /api/reference/procedures
**List all procedures**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 500, max 1000)
- `department` (string, optional)

**Response (200):** List of procedure objects

---

### GET /api/reference/procedures/{procedure_id}
**Get procedure by ID**

---

### GET /api/reference/treatment-packages
**List treatment packages**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 500, max 1000)
- `disease_id` (int, optional)
- `procedure_id` (int, optional)

**Response (200):** List of treatment package objects with total_cost_inr

---

### GET /api/reference/treatment-packages/{package_id}
**Get treatment package by ID**

---

### GET /api/reference/patients
**List patients**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 100, max 500)

**Response (200):** List of patient objects

---

### GET /api/reference/patients/{patient_id}
**Get patient by ID**

---

### GET /api/reference/esi
**Get ESI reference levels**

**Response (200):**
```json
[
  {
    "esi_level": 1,
    "urgency_band": "Most urgent",
    "definition_summary": "Immediate life-saving intervention",
    "resource_concept": "Resuscitation/immediate stabilization"
  }
]
```

---

## Funding Request Endpoints

### GET /api/funding-requests
**List funding requests (role-filtered)**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 50, max 500)
- `status` (string, optional): PENDING, ELIGIBLE, SELECTED, APPROVED, etc.
- `hospital_id` (int, optional)
- `patient_id` (int, optional)
- `is_emergency` (boolean, optional)

**Role Filtering:**
- **DOCTOR**: Only own requests
- **HOSPITAL**: Requests for their hospital
- **PATIENT**: Only own requests
- **ADMIN/AUDITOR**: All requests

**Response (200):**
```json
{
  "items": [...],
  "total": 100,
  "skip": 0,
  "limit": 50
}
```

---

### POST /api/funding-requests
**Create funding request (Doctor only)**

**Request:**
```json
{
  "patient_id": 1,
  "disease_id": 5,
  "procedure_id": 3,
  "treatment_package_id": 7,
  "hospital_id": 2,
  "surgery_cost_inr": 1000000,
  "surety_amount_inr": 50000,
  "ttc_category": "2-6h",
  "success_rate": 0.85,
  "age_factor_points_10": 8,
  "is_emergency": false,
  "esi_level": null
}
```

**Response (201):** FundingRequestResponse object
- Includes calculated `funding_gap_inr` and `urgency_score`

---

### GET /api/funding-requests/{request_id}
**Get funding request by ID**

**Response (200):** FundingRequestResponse object with full details

---

### PATCH /api/funding-requests/{request_id}
**Update funding request (Doctor/Admin)**

**Request:** FundingRequestUpdate object

**Response (200):** FundingRequestResponse object

---

### POST /api/funding-requests/{request_id}/calculate-score
**Calculate and store urgency score for request (Doctor/Admin)**

**Response (200):**
```json
{
  "breakdown": {
    "base_severity": 98,
    "ttc_component": 25,
    "success_rate_component": 17.0,
    "age_component": 8,
    "waiting_boost": 0,
    "emergency_component": 0,
    "final_score": 100
  },
  "calculated_at": "2026-10-03T10:00:00Z"
}
```

---

## Scoring Endpoints

### POST /api/scoring/calculate
**Calculate urgency score from input parameters (Doctor/Admin)**

**Request:**
```json
{
  "icd10_category": "I61",
  "prototype_base_severity": 98,
  "ttc_category": "2-6h",
  "success_rate": 0.85,
  "age": 45,
  "age_factor_points_10": 8,
  "waiting_days": 0,
  "is_emergency": false,
  "esi_level": null
}
```

**Response (200):**
```json
{
  "breakdown": {
    "base_severity": 98,
    "ttc_component": 25,
    "success_rate_component": 17.0,
    "age_component": 8,
    "waiting_boost": 0,
    "emergency_component": 0,
    "final_score": 100
  },
  "calculated_at": "2026-10-03T10:00:00Z"
}
```

---

### POST /api/scoring/requests/{request_id}/calculate
**Calculate and store urgency score for existing request (Doctor/Admin)**

**Response (200):** ScoreResponse object (same as above)

---

## Allocation Endpoints (Admin Only)

### POST /api/allocation/run
**Run allocation (Knapsack + Greedy Fallback)**

**Request:**
```json
{
  "budget_id": 1
}
```

**Response (200):**
```json
{
  "id": 1,
  "run_code": "ALLOC-20261003-001",
  "budget_id": 1,
  "total_requests": 150,
  "eligible_requests": 120,
  "selected_requests": 45,
  "total_allocated_inr": 25000000,
  "total_urgency_funded": 3850.5,
  "knapsack_budget_inr": 30000000,
  "knapsack_allocated_inr": 22000000,
  "knapsack_requests": 35,
  "greedy_budget_inr": 8000000,
  "greedy_allocated_inr": 3000000,
  "greedy_requests": 10,
  "emergency_budget_inr": 0,
  "emergency_allocated_inr": 0,
  "emergency_requests": 0,
  "remaining_budget_inr": 5000000,
  "status": "COMPLETED",
  "started_at": "2026-10-03T10:00:00Z",
  "completed_at": "2026-10-03T10:00:05Z"
}
```

---

### GET /api/allocation/runs/{run_id}
**Get allocation run details**

**Response (200):** AllocationRunResponse with results

---

### GET /api/allocation/results
**List allocation results**

**Query Parameters:**
- `run_id` (int, optional): Filter by allocation run
- `stage` (string, optional): KNAPSACK, GREEDY_FALLBACK, EMERGENCY
- `skip` (int, default 0)
- `limit` (int, default 100, max 500)

**Response (200):** List of AllocationResultResponse objects

---

### GET /api/allocation/details/{request_id}
**Get allocation details for a specific request**

**Response (200):**
```json
{
  "request_id": 123,
  "request_code": "REQ-000123",
  "patient_id": 5,
  "urgency_score": 92.5,
  "funding_gap_inr": 800000,
  "allocation_run_id": 1,
  "stage": "KNAPSACK",
  "allocated_amount_inr": 800000,
  "selected": true,
  "score_breakdown": {...}
}
```

---

## Emergency Endpoints (Admin Only)

### POST /api/emergency/allocate
**Process emergency allocation from reserve**

**Request:**
```json
{
  "funding_request_id": 123,
  "justification": "Patient deteriorating, needs immediate neurosurgery",
  "esi_level": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "allocation_id": 5,
  "allocated_amount_inr": 2500000,
  "remaining_emergency_reserve_inr": 12500000,
  "message": "Emergency allocation approved",
  "audit_trail": {...}
}
```

---

### GET /api/emergency/reserve
**Get emergency reserve status**

**Response (200):**
```json
{
  "total_daily_budget_inr": 100000000,
  "emergency_reserve_inr": 15000000,
  "emergency_remaining_inr": 12500000,
  "emergency_allocated_count": 2,
  "emergency_allocated_total_inr": 2500000
}
```

---

### GET /api/emergency/allocations
**List emergency allocations**

**Query Parameters:**
- `budget_id` (int, optional)
- `skip` (int, default 0)
- `limit` (int, default 50, max 500)

**Response (200):** List of emergency allocation objects

---

## Dashboard Endpoints (All Authenticated)

### GET /api/dashboard/summary
**Get dashboard summary metrics**

**Response (200):**
```json
{
  "total_budget_inr": 100000000,
  "allocated_amount_inr": 65000000,
  "remaining_budget_inr": 35000000,
  "treatment_packages_funded": 120,
  "emergency_allocations": 5,
  "utilization_rate": 0.85,
  "settlement_rate": 0.72
}
```

---

### GET /api/dashboard/flow
**Get allocation flow data for Sankey diagram**

**Response (200):**
```json
{
  "nodes": [
    {"id": "total_budget", "label": "Total Budget", "value": 100000000, "percentage": 100},
    {"id": "emergency_reserve", "label": "Emergency Reserve (15%)", "value": 15000000, "percentage": 15},
    {"id": "normal_allocation", "label": "Normal Allocation (85%)", "value": 85000000, "percentage": 85},
    {"id": "selected_packages", "label": "Selected Packages", "value": 65000000, "percentage": 65},
    {"id": "hospital_disbursement", "label": "Hospital Disbursement", "value": 60000000, "percentage": 60},
    {"id": "settled", "label": "Settled", "value": 45000000, "percentage": 45}
  ],
  "links": [
    {"source": "total_budget", "target": "emergency_reserve", "value": 15000000},
    {"source": "total_budget", "target": "normal_allocation", "value": 85000000},
    {"source": "normal_allocation", "target": "selected_packages", "value": 65000000},
    {"source": "emergency_reserve", "target": "selected_packages", "value": 2500000},
    {"source": "selected_packages", "target": "hospital_disbursement", "value": 60000000},
    {"source": "hospital_disbursement", "target": "settled", "value": 45000000}
  ]
}
```

---

### GET /api/dashboard/allocation-breakdown
**Get allocation breakdown by department/status**

**Response (200):** Aggregated data for stacked bar charts

---

## Budget Endpoints (Admin Only)

### POST /api/budgets
**Create new daily budget**

**Request:**
```json
{
  "budget_date": "2026-10-03",
  "total_daily_budget_inr": 100000000,
  "emergency_reserve_percent": 15.0
}
```

**Response (201):** Budget object with computed fields

---

### GET /api/budgets/current
**Get current active budget**

**Response (200):** Budget object

---

### GET /api/budgets
**List all budgets**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 50, max 100)

---

## Disbursement Endpoints (Admin/Hospital)

### POST /api/disbursements
**Create disbursement for approved allocation (Admin)**

**Request:**
```json
{
  "allocation_result_id": 10,
  "amount_inr": 800000,
  "disbursement_type": "DEMO_PAYMENT"
}
```

**Response (201):** Disbursement object

---

### GET /api/disbursements
**List disbursements**

---

### POST /api/disbursements/{disbursement_id}/complete
**Mark disbursement as completed (simulated)**

**Response (200):** Updated disbursement object

---

## Utilization Certificate Endpoints

### POST /api/utilization-certificates
**Submit utilization certificate (Hospital)**

**Request:**
```json
{
  "disbursement_id": 5,
  "certificate_number": "UC-2026-001",
  "submitted_amount_inr": 800000,
  "submitted_documents": {
    "invoice_ref": "INV-12345",
    "discharge_summary": "base64_encoded_pdf"
  }
}
```

**Response (201):** UtilizationCertificate object

---

### POST /api/utilization-certificates/{certificate_id}/verify
**Verify utilization certificate (Admin)**

**Request:**
```json
{
  "verified": true,
  "rejection_reason": null
}
```

**Response (200):** Updated UtilizationCertificate object

---

### GET /api/utilization-certificates
**List utilization certificates**

---

## Audit Endpoints (Auditor/Admin)

### GET /api/audit
**List audit logs with filters**

**Query Parameters:**
- `skip` (int, default 0)
- `limit` (int, default 100, max 1000)
- `actor_id` (int, optional)
- `action` (string, optional): USER_LOGIN, REQUEST_CREATED, etc.
- `entity_type` (string, optional)
- `entity_id` (string, optional)
- `start_date` (datetime, optional)
- `end_date` (datetime, optional)

**Response (200):** List of AuditLogResponse objects

---

### GET /api/audit/{log_id}
**Get audit log by ID**

---

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error description"
}
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 422 | Unprocessable Entity (validation) |
| 500 | Internal Server Error |

---

## Role-Based Access Summary

| Endpoint | PATIENT | DOCTOR | HOSPITAL | ADMIN | AUDITOR | DONOR |
|----------|---------|--------|----------|-------|---------|-------|
| /auth/* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /users/me | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /users/* | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| /hospitals (GET) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /hospitals (POST/PATCH) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /reference/* | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /funding-requests (GET) | Own | Own | Hospital | All | All | ❌ |
| /funding-requests (POST) | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| /scoring/* | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| /allocation/* | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /emergency/* | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /dashboard/* | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /budgets/* | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| /disbursements/* | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| /utilization-certificates (POST) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| /utilization-certificates (verify) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /audit/* | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## Rate Limiting

Not currently implemented. Recommended for production:
- 100 requests/minute per IP
- 1000 requests/hour per user

---

## Pagination

All list endpoints support:
- `skip`: Number of records to skip
- `limit`: Max records to return (max 500)

Response format:
```json
{
  "items": [...],
  "total": 1000,
  "skip": 0,
  "limit": 50
}
```

---

## Versioning

Current version: v1
Path prefix: `/api` (implicit v1)

Future versions: `/api/v2/`