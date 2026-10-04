import sys
sys.path.insert(0, 'D:/Panacea_Vault/dsa-engine')
from knapsack.knapsack_solver import KnapsackSolver, KnapsackItem

# Test empty input
solver = KnapsackSolver(1000000)
result = solver.solve([])
assert result.selected_items == []
assert result.total_weight == 0
assert result.total_value == 0.0
assert result.remaining_capacity == 1000000
print('test_empty_input passed')

# Test zero budget
items = [
    KnapsackItem(1, 'REQ-001', 100000, 90.0, 1, 1, 1),
    KnapsackItem(2, 'REQ-002', 200000, 85.0, 2, 2, 1),
]
solver = KnapsackSolver(0)
result = solver.solve(items)
assert result.selected_items == []
assert result.total_weight == 0
assert result.remaining_capacity == 0
print('test_zero_budget passed')

# Test one item fits
items = [KnapsackItem(1, 'REQ-001', 500000, 90.0, 1, 1, 1)]
solver = KnapsackSolver(1000000)
result = solver.solve(items)
assert len(result.selected_items) == 1
assert result.selected_items[0].request_id == 1
assert result.total_weight == 500000
assert result.total_value == 90.0
assert result.remaining_capacity == 500000
print('test_one_item_fits passed')

# Test one item exceeds
items = [KnapsackItem(1, 'REQ-001', 1500000, 90.0, 1, 1, 1)]
solver = KnapsackSolver(1000000)
result = solver.solve(items)
assert len(result.selected_items) == 0
assert result.total_weight == 0
assert result.remaining_capacity == 1000000
print('test_one_item_exceeds passed')

print('All knapsack tests passed!')