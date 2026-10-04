#!/usr/bin/env python3
"""
Seed script to populate database from CSV datasets.
Run after database schema is created.
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from decimal import Decimal
import json

# Database configuration - use environment variables in production
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', '#Mysql1root'),
    'database': os.getenv('DB_NAME', 'panacea_vault')
}

DATASET_PATH = os.getenv('DATASET_PATH', 'D:/Panacea_Vault/dataset')

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def seed_diseases(cursor):
    """Seed diseases from ICD_Severity.csv"""
    df = pd.read_csv(f'{DATASET_PATH}/ICD_Severity.csv')

    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO diseases (icd10_category, description, department, prototype_base_severity, source_note)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                description=VALUES(description),
                department=VALUES(department),
                prototype_base_severity=VALUES(prototype_base_severity),
                source_note=VALUES(source_note)
        """, (
            row['icd10_category'],
            row['description'],
            row['department'],
            int(row['prototype_base_severity']),
            row['source_note']
        ))
    print(f"Seeded {len(df)} diseases")

def seed_procedures(cursor):
    """Seed procedures from Surgery_Mapping.csv"""
    df = pd.read_csv(f'{DATASET_PATH}/Surgery_Mapping.csv')

    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO procedures (department, surgery_name, example_icd10_pcs_code, source_note)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                example_icd10_pcs_code=VALUES(example_icd10_pcs_code),
                source_note=VALUES(source_note)
        """, (
            row['department'],
            row['surgery_name'],
            row['example_icd10_pcs_code'],
            row['source_note']
        ))
    print(f"Seeded {len(df)} procedures")

def seed_treatment_packages(cursor):
    """Create treatment packages from Synthetic_Queue.csv data"""
    df = pd.read_csv(f'{DATASET_PATH}/Synthetic_Queue.csv')

    # Get unique combinations of disease, department, and cost
    unique_packages = df.drop_duplicates(subset=['icd10_category', 'department', 'surgery_cost_inr'])

    # Get disease and procedure IDs
    cursor.execute("SELECT id, icd10_category FROM diseases")
    disease_map = {row[1]: row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id, department, surgery_name FROM procedures")
    procedure_map = {(row[1], row[2]): row[0] for row in cursor.fetchall()}

    package_count = 0
    for _, row in unique_packages.iterrows():
        disease_id = disease_map.get(row['icd10_category'])

        # Find matching procedure by department
        procedure_id = None
        for (dept, name), pid in procedure_map.items():
            if dept == row['department']:
                procedure_id = pid
                break

        if disease_id and procedure_id:
            package_code = f"PKG-{disease_id:03d}-{procedure_id:03d}"
            surgery_cost = Decimal(str(row['surgery_cost_inr']))
            # Estimate ICU and medication as percentages of surgery cost
            icu_cost = surgery_cost * Decimal('0.3')
            med_cost = surgery_cost * Decimal('0.1')

            cursor.execute("""
                INSERT INTO treatment_packages (package_code, disease_id, procedure_id, surgery_cost_inr, icu_cost_inr, medication_cost_inr, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    surgery_cost_inr=VALUES(surgery_cost_inr),
                    icu_cost_inr=VALUES(icu_cost_inr),
                    medication_cost_inr=VALUES(medication_cost_inr)
            """, (
                package_code,
                disease_id,
                procedure_id,
                surgery_cost,
                icu_cost,
                med_cost,
                f"Auto-generated from Synthetic_Queue for {row['icd10_category']} - {row['department']}"
            ))
            package_count += 1

    print(f"Seeded {package_count} treatment packages")

def seed_esi_reference(cursor):
    """Seed ESI reference data"""
    df = pd.read_csv(f'{DATASET_PATH}/ESI_Reference.csv')

    # Create a simple lookup table or store in a config table
    # For now, we'll create a simple reference table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS esi_reference (
            esi_level INT PRIMARY KEY,
            urgency_band VARCHAR(50),
            definition_summary TEXT,
            resource_concept TEXT,
            source_note TEXT
        )
    """)

    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO esi_reference (esi_level, urgency_band, definition_summary, resource_concept, source_note)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                urgency_band=VALUES(urgency_band),
                definition_summary=VALUES(definition_summary),
                resource_concept=VALUES(resource_concept),
                source_note=VALUES(source_note)
        """, (
            int(row['esi_level']),
            row['urgency_band'],
            row['definition_summary'],
            row['resource_concept'],
            row['source_note']
        ))
    print(f"Seeded {len(df)} ESI reference levels")

def seed_patients_and_requests(cursor):
    """Seed patients and funding requests from Synthetic_Queue.csv"""
    df = pd.read_csv(f'{DATASET_PATH}/Synthetic_Queue.csv')

    # Get lookup maps
    cursor.execute("SELECT id, icd10_category FROM diseases")
    disease_map = {row[1]: row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id, department, surgery_name FROM procedures")
    procedure_map = {(row[1], row[2]): row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id, package_code, disease_id, procedure_id FROM treatment_packages")
    package_map = {(row[2], row[3]): row[0] for row in cursor.fetchall()}

    # Get or create a default hospital
    cursor.execute("SELECT id FROM hospitals LIMIT 1")
    hospital_row = cursor.fetchone()
    if not hospital_row:
        cursor.execute("""
            INSERT INTO hospitals (name, address, city, state, contact_email, license_number, is_verified)
            VALUES ('Panacea General Hospital', '123 Medical Center Dr', 'New Delhi', 'Delhi', 'admin@panacea.example', 'LIC-001', TRUE)
        """)
        hospital_id = cursor.lastrowid
    else:
        hospital_id = hospital_row[0]

    # Get or create a default doctor user
    cursor.execute("SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'DOCTOR') LIMIT 1")
    doctor_row = cursor.fetchone()
    if not doctor_row:
        cursor.execute("""
            INSERT INTO users (email, password_hash, full_name, role_id)
            VALUES ('dr.smith@panacea.example', '$2b$12$dummyhash', 'Dr. John Smith', (SELECT id FROM roles WHERE name = 'DOCTOR'))
        """)
        doctor_id = cursor.lastrowid
    else:
        doctor_id = doctor_row[0]

    patient_count = 0
    request_count = 0

    for _, row in df.iterrows():
        # Create patient
        patient_code = row['patient_id']
        cursor.execute("""
            INSERT INTO patients (patient_code, first_name, last_name, date_of_birth, gender, phone)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                first_name=VALUES(first_name),
                last_name=VALUES(last_name)
        """, (
            patient_code,
            f"Patient_{patient_code[-4:]}",
            "Synthetic",
            f"19{str(100 - row['age']).zfill(2)}-01-01",  # Approximate birth year
            'M' if row['age'] % 2 == 0 else 'F',
            f"+91-9{str(row['patient_id'][-9:]).zfill(9)}" if len(str(row['patient_id'])) >= 9 else f"+91-900000000"
        ))
        patient_id = cursor.lastrowid

        # Get IDs
        disease_id = disease_map.get(row['icd10_category'])
        procedure_id = None
        for (dept, name), pid in procedure_map.items():
            if dept == row['department']:
                procedure_id = pid
                break

        package_id = None
        if disease_id and procedure_id:
            package_id = package_map.get((disease_id, procedure_id))

        if disease_id and procedure_id and package_id:
            request_code = f"REQ-{patient_code}"
            surgery_cost = Decimal(str(row['surgery_cost_inr']))
            surety = Decimal(str(row['surety_amount_inr']))
            funding_gap = Decimal(str(row['funding_gap_inr']))
            urgency = Decimal(str(row['urgency_score_100']))

            cursor.execute("""
                INSERT INTO funding_requests (
                    request_code, patient_id, disease_id, procedure_id, treatment_package_id,
                    hospital_id, requesting_doctor_id, surgery_cost_inr, surety_amount_inr,
                    funding_gap_inr, urgency_score, ttc_category, ttc_points, success_rate,
                    success_rate_points, age_factor_points, is_emergency
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    urgency_score=VALUES(urgency_score),
                    funding_gap_inr=VALUES(funding_gap_inr)
            """, (
                request_code,
                patient_id,
                disease_id,
                procedure_id,
                package_id,
                hospital_id,
                doctor_id,
                surgery_cost,
                surety,
                funding_gap,
                urgency,
                row['ttc_category'],
                int(row['ttc_points_30']),
                float(row['success_rate']),
                Decimal(str(row['success_rate_points_20'])),
                int(row['age_factor_points_10']),
                False  # is_emergency - can be flagged based on ESI
            ))
            request_count += 1
        patient_count += 1

    print(f"Seeded {patient_count} patients and {request_count} funding requests")

def seed_budget(cursor):
    """Create a default daily budget"""
    cursor.execute("""
        INSERT INTO budgets (budget_date, total_daily_budget_inr, emergency_reserve_percent, created_by)
        VALUES (CURDATE(), 5000000.00, 15.00, 1)
        ON DUPLICATE KEY UPDATE
            total_daily_budget_inr=VALUES(total_daily_budget_inr),
            emergency_reserve_percent=VALUES(emergency_reserve_percent)
    """)
    print("Seeded default budget")

def main():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("Starting database seeding...")

        seed_diseases(cursor)
        seed_procedures(cursor)
        seed_treatment_packages(cursor)
        seed_esi_reference(cursor)
        seed_patients_and_requests(cursor)
        seed_budget(cursor)

        conn.commit()
        print("Database seeding completed successfully!")

    except Error as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    main()