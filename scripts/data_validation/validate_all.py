#!/usr/bin/env python3
"""
Dataset Validation Utility for Panacea Vault

Validates all CSV datasets for:
- Malformed rows
- Missing required fields
- Duplicate identifiers
- Invalid costs
- Invalid severity values
- Invalid ESI values
- Broken relationships
- Unexpected nulls
- Invalid data types
"""

import pandas as pd
import sys
import os
from typing import List, Dict, Any

DATASET_PATH = os.getenv('DATASET_PATH', 'D:/Panacea_Vault/dataset')


class ValidationResult:
    """Container for validation results"""
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []

    def add_error(self, message: str):
        self.errors.append(message)

    def add_warning(self, message: str):
        self.warnings.append(message)

    def add_info(self, message: str):
        self.info.append(message)

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def print_summary(self):
        print(f"\n=== Validation Summary ===")
        print(f"Errors: {len(self.errors)}")
        print(f"Warnings: {len(self.warnings)}")
        print(f"Info: {len(self.info)}")

        if self.errors:
            print("\n--- ERRORS ---")
            for err in self.errors:
                print(f"  [ERROR] {err}")

        if self.warnings:
            print("\n--- WARNINGS ---")
            for warn in self.warnings:
                print(f"  [WARN] {warn}")

        if self.info:
            print("\n--- INFO ---")
            for inf in self.info:
                print(f"  [INFO] {inf}")


def validate_esi_reference() -> ValidationResult:
    """Validate ESI_Reference.csv"""
    result = ValidationResult()
    filepath = os.path.join(DATASET_PATH, 'ESI_Reference.csv')

    try:
        df = pd.read_csv(filepath)
        result.add_info(f"Loaded {len(df)} rows, {len(df.columns)} columns")

        # Check required columns
        required_cols = ['esi_level', 'urgency_band', 'definition_summary', 'resource_concept', 'source_note']
        for col in required_cols:
            if col not in df.columns:
                result.add_error(f"Missing required column: {col}")

        # Check esi_level values (1-5)
        if 'esi_level' in df.columns:
            invalid_esi = df[~df['esi_level'].between(1, 5)]
            if len(invalid_esi) > 0:
                result.add_error(f"Invalid ESI levels (must be 1-5): {invalid_esi['esi_level'].tolist()}")

            # Check for duplicates
            dup_esi = df[df['esi_level'].duplicated()]
            if len(dup_esi) > 0:
                result.add_error(f"Duplicate ESI levels: {dup_esi['esi_level'].tolist()}")

            # Check all levels present
            expected = set(range(1, 6))
            actual = set(df['esi_level'].tolist())
            missing = expected - actual
            if missing:
                result.add_warning(f"Missing ESI levels: {missing}")

        # Check for nulls
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            if count > 0:
                result.add_error(f"Column '{col}' has {count} null values")

    except Exception as e:
        result.add_error(f"Failed to load ESI_Reference.csv: {e}")

    return result


def validate_icd_severity() -> ValidationResult:
    """Validate ICD_Severity.csv"""
    result = ValidationResult()
    filepath = os.path.join(DATASET_PATH, 'ICD_Severity.csv')

    try:
        df = pd.read_csv(filepath)
        result.add_info(f"Loaded {len(df)} rows, {len(df.columns)} columns")

        # Check required columns
        required_cols = ['icd10_category', 'description', 'department', 'prototype_base_severity', 'source_note']
        for col in required_cols:
            if col not in df.columns:
                result.add_error(f"Missing required column: {col}")

        # Check severity range (reasonable medical severity: 1-100)
        if 'prototype_base_severity' in df.columns:
            invalid_sev = df[~df['prototype_base_severity'].between(1, 100)]
            if len(invalid_sev) > 0:
                result.add_error(f"Invalid severity values (must be 1-100): {invalid_sev['prototype_base_severity'].tolist()}")

        # Check for duplicate ICD categories
        if 'icd10_category' in df.columns:
            dup_icd = df[df['icd10_category'].duplicated()]
            if len(dup_icd) > 0:
                result.add_error(f"Duplicate ICD categories: {dup_icd['icd10_category'].tolist()}")

        # Check for nulls
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            if count > 0:
                result.add_error(f"Column '{col}' has {count} null values")

    except Exception as e:
        result.add_error(f"Failed to load ICD_Severity.csv: {e}")

    return result


def validate_surgery_mapping() -> ValidationResult:
    """Validate Surgery_Mapping.csv"""
    result = ValidationResult()
    filepath = os.path.join(DATASET_PATH, 'Surgery_Mapping.csv')

    try:
        df = pd.read_csv(filepath)
        result.add_info(f"Loaded {len(df)} rows, {len(df.columns)} columns")

        # Check required columns
        required_cols = ['department', 'surgery_name', 'example_icd10_pcs_code', 'source_note']
        for col in required_cols:
            if col not in df.columns:
                result.add_error(f"Missing required column: {col}")

        # Check for duplicate (department, surgery_name) pairs
        if 'department' in df.columns and 'surgery_name' in df.columns:
            dup = df[df.duplicated(subset=['department', 'surgery_name'])]
            if len(dup) > 0:
                result.add_error(f"Duplicate department/surgery pairs: {len(dup)} rows")

        # Check for nulls
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            if count > 0:
                result.add_error(f"Column '{col}' has {count} null values")

    except Exception as e:
        result.add_error(f"Failed to load Surgery_Mapping.csv: {e}")

    return result


def validate_synthetic_queue() -> ValidationResult:
    """Validate Synthetic_Queue.csv"""
    result = ValidationResult()
    filepath = os.path.join(DATASET_PATH, 'Synthetic_Queue.csv')

    try:
        df = pd.read_csv(filepath)
        result.add_info(f"Loaded {len(df)} rows, {len(df.columns)} columns")

        # Check required columns
        required_cols = [
            'patient_id', 'age', 'icd10_category', 'department',
            'prototype_base_severity', 'ttc_category', 'ttc_points_30',
            'success_rate', 'success_rate_points_20', 'age_factor_points_10',
            'surgery_cost_inr', 'surety_amount_inr', 'funding_gap_inr', 'urgency_score_100'
        ]
        for col in required_cols:
            if col not in df.columns:
                result.add_error(f"Missing required column: {col}")

        # Check for duplicate patient_ids
        if 'patient_id' in df.columns:
            dup_patients = df[df['patient_id'].duplicated()]
            if len(dup_patients) > 0:
                result.add_error(f"Duplicate patient_ids: {len(dup_patients)} duplicates")

        # Check age range (reasonable: 0-120)
        if 'age' in df.columns:
            invalid_age = df[~df['age'].between(0, 120)]
            if len(invalid_age) > 0:
                result.add_error(f"Invalid age values (must be 0-120): {invalid_age['age'].tolist()[:10]}...")

        # Check severity range
        if 'prototype_base_severity' in df.columns:
            invalid_sev = df[~df['prototype_base_severity'].between(1, 100)]
            if len(invalid_sev) > 0:
                result.add_error(f"Invalid severity values (must be 1-100): {len(invalid_sev)} rows")

        # Check cost fields (positive values)
        cost_cols = ['surgery_cost_inr', 'surety_amount_inr', 'funding_gap_inr']
        for col in cost_cols:
            if col in df.columns:
                invalid_cost = df[df[col] < 0]
                if len(invalid_cost) > 0:
                    result.add_error(f"Negative values in {col}: {len(invalid_cost)} rows")

        # Check urgency score range (0-100)
        if 'urgency_score_100' in df.columns:
            invalid_urg = df[~df['urgency_score_100'].between(0, 100)]
            if len(invalid_urg) > 0:
                result.add_error(f"Invalid urgency scores (must be 0-100): {len(invalid_urg)} rows")

        # Check success_rate range (0-1)
        if 'success_rate' in df.columns:
            invalid_sr = df[~df['success_rate'].between(0, 1)]
            if len(invalid_sr) > 0:
                result.add_error(f"Invalid success_rate (must be 0-1): {len(invalid_sr)} rows")

        # Check TTC points range (0-30)
        if 'ttc_points_30' in df.columns:
            invalid_ttc = df[~df['ttc_points_30'].between(0, 30)]
            if len(invalid_ttc) > 0:
                result.add_error(f"Invalid ttc_points_30 (must be 0-30): {len(invalid_ttc)} rows")

        # Check age factor points range (0-10)
        if 'age_factor_points_10' in df.columns:
            invalid_age_f = df[~df['age_factor_points_10'].between(0, 10)]
            if len(invalid_age_f) > 0:
                result.add_error(f"Invalid age_factor_points_10 (must be 0-10): {len(invalid_age_f)} rows")

        # Check for nulls
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            if count > 0:
                result.add_error(f"Column '{col}' has {count} null values")

    except Exception as e:
        result.add_error(f"Failed to load Synthetic_Queue.csv: {e}")

    return result


def validate_relationships() -> ValidationResult:
    """Validate cross-dataset relationships"""
    result = ValidationResult()

    try:
        icd_df = pd.read_csv(os.path.join(DATASET_PATH, 'ICD_Severity.csv'))
        surgery_df = pd.read_csv(os.path.join(DATASET_PATH, 'Surgery_Mapping.csv'))
        queue_df = pd.read_csv(os.path.join(DATASET_PATH, 'Synthetic_Queue.csv'))

        # Check ICD categories in queue exist in ICD_Severity
        queue_icds = set(queue_df['icd10_category'].unique())
        icd_icds = set(icd_df['icd10_category'].unique())
        missing_icds = queue_icds - icd_icds
        if missing_icds:
            result.add_error(f"ICD categories in queue but not in ICD_Severity: {missing_icds}")

        # Check departments in queue exist in Surgery_Mapping
        queue_depts = set(queue_df['department'].unique())
        surgery_depts = set(surgery_df['department'].unique())
        missing_depts = queue_depts - surgery_depts
        if missing_depts:
            result.add_warning(f"Departments in queue but not in Surgery_Mapping: {missing_depts}")
            result.add_info("These departments may not have associated surgical procedures in the mapping")

        # Check severity consistency
        merged = queue_df.merge(icd_df[['icd10_category', 'prototype_base_severity']], on='icd10_category', suffixes=('_queue', '_icd'))
        severity_mismatch = merged[merged['prototype_base_severity_queue'] != merged['prototype_base_severity_icd']]
        if len(severity_mismatch) > 0:
            result.add_warning(f"Severity mismatch between queue and ICD_Severity: {len(severity_mismatch)} rows")

    except Exception as e:
        result.add_error(f"Failed to validate relationships: {e}")

    return result


def generate_data_dictionary() -> Dict[str, Any]:
    """Generate data dictionary from actual dataset structure"""
    dictionary = {}

    for filename in ['ESI_Reference.csv', 'ICD_Severity.csv', 'Surgery_Mapping.csv', 'Synthetic_Queue.csv']:
        filepath = os.path.join(DATASET_PATH, filename)
        try:
            df = pd.read_csv(filepath)
            dictionary[filename] = {
                'rows': len(df),
                'columns': list(df.columns),
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'sample_values': {col: df[col].head(3).tolist() for col in df.columns}
            }
        except Exception as e:
            dictionary[filename] = {'error': str(e)}

    return dictionary


def main():
    print("=" * 60)
    print("Panacea Vault - Dataset Validation")
    print("=" * 60)

    all_results = {}

    # Run validations
    print("\n[VALIDATING] ESI_Reference.csv...")
    all_results['ESI_Reference'] = validate_esi_reference()

    print("\n[VALIDATING] ICD_Severity.csv...")
    all_results['ICD_Severity'] = validate_icd_severity()

    print("\n[VALIDATING] Surgery_Mapping.csv...")
    all_results['Surgery_Mapping'] = validate_surgery_mapping()

    print("\n[VALIDATING] Synthetic_Queue.csv...")
    all_results['Synthetic_Queue'] = validate_synthetic_queue()

    print("\n[VALIDATING] Cross-dataset relationships...")
    all_results['Relationships'] = validate_relationships()

    # Print summaries
    print("\n" + "=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)

    total_errors = 0
    total_warnings = 0

    for name, result in all_results.items():
        print(f"\n--- {name} ---")
        result.print_summary()
        total_errors += len(result.errors)
        total_warnings += len(result.warnings)

    # Generate data dictionary
    print("\n" + "=" * 60)
    print("DATA DICTIONARY")
    print("=" * 60)
    data_dict = generate_data_dictionary()
    import json
    print(json.dumps(data_dict, indent=2, default=str))

    # Save data dictionary
    os.makedirs('docs/database', exist_ok=True)
    with open('docs/database/data-dictionary.json', 'w') as f:
        json.dump(data_dict, f, indent=2, default=str)
    print("\n💾 Data dictionary saved to docs/database/data-dictionary.json")

    # Final result
    print("\n" + "=" * 60)
    if total_errors == 0:
        print("[SUCCESS] ALL VALIDATIONS PASSED")
        return 0
    else:
        print(f"[FAILED] VALIDATION FAILED: {total_errors} errors, {total_warnings} warnings")
        return 1


if __name__ == "__main__":
    sys.exit(main())