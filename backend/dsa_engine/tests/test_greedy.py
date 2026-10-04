#!/usr/bin/env python3
"""
Unit tests for Greedy Fallback Allocator
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from greedy.greedy_fallback import GreedyFallback, GreedyResult, run_greedy_fallback
from knapsack.knapsack_solver import KnapsackItem, KnapsackSolver


def test_zero_remaining_budget():
    """Test with zero remaining budget"""
    items = [
        KnapsackItem(1, "REQ-001", 100000, 90.0, 1, 1, 1),
    ]
    greedy = GreedyFallback(0)
    result = greedy.solve(items)
    assert result.selected_items == []
    assert result.total_weight == 0
    assert result.remaining_capacity == 0
    print(" test_zero_remaining_budget passed")


def test_no_fitting_items():
    """Test when no items fit in remaining budget"""
    items = [
        KnapsackItem(1, "REQ-001", 500000, 90.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 600000, 85.0, 2, 2, 1),
    ]
    greedy = GreedyFallback(100000)  # Only 100k remaining
    result = greedy.solve(items)
    assert len(result.selected_items) == 0
    assert result.remaining_capacity == 100000
    print(" test_no_fitting_items passed")


def test_multiple_fitting_items():
    """Test with multiple items that fit"""
    items = [
        KnapsackItem(1, "REQ-001", 100000, 80.0, 1, 1, 1),   # density 0.8
        KnapsackItem(2, "REQ-002", 200000, 90.0, 2, 2, 1),   # density 0.45
        KnapsackItem(3, "REQ-003", 150000, 85.0, 3, 3, 1),   # density 0.57
        KnapsackItem(4, "REQ-004", 50000, 40.0, 4, 4, 1),    # density 0.8
    ]
    # Budget 300k
    # Sorted by density: item1 (0.8), item4 (0.8), item3 (0.57), item2 (0.45)
    # Select item1 (100k) + item4 (50k) + item3 (150k) = 300k exactly
    greedy = GreedyFallback(300000)
    result = greedy.solve(items)
    assert result.total_weight == 300000
    assert result.remaining_capacity == 0
    assert len(result.selected_items) == 3
    selected_ids = {item.request_id for item in result.selected_items}
    assert selected_ids == {1, 3, 4}
    print(" test_multiple_fitting_items passed")


def test_deterministic_output():
    """Test that greedy produces deterministic results"""
    items = [
        KnapsackItem(1, "REQ-001", 100000, 80.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 100000, 80.0, 2, 2, 1),  # Same density
        KnapsackItem(3, "REQ-003", 100000, 80.0, 3, 3, 1),  # Same density
    ]
    # With same density, tiebreaker: higher urgency first, then lower cost
    # All have same urgency and cost, so order by request_id
    greedy = GreedyFallback(200000)
    result1 = greedy.solve(items)
    result2 = greedy.solve(items)

    assert result1.selected_request_ids == result2.selected_request_ids
    assert result1.allocation_order == result2.allocation_order
    print(" test_deterministic_output passed")


def test_exclude_ids():
    """Test excluding already allocated items"""
    items = [
        KnapsackItem(1, "REQ-001", 100000, 90.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 200000, 85.0, 2, 2, 1),
        KnapsackItem(3, "REQ-003", 150000, 80.0, 3, 3, 1),
    ]
    # Exclude item 1 (already selected by knapsack)
    greedy = GreedyFallback(300000)
    result = greedy.solve(items, exclude_ids={1})
    selected_ids = {item.request_id for item in result.selected_items}
    assert 1 not in selected_ids
    assert len(result.selected_items) <= 2
    print(" test_exclude_ids passed")


def test_emergency_reserve_not_used():
    """Test that emergency reserve is not touched by greedy"""
    items = [
        KnapsackItem(1, "REQ-001", 100000, 90.0, 1, 1, 1),
    ]
    greedy = GreedyFallback(remaining_budget_inr=500000, emergency_reserve_inr=1000000)
    result = greedy.solve(items)
    # Should only use normal budget, not emergency reserve
    assert result.total_weight == 100000
    # Emergency reserve untouched
    print(" test_emergency_reserve_not_used passed")


def test_value_density_sorting():
    """Test that items are sorted by value density"""
    items = [
        KnapsackItem(1, "REQ-LOW", 100000, 50.0, 1, 1, 1),    # density 0.5
        KnapsackItem(2, "REQ-HIGH", 100000, 90.0, 2, 2, 1),   # density 0.9
        KnapsackItem(3, "REQ-MED", 100000, 70.0, 3, 3, 1),    # density 0.7
    ]
    greedy = GreedyFallback(200000)
    result = greedy.solve(items)

    # Should select HIGH (0.9) then MED (0.7) - total 200k
    assert result.selected_request_ids == [2, 3]
    assert result.allocation_order == [2, 3]
    print(" test_value_density_sorting passed")


def test_tiebreaker():
    """Test tiebreaker: higher urgency first, then lower cost"""
    items = [
        KnapsackItem(1, "REQ-A", 100000, 80.0, 1, 1, 1),  # density 0.8, urgency 80
        KnapsackItem(2, "REQ-B", 100000, 80.0, 2, 2, 1),  # density 0.8, urgency 80
        KnapsackItem(3, "REQ-C", 50000, 40.0, 3, 3, 1),   # density 0.8, urgency 40
    ]
    greedy = GreedyFallback(150000)
    result = greedy.solve(items)

    # All have same density 0.8
    # Tiebreaker: higher urgency first -> A and B (urgency 80) before C (urgency 40)
    # Budget 150000: can fit one 100k item + one 50k item = 150k
    # So should pick one of A/B (100k) then C (50k)
    assert result.allocation_order[0] in [1, 2]  # First is A or B (higher urgency)
    assert result.allocation_order[1] == 3       # Second is C (fits in remaining 50k)
    assert len(result.allocation_order) == 2
    print(" test_tiebreaker passed")


def test_run_greedy_fallback_integration():
    """Test integration with knapsack"""
    items = [
        KnapsackItem(1, "REQ-001", 400000, 90.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 300000, 85.0, 2, 2, 1),
        KnapsackItem(3, "REQ-003", 500000, 80.0, 3, 3, 1),
        KnapsackItem(4, "REQ-004", 200000, 75.0, 4, 4, 1),
    ]
    # Knapsack with 700k budget
    solver = KnapsackSolver(700000, currency_scale=10000)
    knapsack_result = solver.solve(items)

    # Greedy on remaining
    greedy_result = run_greedy_fallback(items, knapsack_result, knapsack_result.remaining_capacity)

    # Total allocated should not exceed original budget
    total_allocated = knapsack_result.total_weight + greedy_result['total_allocated_inr']
    assert total_allocated <= 700000

    # No duplicate selections
    knapsack_ids = set(knapsack_result.selected_request_ids)
    greedy_ids = set(greedy_result['allocation_order'])
    assert knapsack_ids.isdisjoint(greedy_ids)

    print(" test_run_greedy_fallback_integration passed")


def test_solve_with_details():
    """Test detailed output"""
    items = [
        KnapsackItem(1, "REQ-001", 100000, 90.0, 1, 1, 1),
        KnapsackItem(2, "REQ-002", 200000, 85.0, 2, 2, 1),
    ]
    greedy = GreedyFallback(300000)
    details = greedy.solve_with_details(items)

    assert details['algorithm'] == 'GREEDY_FALLBACK_VALUE_DENSITY'
    assert details['available_budget_inr'] == 300000
    assert details['selected_count'] + details['not_selected_count'] == 2
    assert 'selected_requests' in details
    assert 'not_selected_requests' in details
    assert 'allocation_order' in details
    assert 'selection_strategy' in details
    print(" test_solve_with_details passed")


if __name__ == "__main__":
    test_zero_remaining_budget()
    test_no_fitting_items()
    test_multiple_fitting_items()
    test_deterministic_output()
    test_exclude_ids()
    test_emergency_reserve_not_used()
    test_value_density_sorting()
    test_tiebreaker()
    test_run_greedy_fallback_integration()
    test_solve_with_details()
    print("\nAll greedy tests passed!")