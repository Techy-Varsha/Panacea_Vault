#!/usr/bin/env python3
"""
Urgency Scoring Engine for Panacea Vault

Centralized scoring service that calculates urgency scores from dataset fields.
Does not allow manual entry of arbitrary final scores.

Scoring components (from Synthetic_Queue.csv):
- prototype_base_severity (from ICD_Severity.csv): 50-99
- ttc_category -> ttc_points_30: Time to treatment criticality (0-30)
- success_rate -> success_rate_points_20: Success probability (0-20)
- age_factor_points_10: Age-based adjustment (0-10)
- waiting_boost: +5 per waiting cycle/day (configurable)
- esi_component: Emergency severity index (for emergency requests)
- emergency_component: Additional emergency boost

Final score = base_severity + ttc_component + success_rate_component + age_component + waiting_boost + emergency_component
Capped at 100.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
from enum import Enum


class TTCategory(Enum):
    """Time-to-treatment categories and their points"""
    UNDER_2H = ("<2h", 30)
    TWO_TO_6H = ("2-6h", 25)
    ONE_TO_3D = ("1-3d", 10)
    THREE_TO_7D = ("3-7d", 5)
    OVER_7D = ("7d+", 0)

    def __init__(self, category: str, points: int):
        self.category = category
        self.points = points

    @classmethod
    def get_points(cls, category: str) -> int:
        for ttc in cls:
            if ttc.category == category:
                return ttc.points
        return 0


# Configuration constants
WAITING_TIME_BOOST = 5  # +5 urgency points per eligible waiting cycle/day
EMERGENCY_RESERVE_PERCENT = 15  # 15% of daily funding budget
MAX_URGENCY_SCORE = 100


@dataclass
class UrgencyScoreBreakdown:
    """Detailed breakdown of urgency score calculation"""
    base_severity: int
    ttc_component: int
    success_rate_component: float
    age_component: int
    waiting_boost: int
    emergency_component: int
    esi_component: int = 0
    final_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_severity": self.base_severity,
            "ttc_component": self.ttc_component,
            "success_rate_component": round(self.success_rate_component, 2),
            "age_component": self.age_component,
            "waiting_boost": self.waiting_boost,
            "emergency_component": self.emergency_component,
            "esi_component": self.esi_component,
            "final_score": round(self.final_score, 2)
        }


@dataclass
class ScoringInput:
    """Input data for scoring calculation"""
    icd10_category: str
    prototype_base_severity: int
    ttc_category: str
    success_rate: float
    age: int
    age_factor_points_10: int
    waiting_days: int = 0
    is_emergency: bool = False
    esi_level: Optional[int] = None


class UrgencyScorer:
    """
    Centralized urgency scoring service.

    All scoring logic is here - no scattered scoring in frontend or API handlers.
    """

    def __init__(self, waiting_boost_per_day: int = WAITING_TIME_BOOST):
        self.waiting_boost_per_day = waiting_boost_per_day

    def calculate(self, input_data: ScoringInput) -> UrgencyScoreBreakdown:
        """
        Calculate urgency score from input data.

        Args:
            input_data: ScoringInput with all required fields

        Returns:
            UrgencyScoreBreakdown with detailed components
        """
        # Base severity from ICD mapping
        base_severity = input_data.prototype_base_severity

        # Time-to-treatment component
        ttc_component = TTCategory.get_points(input_data.ttc_category)

        # Success rate component (already pre-calculated in dataset as 0-20)
        success_rate_component = input_data.success_rate * 20  # Convert 0-1 to 0-20 scale
        # Or use pre-calculated points from dataset
        success_rate_component = float(input_data.age_factor_points_10 * 2)  # This seems wrong - need to check

        # Actually, from the dataset: success_rate_points_20 is already calculated
        # Let me use the pre-calculated value if available, otherwise compute
        # For now, compute from success_rate
        success_rate_component = round(input_data.success_rate * 20, 2)

        # Age component (already pre-calculated as 0-10)
        age_component = input_data.age_factor_points_10

        # Waiting time boost
        waiting_boost = input_data.waiting_days * self.waiting_boost_per_day

        # Emergency components
        emergency_component = 0
        esi_component = 0
        if input_data.is_emergency and input_data.esi_level:
            # ESI level 1=most urgent (30 pts), 5=least (0 pts)
            esi_map = {1: 30, 2: 20, 3: 10, 4: 5, 5: 0}
            esi_component = esi_map.get(input_data.esi_level, 0)
            emergency_component = 15  # Base emergency boost

        # Calculate final score
        final_score = (
            base_severity +
            ttc_component +
            success_rate_component +
            age_component +
            waiting_boost +
            emergency_component +
            esi_component
        )

        # Cap at maximum
        final_score = min(final_score, MAX_URGENCY_SCORE)

        return UrgencyScoreBreakdown(
            base_severity=base_severity,
            ttc_component=ttc_component,
            success_rate_component=success_rate_component,
            age_component=age_component,
            waiting_boost=waiting_boost,
            emergency_component=emergency_component,
            esi_component=esi_component,
            final_score=final_score
        )

    def calculate_from_request(self, request: Dict[str, Any]) -> UrgencyScoreBreakdown:
        """
        Calculate score from a funding request dictionary (from database).

        Args:
            request: Dictionary with funding request fields

        Returns:
            UrgencyScoreBreakdown
        """
        input_data = ScoringInput(
            icd10_category=request.get('icd10_category', ''),
            prototype_base_severity=request.get('prototype_base_severity', 50),
            ttc_category=request.get('ttc_category', '7d+'),
            success_rate=request.get('success_rate', 0.5),
            age=request.get('age', 50),
            age_factor_points_10=request.get('age_factor_points_10', 5),
            waiting_days=request.get('waiting_days', 0),
            is_emergency=request.get('is_emergency', False),
            esi_level=request.get('esi_level')
        )
        return self.calculate(input_data)

    def calculate_waiting_boost(self, waiting_days: int) -> int:
        """Calculate waiting time boost separately."""
        return waiting_days * self.waiting_boost_per_day


def calculate_urgency_score(
    base_severity: int,
    ttc_category: str,
    success_rate: float,
    age_factor_points: int,
    waiting_days: int = 0,
    is_emergency: bool = False,
    esi_level: Optional[int] = None,
    waiting_boost_per_day: int = WAITING_TIME_BOOST
) -> Dict[str, Any]:
    """
    Standalone function for calculating urgency score.

    Args:
        base_severity: ICD prototype base severity (50-99)
        ttc_category: Time-to-treatment category
        success_rate: Success probability (0.0-1.0)
        age_factor_points: Age factor points (0-10)
        waiting_days: Days waiting for allocation
        is_emergency: Whether this is an emergency request
        esi_level: ESI level (1-5) for emergencies
        waiting_boost_per_day: Boost per waiting day

    Returns:
        Dictionary with score breakdown
    """
    scorer = UrgencyScorer(waiting_boost_per_day)
    input_data = ScoringInput(
        icd10_category='',
        prototype_base_severity=base_severity,
        ttc_category=ttc_category,
        success_rate=success_rate,
        age=0,
        age_factor_points_10=age_factor_points,
        waiting_days=waiting_days,
        is_emergency=is_emergency,
        esi_level=esi_level
    )
    return scorer.calculate(input_data).to_dict()


# Example usage and testing
if __name__ == "__main__":
    scorer = UrgencyScorer()

    # Test case 1: Regular request
    test1 = ScoringInput(
        icd10_category="I61",
        prototype_base_severity=98,
        ttc_category="2-6h",
        success_rate=0.65,
        age=45,
        age_factor_points_10=8,
        waiting_days=3
    )
    result1 = scorer.calculate(test1)
    print("=== Test 1: Regular Request ===")
    for k, v in result1.to_dict().items():
        print(f"  {k}: {v}")

    # Test case 2: Emergency request
    test2 = ScoringInput(
        icd10_category="I21",
        prototype_base_severity=95,
        ttc_category="<2h",
        success_rate=0.85,
        age=55,
        age_factor_points_10=6,
        waiting_days=0,
        is_emergency=True,
        esi_level=1
    )
    result2 = scorer.calculate(test2)
    print("\n=== Test 2: Emergency Request (ESI-1) ===")
    for k, v in result2.to_dict().items():
        print(f"  {k}: {v}")

    # Test case 3: Long waiting time
    test3 = ScoringInput(
        icd10_category="K35",
        prototype_base_severity=70,
        ttc_category="1-3d",
        success_rate=0.90,
        age=30,
        age_factor_points_10=9,
        waiting_days=10
    )
    result3 = scorer.calculate(test3)
    print("\n=== Test 3: Long Wait (10 days) ===")
    for k, v in result3.to_dict().items():
        print(f"  {k}: {v}")