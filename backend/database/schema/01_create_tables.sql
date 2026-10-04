-- Panacea Vault Database Schema
-- MySQL 8.0+ compatible

-- ============================================================
-- ENUMS AND TYPES
-- ============================================================


-- ============================================================
-- CORE TABLES
-- ============================================================

-- Roles table
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role ENUM('PATIENT', 'DOCTOR', 'HOSPITAL', 'ADMIN', 'AUDITOR', 'DONOR') NOT NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Hospitals table
CREATE TABLE hospitals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    license_number VARCHAR(100) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Diseases table (from ICD_Severity.csv)
CREATE TABLE diseases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    icd10_category VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    prototype_base_severity INT NOT NULL,
    source_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Procedures table (from Surgery_Mapping.csv)
CREATE TABLE procedures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department VARCHAR(100) NOT NULL,
    surgery_name VARCHAR(255) NOT NULL,
    example_icd10_pcs_code VARCHAR(50),
    source_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dept_surgery (department, surgery_name)
);

-- Treatment Packages table (combines surgery + ICU + medication costs)
CREATE TABLE treatment_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    package_code VARCHAR(50) NOT NULL UNIQUE,
    disease_id INT NOT NULL,
    procedure_id INT NOT NULL,
    surgery_cost_inr DECIMAL(15,2) NOT NULL,
    icu_cost_inr DECIMAL(15,2) DEFAULT 0,
    medication_cost_inr DECIMAL(15,2) DEFAULT 0,
    total_package_cost_inr DECIMAL(15,2) GENERATED ALWAYS AS (surgery_cost_inr + icu_cost_inr + medication_cost_inr) STORED,
    estimated_stay_days INT DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (disease_id) REFERENCES diseases(id),
    FOREIGN KEY (procedure_id) REFERENCES procedures(id)
);

-- Budgets table
CREATE TABLE budgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    budget_date DATE NOT NULL UNIQUE,
    total_daily_budget_inr DECIMAL(15,2) NOT NULL,
    emergency_reserve_percent DECIMAL(5,2) DEFAULT 15.00,
    emergency_reserve_inr DECIMAL(15,2) GENERATED ALWAYS AS (total_daily_budget_inr * emergency_reserve_percent / 100) STORED,
    normal_budget_inr DECIMAL(15,2) GENERATED ALWAYS AS (total_daily_budget_inr - (total_daily_budget_inr * emergency_reserve_percent / 100)) STORED,
    normal_remaining_inr DECIMAL(15,2) DEFAULT 0,
    emergency_remaining_inr DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Funding Requests table
CREATE TABLE funding_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_code VARCHAR(50) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    disease_id INT NOT NULL,
    procedure_id INT NOT NULL,
    treatment_package_id INT NOT NULL,
    hospital_id INT NOT NULL,
    requesting_doctor_id INT NOT NULL,
    surgery_cost_inr DECIMAL(15,2) NOT NULL,
    surety_amount_inr DECIMAL(15,2) NOT NULL,
    funding_gap_inr DECIMAL(15,2) NOT NULL,
    urgency_score DECIMAL(10,2) NOT NULL,
    ttc_category VARCHAR(20),
    ttc_points INT,
    success_rate DECIMAL(5,4),
    success_rate_points DECIMAL(5,2),
    age_factor_points INT,
    status ENUM('PENDING', 'ELIGIBLE', 'SELECTED', 'APPROVED', 'DISBURSED', 'UTILIZATION_PENDING', 'VERIFIED', 'SETTLED', 'REJECTED', 'EXPIRED') NOT NULL,
    waiting_days INT DEFAULT 0,
    waiting_boost INT DEFAULT 0,
    is_emergency BOOLEAN DEFAULT FALSE,
    esi_level INT NULL,
    eligibility_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (disease_id) REFERENCES diseases(id),
    FOREIGN KEY (procedure_id) REFERENCES procedures(id),
    FOREIGN KEY (treatment_package_id) REFERENCES treatment_packages(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (requesting_doctor_id) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_hospital (hospital_id),
    INDEX idx_patient (patient_id),
    INDEX idx_urgency (urgency_score DESC),
    INDEX idx_emergency (is_emergency)
);

-- Urgency Scores table (detailed breakdown)
CREATE TABLE urgency_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    funding_request_id INT NOT NULL UNIQUE,
    base_severity INT NOT NULL,
    esi_component INT DEFAULT 0,
    ttc_component INT DEFAULT 0,
    success_rate_component DECIMAL(5,2) DEFAULT 0,
    age_component INT DEFAULT 0,
    waiting_boost INT DEFAULT 0,
    emergency_component INT DEFAULT 0,
    final_score DECIMAL(10,2) NOT NULL,
    calculation_details JSON,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by INT,
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (calculated_by) REFERENCES users(id)
);

-- Allocation Runs table
CREATE TABLE allocation_runs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_code VARCHAR(50) NOT NULL UNIQUE,
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
    FOREIGN KEY (executed_by) REFERENCES users(id)
);

-- Allocation Results table
CREATE TABLE allocation_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    allocation_run_id INT NOT NULL,
    funding_request_id INT NOT NULL,
    allocated_amount_inr DECIMAL(15,2) NOT NULL,
    urgency_score DECIMAL(10,2) NOT NULL,
    selection_order INT,
    is_selected BOOLEAN DEFAULT TRUE,
    notes TEXT,
    allocation_stage ENUM('KNAPSACK', 'GREEDY_FALLBACK', 'EMERGENCY') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (allocation_run_id) REFERENCES allocation_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    UNIQUE KEY unique_run_request (allocation_run_id, funding_request_id),
    INDEX idx_run_stage (allocation_run_id, allocation_stage)
);

-- Emergency Allocations table
CREATE TABLE emergency_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    allocation_code VARCHAR(50) NOT NULL UNIQUE,
    funding_request_id INT NOT NULL,
    budget_id INT NOT NULL,
    allocated_amount_inr DECIMAL(15,2) NOT NULL,
    urgency_score DECIMAL(10,2) NOT NULL,
    esi_level INT NOT NULL,
    justification TEXT NOT NULL,
    authorized_by INT NOT NULL,
    authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'APPROVED',
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    FOREIGN KEY (budget_id) REFERENCES budgets(id),
    FOREIGN KEY (authorized_by) REFERENCES users(id)
);

-- Disbursements table (Escrow-style)
CREATE TABLE disbursements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    disbursement_code VARCHAR(50) NOT NULL UNIQUE,
    allocation_result_id INT NOT NULL,
    funding_request_id INT NOT NULL,
    hospital_id INT NOT NULL,
    amount_inr DECIMAL(15,2) NOT NULL,
    payment_type VARCHAR(50) DEFAULT 'DEMO_PAYMENT_SIMULATED_ESCROW',
    payment_reference VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (allocation_result_id) REFERENCES allocation_results(id),
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_hospital_status (hospital_id, payment_status)
);

-- Utilization Certificates table
CREATE TABLE utilization_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uc_code VARCHAR(50) NOT NULL UNIQUE,
    disbursement_id INT NOT NULL,
    funding_request_id INT NOT NULL,
    hospital_id INT NOT NULL,
    submitted_by INT NOT NULL,
    treatment_details TEXT,
    actual_cost_inr DECIMAL(15,2),
    patient_outcome VARCHAR(100),
    discharge_date DATE,
    supporting_documents JSON,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    FOREIGN KEY (disbursement_id) REFERENCES disbursements(id),
    FOREIGN KEY (funding_request_id) REFERENCES funding_requests(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    actor_id INT,
    actor_role VARCHAR(50),
    action ENUM('USER_LOGIN', 'REQUEST_CREATED', 'REQUEST_UPDATED', 'SCORE_CALCULATED', 'ALLOCATION_STARTED', 'KNAPSACK_COMPLETED', 'GREEDY_FALLBACK_COMPLETED', 'EMERGENCY_ALLOCATION', 'ALLOCATION_APPROVED', 'DISBURSEMENT_CREATED', 'UC_SUBMITTED', 'UC_VERIFIED', 'CASE_SETTLED') NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_state JSON,
    new_state JSON,
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_actor (actor_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert roles
INSERT INTO roles (name, description) VALUES
('PATIENT', 'Patient requesting funding'),
('DOCTOR', 'Doctor creating treatment requests'),
('HOSPITAL', 'Hospital managing disbursements and utilization'),
('ADMIN', 'System administrator managing budgets and allocations'),
('AUDITOR', 'Auditor reviewing financial records and allocations'),
('DONOR', 'Donor viewing impact metrics');
