import sys
sys.path.insert(0, 'D:/Panacea_Vault/dsa-engine')
from scoring.urgency_scorer import UrgencyScorer, ScoringInput, TTCategory

# Test TTC category points
assert TTCategory.get_points("<2h") == 30
assert TTCategory.get_points("2-6h") == 25
assert TTCategory.get_points("1-3d") == 10
assert TTCategory.get_points("3-7d") == 5
assert TTCategory.get_points("7d+") == 0
assert TTCategory.get_points("invalid") == 0
print('test_ttc_category_points passed')

# Test regular request scoring
scorer = UrgencyScorer()
input_data = ScoringInput(
    icd10_category="I61",
    prototype_base_severity=98,
    ttc_category="2-6h",
    success_rate=0.65,
    age=45,
    age_factor_points_10=8,
    waiting_days=0
)
result = scorer.calculate(input_data)
assert result.base_severity == 98
assert result.ttc_component == 25
assert result.success_rate_component == 13.0
assert result.age_component == 8
assert result.waiting_boost == 0
assert result.final_score == 100.0  # Capped at 100
print('test_regular_request passed')

# Test lower severity request
input_data = ScoringInput(
    icd10_category="N20",
    prototype_base_severity=55,
    ttc_category="1-3d",
    success_rate=0.90,
    age=30,
    age_factor_points_10=9,
    waiting_days=0
)
result = scorer.calculate(input_data)
assert result.base_severity == 55
assert result.ttc_component == 10
assert result.success_rate_component == 18.0
assert result.age_component == 9
assert result.final_score == 92.0
print('test_low_severity_request passed')

# Test waiting boost
input_data = ScoringInput(
    icd10_category="K35",
    prototype_base_severity=70,
    ttc_category="2-6h",
    success_rate=0.80,
    age=40,
    age_factor_points_10=8,
    waiting_days=3
)
result = scorer.calculate(input_data)
assert result.base_severity == 70
assert result.ttc_component == 25
assert result.success_rate_component == 16.0
assert result.age_component == 8
assert result.waiting_boost == 15  # 3 days * 5
assert result.final_score == 100.0  # Capped
print('test_waiting_boost passed')

# Test emergency scoring (ESI level 1)
input_data = ScoringInput(
    icd10_category="I21",
    prototype_base_severity=95,
    ttc_category="<2h",
    success_rate=0.70,
    age=50,
    age_factor_points_10=6,
    waiting_days=0,
    is_emergency=True,
    esi_level=1
)
result = scorer.calculate(input_data)
assert result.base_severity == 95
assert result.ttc_component == 30
assert result.emergency_component == 15  # Base emergency boost
assert result.esi_component == 30  # ESI level 1 = 30 points
assert result.final_score == 100.0  # Capped
print('test_emergency_esi_1 passed')

# Test emergency scoring (ESI level 2)
input_data = ScoringInput(
    icd10_category="I21",
    prototype_base_severity=95,
    ttc_category="<2h",
    success_rate=0.70,
    age=50,
    age_factor_points_10=6,
    waiting_days=0,
    is_emergency=True,
    esi_level=2
)
result = scorer.calculate(input_data)
assert result.base_severity == 95
assert result.emergency_component == 15
assert result.esi_component == 20  # ESI level 2 = 20 points
assert result.final_score == 100.0
print('test_emergency_esi_2 passed')

# Test non-emergency scoring (is_emergency=False)
input_data = ScoringInput(
    icd10_category="I21",
    prototype_base_severity=95,
    ttc_category="<2h",
    success_rate=0.70,
    age=50,
    age_factor_points_10=6,
    waiting_days=0,
    is_emergency=False,
    esi_level=3
)
result = scorer.calculate(input_data)
assert result.emergency_component == 0  # Not emergency
assert result.esi_component == 0  # No ESI component
print('test_non_emergency passed')

# Test boundary values
input_data = ScoringInput(
    icd10_category="TEST",
    prototype_base_severity=0,
    ttc_category="7d+",
    success_rate=0.0,
    age=100,
    age_factor_points_10=0,
    waiting_days=0
)
result = scorer.calculate(input_data)
assert result.final_score == 0
print('test_boundary_min passed')

input_data = ScoringInput(
    icd10_category="TEST",
    prototype_base_severity=100,
    ttc_category="<2h",
    success_rate=1.0,
    age=0,
    age_factor_points_10=10,
    waiting_days=20
)
result = scorer.calculate(input_data)
assert result.final_score == 100  # Capped
print('test_boundary_max passed')

# Test to_dict method
input_data = ScoringInput(
    icd10_category="I61",
    prototype_base_severity=98,
    ttc_category="2-6h",
    success_rate=0.65,
    age=45,
    age_factor_points_10=8,
    waiting_days=0
)
result = scorer.calculate(input_data)
d = result.to_dict()
assert 'base_severity' in d
assert 'ttc_component' in d
assert 'success_rate_component' in d
assert 'age_component' in d
assert 'waiting_boost' in d
assert 'emergency_component' in d
assert 'esi_component' in d
assert 'final_score' in d
print('test_to_dict passed')

print('All scoring tests passed!')