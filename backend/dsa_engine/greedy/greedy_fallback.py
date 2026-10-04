#!/usr/bin/env python3
"""
Greedy Fallback Allocator for Panacea Vault

After the 0/1 Knapsack stage, remaining budget is used for a deterministic
greedy fallback to fund additional eligible packages that fit.

The greedy stage:
- Respects remaining budget
- Respects eligibility (already filtered)
- Respects emergency reserve (separate budget)
- Prevents duplicate allocations (excludes already selected)
- Produces deterministic results (sorted by urgency/cost ratio)
- Records decisions for audit trail

Does NOT claim global optimality - it's a practical fallback.
"""

from dataclasses import dataclass
from typing import List, Optional, Set
from dsa_engine.knapsack.knapsack_solver import KnapsackItem


@dataclass
class GreedyResult:
    """Result of greedy fallback allocation"""
    selected_items: List[KnapsackItem]
    total_weight: int
    total_value: float
    remaining_capacity: int
    selected_request_ids: List[int]
    allocation_order: List[int]  # Order of selection


class GreedyFallback:
    """
    Deterministic greedy fallback allocator.

    Strategy: Sort by urgency/cost ratio (value density) descending,
    then select items that fit in remaining budget.
    """

    def __init__(self, remaining_budget_inr: int, emergency_reserve_inr: int = 0):
        """
        Initialize greedy allocator.

        Args:
            remaining_budget_inr: Budget remaining after knapsack
            emergency_reserve_inr: Emergency reserve (kept separate, not used here)
        """
        self.remaining_budget_inr = remaining_budget_inr
        self.emergency_reserve_inr = emergency_reserve_inr
        self.normal_budget_inr = remaining_budget_inr  # Greedy uses normal budget only

    def solve(self, items: List[KnapsackItem], exclude_ids: Set[int] = None) -> GreedyResult:
        """
        Run greedy allocation on remaining items.

        Args:
            items: List of all eligible items
            exclude_ids: Set of request_ids already allocated (from knapsack)

        Returns:
            GreedyResult with selected items and metrics
        """
        if exclude_ids is None:
            exclude_ids = set()

        # Filter out already allocated items
        available_items = [item for item in items if item.request_id not in exclude_ids]

        if not available_items or self.normal_budget_inr <= 0:
            return GreedyResult(
                selected_items=[],
                total_weight=0,
                total_value=0.0,
                remaining_capacity=self.normal_budget_inr,
                selected_request_ids=[],
                allocation_order=[]
            )

        # Sort by value density (urgency/cost) descending for maximum efficiency
        # Tiebreaker: higher urgency first, then lower cost
        def sort_key(item):
            density = item.value / item.weight if item.weight > 0 else 0
            return (-density, -item.value, item.weight)

        sorted_items = sorted(available_items, key=sort_key)

        selected = []
        total_weight = 0
        total_value = 0.0
        allocation_order = []
        remaining = self.normal_budget_inr

        for item in sorted_items:
            if item.weight <= remaining:
                selected.append(item)
                total_weight += item.weight
                total_value += item.value
                remaining -= item.weight
                allocation_order.append(item.request_id)

        return GreedyResult(
            selected_items=selected,
            total_weight=total_weight,
            total_value=total_value,
            remaining_capacity=remaining,
            selected_request_ids=[item.request_id for item in selected],
            allocation_order=allocation_order
        )

    def solve_with_details(self, items: List[KnapsackItem], exclude_ids: Set[int] = None) -> dict:
        """
        Run greedy allocation and return detailed breakdown.

        Args:
            items: List of all eligible items
            exclude_ids: Set of request_ids already allocated

        Returns:
            Dictionary with full allocation details
        """
        result = self.solve(items, exclude_ids)

        if exclude_ids is None:
            exclude_ids = set()

        available_items = [item for item in items if item.request_id not in exclude_ids]
        not_selected = [item for item in available_items if item.request_id not in result.selected_request_ids]

        return {
            "algorithm": "GREEDY_FALLBACK_VALUE_DENSITY",
            "available_budget_inr": self.normal_budget_inr,
            "emergency_reserve_inr": self.emergency_reserve_inr,
            "total_available_items": len(available_items),
            "selected_count": len(result.selected_items),
            "not_selected_count": len(not_selected),
            "total_allocated_inr": result.total_weight,
            "total_urgency_funded": round(result.total_value, 2),
            "remaining_budget_inr": result.remaining_capacity,
            "budget_utilization_pct": round((result.total_weight / self.normal_budget_inr) * 100, 2) if self.normal_budget_inr > 0 else 0,
            "selection_strategy": "value_density_descending",
            "allocation_order": result.allocation_order,
            "selected_requests": [
                {
                    "request_id": item.request_id,
                    "request_code": item.request_code,
                    "patient_id": item.patient_id,
                    "cost_inr": item.weight,
                    "urgency_score": item.value,
                    "value_density": round(item.value / item.weight, 4) if item.weight > 0 else 0,
                    "selection_order": idx + 1
                }
                for idx, item in enumerate(result.selected_items)
            ],
            "not_selected_requests": [
                {
                    "request_id": item.request_id,
                    "request_code": item.request_code,
                    "patient_id": item.patient_id,
                    "cost_inr": item.weight,
                    "urgency_score": item.value,
                    "value_density": round(item.value / item.weight, 4) if item.weight > 0 else 0,
                    "reason": "Did not fit in remaining budget" if item.weight > result.remaining_capacity + result.total_weight else "Lower priority"
                }
                for item in not_selected
            ]
        }


def run_greedy_fallback(
    all_items: List[KnapsackItem],
    knapsack_result,
    remaining_budget_inr: int,
    emergency_reserve_inr: int = 0
) -> dict:
    """
    Convenience function to run greedy fallback after knapsack.

    Args:
        all_items: All eligible items
        knapsack_result: Result from knapsack solver
        remaining_budget_inr: Budget remaining after knapsack
        emergency_reserve_inr: Emergency reserve amount

    Returns:
        Detailed greedy result dictionary
    """
    exclude_ids = set(knapsack_result.selected_request_ids)
    greedy = GreedyFallback(remaining_budget_inr, emergency_reserve_inr)
    return greedy.solve_with_details(all_items, exclude_ids)


# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    from knapsack.knapsack_solver import KnapsackItem, KnapsackSolver

    test_items = [
        KnapsackItem(1, "REQ-001", 500000, 95.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 300000, 85.0, 2, 2, 1),
        KnapsackItem(3, "REQ-003", 700000, 90.0, 3, 3, 2),
        KnapsackItem(4, "REQ-004", 200000, 75.0, 4, 4, 2),
        KnapsackItem(5, "REQ-005", 400000, 80.0, 5, 5, 1),
        KnapsackItem(6, "REQ-006", 150000, 70.0, 6, 1, 1),
        KnapsackItem(7, "REQ-007", 250000, 65.0, 7, 2, 2),
    ]

    budget = 1000000
    solver = KnapsackSolver(budget, currency_scale=10000)
    knapsack_result = solver.solve(test_items)

    print("=== Knapsack Result ===")
    print(f"Selected: {[item.request_code for item in knapsack_result.selected_items]}")
    print(f"Remaining Budget: ₹{knapsack_result.remaining_capacity:,}")

    # Run greedy fallback
    greedy = GreedyFallback(knapsack_result.remaining_capacity)
    greedy_result = greedy.solve_with_details(test_items, set(knapsack_result.selected_request_ids))

    print("\n=== Greedy Fallback Result ===")
    print(f"Available Budget: ₹{greedy_result['available_budget_inr']:,}")
    print(f"Selected: {greedy_result['selected_count']} requests")
    print(f"Total Allocated: ₹{greedy_result['total_allocated_inr']:,}")
    print(f"Total Urgency: {greedy_result['total_urgency_funded']}")
    print(f"Remaining: ₹{greedy_result['remaining_budget_inr']:,}")
    print(f"Utilization: {greedy_result['budget_utilization_pct']}%")
    print("\nSelected (in order):")
    for sel in greedy_result['selected_requests']:
        print(f"  {sel['selection_order']}. {sel['request_code']}: ₹{sel['cost_inr']:,} (Urgency: {sel['urgency_score']}, Density: {sel['value_density']})")