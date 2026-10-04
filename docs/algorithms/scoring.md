# Panacea Vault - Urgency Scoring Algorithm Documentation

## Overview

The Urgency Scoring Engine is a centralized service that calculates patient urgency scores from dataset fields. It does NOT allow manual entry of arbitrary final scores - all scores are derived from structured medical data.

## Scoring Model

### Formula

```
final_score = min(MAX_URGENCY_SCORE, 
    base_severity 
    + ttc_component 
    + success_rate_component 
    + age_component 
    + waiting_boost 
    + emergency_component
)
```

Where `MAX_URGENCY_SCORE = 100`

### Component Breakdown

| Component | Source | Range | Weight |
|-----------|--------|-------|--------|
| base_severity | ICD_Severity.csv (prototype_base_severity) | 50-99 | Primary |
| ttc_component | Synthetic_Queue.ttc_category | 0-30 | Time-criticality |
| success_rate_component | Synthetic_Queue.success_rate | 0-20 | Outcome probability |
| age_component | Synthetic_Queue.age_factor_points_10 | 0-10 | Age adjustment |
| waiting_boost | Calculated (waiting_days × 5) | 0+ | Anti-starvation |
| emergency_component | ESI level / ICD emergency | 0-20 | Emergency boost |

## Component Details

### 1. Base Severity (ICD-Based)

**Source**: `ICD_Severity.csv` → `prototype_base_severity`

```csv
icd10_category,description,department,prototype_base_severity
I21,Acute myocardial infarction,Cardiology,95
I61,Nontraumatic intracerebral hemorrhage,Neurosurgery,98
K35,Acute appendicitis,General Surgery,70
...
```

- Range: 50-99 (prototype heuristic, not official WHO score)
- Higher = more severe condition
- Lookup by `icd10_category` from request

### 2. Time-to-Treatment Criticality (TTC)

**Source**: `Synthetic_Queue.csv` → `ttc_category` → `ttc_points_30`

| TTC Category | Points | Description |
|-------------|--------|-------------|
| `<2h` | 30 | Immediate/emergent |
| `2-6h` | 25 | Urgent |
| `1-3d` | 10 | Semi-urgent |
| `3-7d` | 5 | Routine |
| `7d+` / `>3d` | 0 | Elective |

```python
TTCategory.get_points("<2h")  # → 30
TTCategory.get_points("2-6h")  # → 25
```

### 3. Success Rate Component

**Source**: `Synthetic_Queue.csv` → `success_rate` → `success_rate_points_20`

```
success_rate_component = success_rate × 20
```

- `success_rate`: 0.0 to 1.0 (probability of successful outcome)
- Component range: 0-20
- Higher success rate = higher score (treatments more likely to succeed)

### 4. Age Component

**Source**: `Synthetic_Queue.csv` → `age_factor_points_10`

```
age_component = age_factor_points_10  # Direct from dataset, 0-10
```

- Pre-calculated in dataset based on age curves
- Younger patients may get higher points for life-years saved
- Range: 0-10

### 5. Waiting Boost (Anti-Starvation)

**Configuration**: `WAITING_TIME_BOOST = 5` points per waiting day/cycle

```
waiting_boost = waiting_days × WAITING_TIME_BOOST
```

- Accumulates over time while request waits
- Configurable constant
- **Cap Policy**: No hard cap in current implementation; monitored via audit
- Displayed in score breakdown for transparency

### 6. Emergency Component

**For Emergency Requests Only (ESI Level 1-2)**

```
if is_emergency and esi_level in {1, 2}:
    emergency_component = 20 - (esi_level - 1) × 10
    # ESI 1: +20, ESI 2: +10
else:
    emergency_component = 0
```

Additional ICD-based emergency boost for life-threatening categories:
- I21, I60, I61, S06, A41, J96, I71, O72, O00, T79, S36, S27

## UrgencyScoreBreakdown Dataclass

```python
@dataclass
class UrgencyScoreBreakdown:
    base_severity: int              # From ICD lookup
    ttc_component: int              # 0-30
    success_rate_component: float   # 0-20
    age_component: int              # 0-10
    waiting_boost: int              # 0+
    emergency_component: int        # 0-20
    final_score: float              # Capped at 100
    
    def to_dict(self) -> Dict:
        return asdict(self)
```

## ScoringInput Dataclass

```python
@dataclass
class ScoringInput:
    icd10_category: str
    prototype_base_severity: int
    ttc_category: str
    success_rate: float
    age: int
    age_factor_points_10: int
    waiting_days: int = 0
    is_emergency: bool = False
    esi_level: Optional[int] = None
```

## Usage Examples

### Example 1: Regular Neurosurgery Case
```python
input = ScoringInput(
    icd10_category="I61",
    prototype_base_severity=98,
    ttc_category="2-6h",
    success_rate=0.65,
    age=45,
    age_factor_points_10=8,
    waiting_days=0
)
# Calculation:
# base_severity=98
# ttc_component=25
# success_rate_component=13.0
# age_component=8
# waiting_boost=0
# emergency_component=0
# total=144 → capped at 100
```

### Example 2: Emergency Cardiac Case
```python
input = ScoringInput(
    icd10_category="I21",
    prototype_base_severity=95,
    ttc_category="<2h",
    success_rate=0.80,
    age=55,
    age_factor_points_10=6,
    waiting_days=0,
    is_emergency=True,
    esi_level=1
)
# Calculation:
# base_severity=95
# ttc_component=30
# success_rate_component=16.0
# age_component=6
# waiting_boost=0
# emergency_component=20 (ESI 1)
# total=167 → capped at 100
```

### Example 3: Waiting Patient (Anti-Starvation)
```python
input = ScoringInput(
    icd10_category="K35",
    prototype_base_severity=70,
    ttc_category="1-3d",
    success_rate=0.90,
    age=30,
    age_factor_points_10=9,
    waiting_days=10  # Waited 10 days
)
# Calculation:
# base_severity=70
# ttc_component=10
# success_rate_component=18.0
# age_component=9
# waiting_boost=50 (10 × 5)
# emergency_component=0
# total=157 → capped at 100
```

## Implementation

### UrgencyScorer Class

```python
class UrgencyScorer:
    def calculate(self, input_data: ScoringInput) -> UrgencyScoreBreakdown:
        # 1. Base severity (validated 1-100)
        base = input_data.prototype_base_severity
        
        # 2. TTC component
        ttc = TTCategory.get_points(input_data.ttc_category)
        
        # 3. Success rate component
        sr_comp = input_data.success_rate * 20
        
        # 4. Age component
        age_comp = input_data.age_factor_points_10
        
        # 5. Waiting boost
        wait_boost = input_data.waiting_days * WAITING_TIME_BOOST
        
        # 6. Emergency component
        emerg_comp = 0
        if input_data.is_emergency and input_data.esi_level:
            if input_data.esi_level == 1:
                emerg_comp = 20
            elif input_data.esi_level == 2:
                emerg_comp = 10
        
        # 7. Final score (capped)
        raw_score = base + ttc + sr_comp + age_comp + wait_boost + emerg_comp
        final = min(MAX_URGENCY_SCORE, raw_score)
        
        return UrgencyScoreBreakdown(
            base_severity=base,
            ttc_component=ttc,
            success_rate_component=sr_comp,
            age_component=age_comp,
            waiting_boost=wait_boost,
            emergency_component=emerg_comp,
            final_score=final
        )
```

## Integration Points

### API Endpoint
```
POST /api/scoring/calculate
POST /api/scoring/requests/{request_id}/calculate
```

### Request Creation Flow
1. Doctor creates funding request with ICD, procedure, TTC, etc.
2. System calls `POST /api/scoring/requests/{id}/calculate`
3. Scorer computes breakdown
4. UrgencyScore record stored
5. FundingRequest.urgency_score updated
6. Request status → ELIGIBLE

### Allocation Flow
- Allocation uses `funding_requests.urgency_score` as Knapsack value
- Score breakdown stored for explainability

## Configuration

| Constant | Default | Description |
|----------|---------|-------------|
| WAITING_TIME_BOOST | 5 | Points per waiting day |
| MAX_URGENCY_SCORE | 100 | Score cap |

## Testing

### Unit Tests (dsa-engine/tests/test_scoring.py)
- TTC category point mapping
- Regular request scoring
- Low severity request
- Emergency request (ESI 1, ESI 2)
- Waiting boost accumulation
- Score capping at 100
- Boundary values

### Test Command
```bash
python -m pytest dsa-engine/tests/test_scoring.py -v
```

## Explainability

Every score calculation returns a full breakdown:
```json
{
  "base_severity": 98,
  "ttc_component": 25,
  "success_rate_component": 13.0,
  "age_component": 8,
  "waiting_boost": 0,
  "emergency_component": 0,
  "final_score": 100
}
```

Frontend displays this in admin dashboard for allocation transparency.

## Data Source Dependencies

| Component | Dataset | Field |
|-----------|---------|-------|
| base_severity | ICD_Severity.csv | prototype_base_severity |
| ttc_component | Synthetic_Queue.csv | ttc_category → ttc_points_30 |
| success_rate_component | Synthetic_Queue.csv | success_rate → success_rate_points_20 |
| age_component | Synthetic_Queue.csv | age_factor_points_10 |
| waiting_boost | Calculated | waiting_days × 5 |
| emergency_component | ESI_Reference.csv + request | esi_level + is_emergency |

## Limitations & Future Improvements

1. **Prototype Heuristic**: Base severity is prototype, not clinical guideline
2. **No Comorbidity Adjustment**: Single ICD category only
3. **Static Success Rate**: Dataset value, not dynamic prediction
4. **Waiting Boost Cap**: No max; could add `MAX_WAITING_BOOST`
5. **Future**: ML-based scoring with more features
6. **Future**: Department-specific weighting