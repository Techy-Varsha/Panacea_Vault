#!/usr/bin/env python3
"""
0/1 Knapsack Solver for Panacea Vault Allocation Engine

Implements genuine 0/1 Knapsack Dynamic Programming:
- Each treatment request is an item
- Weight = complete treatment package cost (funding_gap_inr)
- Value = urgency score
- Constraint = available budget
- Objective = maximize total urgency value

Mathematically:
maximize: Σ(value_i × x_i)
subject to: Σ(weight_i × x_i) <= Budget
where: x_i ∈ {0,1}

Complexity: O(N × W) where N = number of eligible requests, W = budget capacity
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple
import math


@dataclass
class KnapsackItem:
    """Represents a treatment request as a knapsack item"""
    request_id: int
    request_code: str
    weight: int      # funding_gap_inr (cost)
    value: float     # urgency_score
    patient_id: int
    disease_id: int
    hospital_id: int
    is_emergency: bool = False


@dataclass
class KnapsackResult:
    """Result of knapsack optimization"""
    selected_items: List[KnapsackItem]
    total_weight: int
    total_value: float
    remaining_capacity: int
    selected_request_ids: List[int]


class KnapsackSolver:
    """
    0/1 Knapsack solver using dynamic programming with space optimization.

    For large budgets, uses currency scaling to keep DP table manageable.
    """

    def __init__(self, budget_inr: int, currency_scale: int = 1000):
        """
        Initialize solver.

        Args:
            budget_inr: Available budget in INR
            currency_scale: Scaling factor for currency (default 1000 = scale to thousands)
                           This reduces DP table size from O(N * budget) to O(N * budget/scale)
        """
        self.budget_inr = budget_inr
        self.currency_scale = currency_scale
        self.scaled_budget = budget_inr // currency_scale

    def solve(self, items: List[KnapsackItem]) -> KnapsackResult:
        """
        Solve 0/1 Knapsack problem.

        Args:
            items: List of KnapsackItem objects

        Returns:
            KnapsackResult with selected items and metrics
        """
        if not items or self.scaled_budget <= 0:
            return KnapsackResult(
                selected_items=[],
                total_weight=0,
                total_value=0.0,
                remaining_capacity=self.budget_inr,
                selected_request_ids=[]
            )

        n = len(items)

        # Scale weights
        scaled_weights = [item.weight // self.currency_scale for item in items]
        values = [item.value for item in items]

        # DP table: dp[w] = max value achievable with capacity w
        # Use 1D array for space optimization
        dp = [0.0] * (self.scaled_budget + 1)
        # Keep track of selections for reconstruction
        keep = [[False] * (self.scaled_budget + 1) for _ in range(n)]

        # Fill DP table
        for i in range(n):
            w_i = scaled_weights[i]
            v_i = values[i]

            # Iterate backwards to avoid using item multiple times
            for w in range(self.scaled_budget, w_i - 1, -1):
                if dp[w - w_i] + v_i > dp[w]:
                    dp[w] = dp[w - w_i] + v_i
                    keep[i][w] = True

        # Reconstruct solution
        selected_indices = []
        w = self.scaled_budget
        for i in range(n - 1, -1, -1):
            if keep[i][w]:
                selected_indices.append(i)
                w -= scaled_weights[i]

        selected_indices.reverse()

        # Build result
        selected_items = [items[i] for i in selected_indices]
        total_weight = sum(item.weight for item in selected_items)
        total_value = sum(item.value for item in selected_items)
        remaining_capacity = self.budget_inr - total_weight
        selected_request_ids = [item.request_id for item in selected_items]

        return KnapsackResult(
            selected_items=selected_items,
            total_weight=total_weight,
            total_value=total_value,
            remaining_capacity=remaining_capacity,
            selected_request_ids=selected_request_ids
        )

    def solve_with_details(self, items: List[KnapsackItem]) -> dict:
        """
        Solve and return detailed breakdown for explainability.

        Returns:
            Dictionary with full allocation details
        """
        result = self.solve(items)

        # Items not selected
        selected_ids = set(result.selected_request_ids)
        not_selected = [item for item in items if item.request_id not in selected_ids]

        return {
            "algorithm": "0/1_KNAPSACK_DP",
            "budget_inr": self.budget_inr,
            "currency_scale": self.currency_scale,
            "scaled_budget": self.scaled_budget,
            "total_items": len(items),
            "selected_count": len(result.selected_items),
            "not_selected_count": len(not_selected),
            "total_allocated_inr": result.total_weight,
            "total_urgency_funded": round(result.total_value, 2),
            "remaining_budget_inr": result.remaining_capacity,
            "budget_utilization_pct": round((result.total_weight / self.budget_inr) * 100, 2) if self.budget_inr > 0 else 0,
            "selected_requests": [
                {
                    "request_id": item.request_id,
                    "request_code": item.request_code,
                    "patient_id": item.patient_id,
                    "cost_inr": item.weight,
                    "urgency_score": item.value,
                    "disease_id": item.disease_id,
                    "hospital_id": item.hospital_id
                }
                for item in result.selected_items
            ],
            "not_selected_requests": [
                {
                    "request_id": item.request_id,
                    "request_code": item.request_code,
                    "patient_id": item.patient_id,
                    "cost_inr": item.weight,
                    "urgency_score": item.value,
                    "reason": "Budget exceeded in optimal selection"
                }
                for item in not_selected
            ]
        }


def create_items_from_requests(requests: List[dict]) -> List[KnapsackItem]:
    """
    Factory function to create KnapsackItem objects from funding request data.

    Args:
        requests: List of funding request dictionaries from database

    Returns:
        List of KnapsackItem objects
    """
    items = []
    for req in requests:
        item = KnapsackItem(
            request_id=req['id'],
            request_code=req['request_code'],
            weight=int(req['funding_gap_inr']),
            value=float(req['urgency_score']),
            patient_id=req['patient_id'],
            disease_id=req['disease_id'],
            hospital_id=req['hospital_id'],
            is_emergency=req.get('is_emergency', False)
        )
        items.append(item)
    return items


# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    test_items = [
        KnapsackItem(1, "REQ-001", 500000, 95.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 300000, 85.0, 2, 2, 1),
        KnapsackItem(3, "REQ-003", 700000, 90.0, 3, 3, 2),
        KnapsackItem(4, "REQ-004", 200000, 75.0, 4, 4, 2),
        KnapsackItem(5, "REQ-005", 400000, 80.0, 5, 5, 1),
    ]

    budget = 1000000  # 10 lakh INR
    solver = KnapsackSolver(budget, currency_scale=10000)  # Scale to 10k units

    result = solver.solve_with_details(test_items)

    print("=== Knapsack Allocation Result ===")
    print(f"Budget: ₹{budget:,}")
    print(f"Selected: {result['selected_count']} requests")
    print(f"Total Allocated: ₹{result['total_allocated_inr']:,}")
    print(f"Total Urgency: {result['total_urgency_funded']}")
    print(f"Remaining: ₹{result['remaining_budget_inr']:,}")
    print(f"Utilization: {result['budget_utilization_pct']}%")
    print("\nSelected:")
    for sel in result['selected_requests']:
        print(f"  {sel['request_code']}: ₹{sel['cost_inr']:,} (Urgency: {sel['urgency_score']})")
    print("\nNot Selected:")
    for nsel in result['not_selected_requests']:
        print(f"  {nsel['request_code']}: ₹{nsel['cost_inr']:,} (Urgency: {nsel['urgency_score']}) - {nsel['reason']}")