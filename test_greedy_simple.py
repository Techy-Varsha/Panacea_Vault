import sys
sys.path.insert(0, 'D:/Panacea_Vault/dsa-engine')
from greedy.greedy_fallback import GreedyFallback
from knapsack.knapsack_solver import KnapsackItem

# Test zero remaining budget
items = [
    KnapsackItem(1, 'REQ-001', 100000, 90.0, 1, 1, 1),
]
greedy = GreedyFallback(0)
result = greedy.solve(items)
assert result.selected_items == []
assert result.total_weight == 0
assert result.remaining_capacity == 0
print('test_zero_remaining_budget passed')

# Test no fitting items
items = [
    KnapsackItem(1, 'REQ-001', 500000, 90.0, 1, 1, 1),
    KnapsackItem(2, 'REQ-002', 600000, 85.0, 2, 2, 1),
]
greedy = GreedyFallback(100000)
result = greedy.solve(items)
assert len(result.selected_items) == 0
assert result.remaining_capacity == 100000
print('test_no_fitting_items passed')

# Test multiple fitting items
items = [
    KnapsackItem(1, 'REQ-001', 100000, 80.0, 1, 1, 1),   # density 0.8
    KnapsackItem(2, 'REQ-002', 200000, 90.0, 2, 2, 1),   # density 0.45
    KnapsackItem(3, 'REQ-003', 150000, 85.0, 3, 3, 1),   # density 0.57
    KnapsackItem(4, 'REQ-004', 50000, 40.0, 4, 4, 1),    # density 0.8
]
greedy = GreedyFallback(300000)
result = greedy.solve(items)
assert result.total_weight == 300000
assert len(result.selected_items) == 3
# Sorted by density: item1 (0.8), item4 (0.8), item3 (0.57), item2 (0.45)
# Select item1 (100k) + item4 (50k) + item3 (150k) = 300k exactly
selected_ids = [item.request_id for item in result.selected_items]
assert 1 in selected_ids  # item1
assert 4 in selected_ids  # item4
assert 3 in selected_ids  # item3
assert 2 not in selected_ids  # item2 doesn't fit
print('test_multiple_fitting_items passed')

# Test deterministic output
greedy1 = GreedyFallback(300000)
result1 = greedy1.solve(items)
greedy2 = GreedyFallback(300000)
result2 = greedy2.solve(items)
ids1 = [item.request_id for item in result1.selected_items]
ids2 = [item.request_id for item in result2.selected_items]
assert ids1 == ids2, f'Non-deterministic: {ids1} != {ids2}'
print('test_deterministic_output passed')

# Test exclude_ids
items = [
    KnapsackItem(1, 'REQ-001', 100000, 80.0, 1, 1, 1),
    KnapsackItem(2, 'REQ-002', 200000, 90.0, 2, 2, 1),
]
greedy = GreedyFallback(300000)
result = greedy.solve(items, exclude_ids={1})
assert len(result.selected_items) == 1
assert result.selected_items[0].request_id == 2
print('test_exclude_ids passed')

print('All greedy tests passed!')