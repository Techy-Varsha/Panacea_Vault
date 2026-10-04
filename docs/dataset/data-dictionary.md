# Panacea Vault - Dataset Data Dictionary

## Overview

This document describes the actual structure, columns, and data types of the four CSV datasets in the `dataset/` directory. Generated from actual file inspection.

## 1. ESI_Reference.csv

**Path**: `dataset/ESI_Reference.csv`
**Rows**: 5 (ESI levels 1-5)
**Purpose**: Emergency Severity Index lookup for emergency triage

### Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| esi_level | INTEGER | ESI level (1=most urgent, 5=lowest) | 1 |
| urgency_band | VARCHAR | Human-readable urgency band | "Most urgent" |
| definition_summary | VARCHAR | Clinical definition summary | "Immediate life-saving intervention" |
| resource_concept | VARCHAR | Expected resource utilization | "Resuscitation/immediate stabilization" |
| source_note | VARCHAR | Source attribution | "Based on AHRQ ESI v4..." |

### Data

| esi_level | urgency_band | definition_summary | resource_concept |
|-----------|-------------|-------------------|------------------|
| 1 | Most urgent | Immediate life-saving intervention | Resuscitation/immediate stabilization |
| 2 | High urgency | High-risk/severe distress/time-sensitive | Very rapid assessment |
| 3 | Moderate urgency | Stable; multiple resources may be needed | Multiple resources |
| 4 | Lower urgency | Stable; one resource expected | Single resource |
| 5 | Lowest urgency | Stable; no resources expected | No resources |

---

## 2. ICD_Severity.csv

**Path**: `dataset/ICD_Severity.csv`
**Rows**: 30 (30 ICD-10 categories)
**Purpose**: Disease severity lookup for urgency scoring base severity

### Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| icd10_category | VARCHAR | ICD-10 category code (3-char) | "I21" |
| description | VARCHAR | Clinical description | "Acute myocardial infarction" |
| department | VARCHAR | Medical department | "Cardiology" |
| prototype_base_severity | INTEGER | Panacea prototype severity (1-100) | 95 |
| source_note | VARCHAR | Source attribution | "ICD terminology based on WHO..." |

### Data Sample

| icd10_category | description | department | prototype_base_severity |
|---------------|-------------|------------|------------------------|
| I21 | Acute myocardial infarction | Cardiology | 95 |
| I60 | Nontraumatic subarachnoid hemorrhage | Neurosurgery | 98 |
| I61 | Nontraumatic intracerebral hemorrhage | Neurosurgery | 98 |
| S06 | Intracranial injury | Neurosurgery | 95 |
| K35 | Acute appendicitis | General Surgery | 70 |
| K56 | Intestinal obstruction | General Surgery | 85 |
| A41 | Sepsis | Critical Care | 98 |
| J96 | Respiratory failure | Critical Care | 98 |
| I71 | Aortic aneurysm and dissection | Cardiovascular Surgery | 99 |
| I74 | Arterial embolism and thrombosis | Vascular Surgery | 92 |
| K85 | Acute pancreatitis | General Surgery | 82 |
| S36 | Injury of intra-abdominal organs | Trauma | 90 |
| ... | ... | ... | ... |

### Departments Represented
- Cardiology, Neurosurgery, General Surgery, Critical Care
- Cardiovascular Surgery, Vascular Surgery, Trauma
- Orthopedics, Oncology, Urology, Neurology
- Obstetrics, Cardiothoracic Surgery, etc.

---

## 3. Surgery_Mapping.csv

**Path**: `dataset/Surgery_Mapping.csv`
**Rows**: 30 (30 procedures)
**Purpose**: Procedure/surgery catalog for treatment package mapping

### Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| department | VARCHAR | Medical department | "General Surgery" |
| surgery_name | VARCHAR | Procedure name | "Appendectomy" |
| example_icd10_pcs_code | VARCHAR | ICD-10-PCS style procedure code | "0DTJ0ZZ" |
| source_note | VARCHAR | Source attribution | "Candidate prototype list..." |

### Data Sample

| department | surgery_name | example_icd10_pcs_code |
|------------|-------------|----------------------|
| General Surgery | Appendectomy | 0DTJ0ZZ |
| General Surgery | Cholecystectomy | 0FT40ZZ |
| General Surgery | Colectomy | 0DTM0ZZ |
| General Surgery | Small bowel resection | 0DT80ZZ |
| General Surgery | Hernia repair | 0WQF0ZZ |
| Cardiothoracic Surgery | Coronary artery bypass graft | 02100Z9 |
| Cardiothoracic Surgery | Aortic valve replacement | 02RF0JZ |
| Cardiothoracic Surgery | Mitral valve replacement | 02RG0JZ |
| Cardiothoracic Surgery | Thoracic lobectomy | 0BTJ0ZZ |
| Neurosurgery | Intracranial excision/craniotomy | 00B70ZZ |
| Neurosurgery | Cerebral aneurysm intervention | 03VG0CZ |
| Neurosurgery | Spinal decompression | 0SB00ZZ |
| Orthopedics | Hip replacement | 0SRB0J9 |
| ... | ... | ... |

---

## 4. Synthetic_Queue.csv

**Path**: `dataset/Synthetic_Queue.csv`
**Rows**: 1000 (synthetic patient queue)
**Purpose**: Prototype patient/request workload for testing allocation engine

### Columns

| Column | Type | Description | Range/Example |
|--------|------|-------------|---------------|
| patient_id | VARCHAR | Unique patient identifier | "PV00001" to "PV01000" |
| age | INTEGER | Patient age | 18-90 |
| icd10_category | VARCHAR | ICD-10 category from ICD_Severity | "I61", "K35", etc. |
| department | VARCHAR | Medical department | "Neurosurgery", "General Surgery" |
| prototype_base_severity | INTEGER | Base severity from ICD lookup | 50-99 |
| ttc_category | VARCHAR | Time-to-treatment category | "<2h", "2-6h", "1-3d", ">3d" |
| ttc_points_30 | INTEGER | TTC points (0-30) | 0, 5, 10, 25, 30 |
| success_rate | DECIMAL | Predicted success probability | 0.50-0.99 |
| success_rate_points_20 | DECIMAL | Success rate component (0-20) | 10.0-19.8 |
| age_factor_points_10 | INTEGER | Age adjustment (0-10) | 2-10 |
| surgery_cost_inr | INTEGER | Surgery cost in INR | 50,000-2,000,000 |
| surety_amount_inr | INTEGER | Patient surety/co-pay in INR | 0-500,000 |
| funding_gap_inr | INTEGER | Amount needed from vault | 0-1,950,000 |
| urgency_score_100 | DECIMAL | Pre-calculated urgency score | 40-95 |

### TTC Category Distribution

| ttc_category | ttc_points_30 | Count (approx) |
|-------------|---------------|----------------|
| <2h | 30 | ~150 |
| 2-6h | 25 | ~250 |
| 1-3d | 10 | ~300 |
| >3d | 5 | ~300 |

### Cost Statistics (INR)

| Metric | surgery_cost | surety_amount | funding_gap |
|--------|-------------|--------------|-------------|
| Min | 50,000 | 0 | 0 |
| Max | 2,000,000 | 500,000 | 1,950,000 |
| Mean | ~650,000 | ~80,000 | ~570,000 |
| Median | 500,000 | 50,000 | 450,000 |

### Urgency Score Distribution

| Range | Count |
|-------|-------|
| 90-100 | ~50 |
| 80-89 | ~150 |
| 70-79 | ~300 |
| 60-69 | ~300 |
| 50-59 | ~150 |
| 40-49 | ~50 |

---

## Relationships

### ICD_Severity ↔ Synthetic_Queue
- **Join Key**: `icd10_category`
- Each Synthetic_Queue row references an ICD category
- `prototype_base_severity` in Synthetic_Queue matches ICD_Severity lookup

### Surgery_Mapping ↔ Synthetic_Queue
- **Join Key**: `department` (approximate)
- Surgery_Mapping lists procedures by department
- Synthetic_Queue has department but not specific procedure

### ESI_Reference
- Standalone reference table
- Used by Emergency Allocator for ESI level validation
- Not directly joined to other tables

---

## Data Quality Notes

### Validation Results (from validate_all.py)

**ESI_Reference.csv**: ✅ Clean
- 5 rows, 5 columns
- No nulls, no duplicates
- ESI levels 1-5 present

**ICD_Severity.csv**: ✅ Clean
- 30 rows, 5 columns
- All severities 1-100
- Unique icd10_category
- No nulls

**Surgery_Mapping.csv**: ✅ Clean
- 30 rows, 4 columns
- Unique surgery_name per department
- No nulls

**Synthetic_Queue.csv**: ✅ Clean
- 1000 rows, 16 columns
- Unique patient_id (PV00001-PV01000)
- Age range 18-90
- All costs ≥ 0
- Urgency scores 0-100
- Success rates 0-1
- No nulls in required fields

### Cross-Dataset Validation
- All icd10_category in Synthetic_Queue exist in ICD_Severity ✅
- All departments in Synthetic_Queue exist in ICD_Severity ✅
- All departments in Synthetic_Queue exist in Surgery_Mapping ✅

---

## Usage in Application

### Seeding Database (seed_data.py)
```python
# Diseases from ICD_Severity
diseases = pd.read_csv('dataset/ICD_Severity.csv')

# Procedures from Surgery_Mapping
procedures = pd.read_csv('dataset/Surgery_Mapping.csv')

# Treatment Packages from Synthetic_Queue (unique disease+department combos)
queue = pd.read_csv('dataset/Synthetic_Queue.csv')

# ESI Reference
esi = pd.read_csv('dataset/ESI_Reference.csv')
```

### Scoring Engine
- `base_severity` ← ICD_Severity.prototype_base_severity
- `ttc_component` ← Synthetic_Queue.ttc_points_30 (via TTCategory mapping)
- `success_rate_component` ← Synthetic_Queue.success_rate_points_20
- `age_component` ← Synthetic_Queue.age_factor_points_10

### Allocation Engine
- `funding_gap_inr` ← Knapsack weight (cost)
- `urgency_score_100` ← Knapsack value (urgency)

---

## Column Reference for Development

### For Funding Request Creation
Required from Synthetic_Queue:
- patient_id → Patient lookup
- icd10_category → Disease lookup
- department → Procedure filter
- surgery_cost_inr, surety_amount_inr → funding_gap calculation
- ttc_category, success_rate, age_factor_points_10 → Scoring input

### For Allocation
- funding_gap_inr → Knapsack weight
- urgency_score_100 → Knapsack value
- is_emergency, esi_level → Emergency eligibility

### For Dashboard
- All Synthetic_Queue columns for analytics
- Aggregations by department, TTC, urgency bands