# Panacea Vault - Database Schema Documentation

## Overview

MySQL 8.0+ database schema for Panacea Vault medical crowdfunding allocation system.

## Entity Relationship Diagram

```
users ──────────────┬────────────── roles
    │               │
    │               ├── created_budgets ─── budgets ───┬─── allocation_runs
    │               │                                 │         │
    │               │                                 │         └─── allocation_results
    │               │                                 │                   │
    │               │                                 │                   └─── funding_requests
    │               │                                 │                         │
    │               ├── funding_requests (doctor)     │                         │
    │               │                                 │                         ├── patient
    │               │                                 │                         ├── disease
    │               │                                 │                         ├── procedure
    │               │                                 │                         ├── treatment_package
    │               │                                 │                         ├── hospital
    │               │                                 │                         │
    │               │                                 │                         ├── urgency_scores
    │               │                                 │                         ├── emergency_allocations
    │               │                                 │                         ├── disbursements
    │               │                                 │                         │      │
    │               │                                 │                         │      └─── utilization_certificates
    │               │                                 │                         │
    │               └── allocation_runs (executor)    │                         │
                                                      │                         │
hospitals ──────────────────────────────────────────────┘                         │
                                                                                  │
patients ────────────────────────────────────────────────────────────────────────┘
    │
    └─── user (PATIENT role)
```

## Table Definitions

### 1. roles
```sql
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,  -- PATIENT, DOCTOR, HOSPITAL, ADMIN, AUDITOR, DONOR
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. users
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt
    full_name VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_email (email),
    INDEX idx_role_id (role_id)
);
```

### 3. hospitals
```sql
CREATE TABLE hospitals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_license (license_number),
    INDEX idx_verified (is_verified)
);
```

### 4. patients
```sql
CREATE TABLE patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,  -- If patient has portal access
    patient_code VARCHAR(50) UNIQUE NOT NULL,  -- PV00001 format
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    age INT,
    gender ENUM('M', 'F', 'O'),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_patient_code (patient_code)
);
```

### 5. diseases
```sql
CREATE TABLE diseases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    icd10_category VARCHAR(20) UNIQUE NOT NULL,  -- I21, I61, etc.
    description VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    prototype_base_severity INT NOT NULL,  -- 1-100 from ICD_Severity.csv
    source_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_icd10 (icd10_category),
    INDEX idx_department (department)
);
```

### 6. procedures
```sql
CREATE TABLE procedures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department VARCHAR(100) NOT NULL,
    surgery_name VARCHAR(255) NOT NULL,
    example_icd10_pcs_code VARCHAR(20),  -- 0DTJ0ZZ format
    source_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_department (department),
    INDEX idx_surgery_name (surgery_name)
);
```

### 7. treatment_packages
```sql
CREATE TABLE treatment_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    package_code VARCHAR(50) UNIQUE NOT NULL,
    disease_id INT NOT NULL,
    procedure_id INT NOT NULL,
    surgery_cost_inr DECIMAL(15,2) NOT NULL,
    icu_cost_inr DECIMAL(15,2) NOT NULL DEFAULT 0,
    medication_cost_inr DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost_inr DECIMAL(15,2) GENERATED ALWAYS AS 
        (surgery_cost_inr + icu_cost_inr + medication_cost_inr) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (disease_id) REFERENCES diseases(id),
    FOREIGN KEY (procedure_id) REFERENCES procedures(id),
    INDEX idx_package_code (package_code),
    INDEX idx_disease (disease_id),
    INDEX idx_procedure (procedure_id)
);
```

### 8. budgets
```sql
CREATE TABLE budgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    budget_date DATE UNIQUE NOT NULL,
    total_daily_budget_inr DECIMAL(15,2) NOT NULL,
    emergency_reserve_percent DECIMAL(5,2) DEFAULT 15.00,
    emergency_reserve_inr DECIMAL(15,2) 
        GENERATED ALWAYS AS (total_daily_budget_inr * emergency_reserve_percent / 100) STORED,
    normal_budget_inr DECIMAL(15,2) 
        GENERATED ALWAYS AS (total_daily_budget_inr - (total_daily_budget_inr * emergency_reserve_percent / 100)) STORED,
    normal_remaining_inr DECIMAL(15,2) DEFAULT 0,
    emergency_remaining_inr DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_budget_date (budget_date),
    INDEX idx_active (is_active)
);
```

### 9. funding_requests
```sql
CREATE TABLE funding_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    disease_id INT NOT NULL,
    procedure_id INT NOT NULL,
    treatment_package_id INT NOT NULL,
    hospital_id INT NOT NULL,
    requesting_doctor_id INT NOT NULL,
    surgery_cost_inr DECIMAL(15,2) NOT NULL,
    surety_amount_inr DECIMAL(15,2) NOT NULL,
    funding_gap_inr DECIMAL(15,2) NOT NULL,  -- total_cost - surety
    urgency_score DECIMAL(10,2) NOT NULL,
    ttc_category VARCHAR(20),  -- <2h, 2-6h, 1-3d, 3-7d, 7d+
    ttc_points INT,
    success_rate DECIMAL(5,4),
    success_rate_points DECIMAL(5,2),
    age_factor_points INT,
    waiting_days INT DEFAULT 0,
    waiting_boost INT DEFAULT 0,
    is_emergency BOOLEAN DEFAULT FALSE,
    esi_level INT,
    status ENUM(
        'PENDING', 'ELIGIBLE', 'SELECTED', 'APPROVED', 'DISBURSED',
        'UTILIZATION_PENDING', 'VERIFIED', 'SETTLED', 'REJECTED', 'EXPIRED'
    ) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (disease_id) REFERENCES diseases(id),
    FOREIGN KEY (procedure_id) REFERENCES procedures(id),
    FOREIGN KEY (treatment_package_id) REFERENCES treatment_packages(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (requesting_doctor_id) REFERENCES users(id),
    INDEX idx_request_code (request_code),
    INDEX idx_status (status),
    INDEX idx_patient (patient_id),
    INDEX idx_hospital (hospital_id),
    INDEX idx_doctor (requesting_doctor_id),
    INDEX idx_emergency (is_emergency),
    INDEX idx_urgency_score (urgency_score)
);
```

### 10. urgency_scores
```sql
CREATE TABLE urgency_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    funding_request_id INT NOT NULL UNIQUE,
    base_severity INT NOT NULL,
    ttc_component INT NOT NULL,
    success_rate_component DECIMAL(5,2) NOT NULL,
    age_component INT NOT NULL,
    waiting_boost INT NOT NULL DEFAULT 0,
    emergency_component INT NOT NULL DEFAULT 0,
    final_score DECIMAL(10,2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by INT,
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    FOREIGN KEY (calculated_by) REFERENCES users(id),
    INDEX idx_request (funding_request_id)
);
```

### 11. allocation_runs
```sql
CREATE TABLE allocation_runs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_code VARCHAR(50) UNIQUE NOT NULL,
    budget_id INT NOT NULL,
    total_requests INT DEFAULT 0,
    eligible_requests INT DEFAULT 0,
    selected_requests INT DEFAULT 0,
    total_allocated_inr DECIMAL(15,2) DEFAULT 0,
    total_urgency_funded DECIMAL(15,2) DEFAULT 0,
    knapsack_budget_inr DECIMAL(15,2) DEFAULT 0,
    knapsack_allocated_inr DECIMAL(15,2) DEFAULT 0,
    knapsack_requests INT DEFAULT 0,
    greedy_budget_inr DECIMAL(15,2) DEFAULT 0,
    greedy_allocated_inr DECIMAL(15,2) DEFAULT 0,
    greedy_requests INT DEFAULT 0,
    emergency_budget_inr DECIMAL(15,2) DEFAULT 0,
    emergency_allocated_inr DECIMAL(15,2) DEFAULT 0,
    emergency_requests INT DEFAULT 0,
    remaining_budget_inr DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    executed_by INT NOT NULL,
    FOREIGN KEY (budget_id) REFERENCES budgets(id),
    FOREIGN KEY (executed_by) REFERENCES users(id),
    INDEX idx_run_code (run_code),
    INDEX idx_budget (budget_id),
    INDEX idx_started (started_at)
);
```

### 12. allocation_results
```sql
CREATE TABLE allocation_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    allocation_run_id INT NOT NULL,
    funding_request_id INT NOT NULL,
    stage ENUM('KNAPSACK', 'GREEDY_FALLBACK', 'EMERGENCY') NOT NULL,
    allocated_amount_inr DECIMAL(15,2) NOT NULL,
    urgency_score DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (allocation_run_id) REFERENCES allocation_runs(id),
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    INDEX idx_run (allocation_run_id),
    INDEX idx_request (funding_request_id),
    INDEX idx_stage (stage),
    UNIQUE KEY uk_run_request (allocation_run_id, funding_request_id)
);
```

### 13. emergency_allocations
```sql
CREATE TABLE emergency_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    budget_id INT NOT NULL,
    funding_request_id INT NOT NULL UNIQUE,
    allocated_amount_inr DECIMAL(15,2) NOT NULL,
    justification TEXT NOT NULL,
    authorized_by INT NOT NULL,
    authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id),
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    FOREIGN KEY (authorized_by) REFERENCES users(id),
    INDEX idx_budget (budget_id),
    INDEX idx_request (funding_request_id)
);
```

### 14. disbursements
```sql
CREATE TABLE disbursements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    allocation_result_id INT NOT NULL UNIQUE,
    amount_inr DECIMAL(15,2) NOT NULL,
    disbursement_type ENUM('DEMO_PAYMENT', 'REAL_TRANSFER') DEFAULT 'DEMO_PAYMENT',
    status ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    simulated_transaction_id VARCHAR(100),
    disbursed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (allocation_result_id) REFERENCES allocation_results(id),
    INDEX idx_status (status),
    INDEX idx_type (disbursement_type)
);
```

### 15. utilization_certificates
```sql
CREATE TABLE utilization_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    disbursement_id INT NOT NULL UNIQUE,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    submitted_amount_inr DECIMAL(15,2) NOT NULL,
    submitted_documents JSON,
    status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (disbursement_id) REFERENCES disbursements(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_certificate (certificate_number),
    INDEX idx_status (status)
);
```

### 16. audit_logs
```sql
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id INT NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,  -- USER_LOGIN, REQUEST_CREATED, etc.
    entity_type VARCHAR(100) NOT NULL,  -- funding_request, budget, etc.
    entity_id VARCHAR(100) NOT NULL,
    metadata JSON,
    from_state VARCHAR(50),
    to_state VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(id),
    INDEX idx_actor (actor_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
);
```

### 17. esi_reference (Reference Table)
```sql
CREATE TABLE esi_reference (
    esi_level INT PRIMARY KEY,
    urgency_band VARCHAR(50),
    definition_summary TEXT,
    resource_concept TEXT,
    source_note TEXT
);
```

## Indexes Summary

| Table | Indexes |
|-------|---------|
| users | email, role_id |
| hospitals | license_number, is_verified |
| patients | patient_code, user_id |
| diseases | icd10_category, department |
| procedures | department, surgery_name |
| treatment_packages | package_code, disease_id, procedure_id |
| budgets | budget_date, is_active |
| funding_requests | request_code, status, patient_id, hospital_id, doctor_id, is_emergency, urgency_score |
| urgency_scores | funding_request_id |
| allocation_runs | run_code, budget_id, started_at |
| allocation_results | run_id, request_id, stage (unique) |
| emergency_allocations | budget_id, request_id |
| disbursements | status, type |
| utilization_certificates | certificate_number, status |
| audit_logs | actor_id, action, entity_type+entity_id, created_at |

## Computed Columns

- `treatment_packages.total_cost_inr` = surgery + icu + medication
- `budgets.emergency_reserve_inr` = total × percent / 100
- `budgets.normal_budget_inr` = total - emergency_reserve

## State Machine: Funding Request

```
PENDING → ELIGIBLE → SELECTED → APPROVED → DISBURSED → UTILIZATION_PENDING → VERIFIED → SETTLED
                    ↓
              (Emergency) → APPROVED → DISBURSED → UTILIZATION_PENDING → VERIFIED → SETTLED
                    
REJECTED (from any state)
EXPIRED (timeout)
```

## Constraints

1. **Unique Constraints**: 
   - users.email, roles.name, hospitals.license_number
   - patients.patient_code, patients.user_id
   - diseases.icd10_category, treatment_packages.package_code
   - budgets.budget_date, allocation_runs.run_code
   - funding_requests.request_code, urgency_scores.funding_request_id
   - allocation_results (run_id, request_id), emergency_allocations.request_id
   - disbursements.allocation_result_id, utilization_certificates.disbursement_id
   - utilization_certificates.certificate_number

2. **Foreign Keys**: All relationships enforced with ON DELETE RESTRICT

3. **Check Constraints** (via application logic):
   - urgency_score 0-100
   - funding_gap >= 0
   - severity 1-100
   - age 0-120
   - success_rate 0-1
   - esi_level 1-5