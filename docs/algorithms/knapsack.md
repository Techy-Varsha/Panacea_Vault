# Panacea Vault - 0/1 Knapsack Algorithm Documentation

## Overview

The 0/1 Knapsack algorithm is the primary allocation engine for Panacea Vault. It selects the optimal subset of treatment requests to maximize total urgency score within the available normal budget (85% of daily budget after 15% emergency reserve).

## Mathematical Formulation

### Problem Definition

Given:
- N treatment requests (items)
- Each request i has:
  - Weight wᵢ = funding_gap_inr (complete treatment package cost after surety)
  - Value vᵢ = urgency_score (0-100)
- Budget capacity W = normal_budget_inr

Find binary variables xᵢ ∈ {0,1} that maximize:

```
Maximize: Σ(vᵢ × xᵢ)  for i = 1 to N
Subject to: Σ(wᵢ × xᵢ) ≤ W
```

### Dynamic Programming Solution

**Recurrence Relation:**

Let DP[i][w] = maximum urgency value achievable using first i items with capacity w.

```
DP[i][w] = max(
    DP[i-1][w],                              // Don't include item i
    DP[i-1][w - wᵢ] + vᵢ   if wᵢ ≤ w        // Include item i
)
```

**Base Cases:**
- DP[0][w] = 0 for all w (no items = zero value)
- DP[i][0] = 0 for all i (zero capacity = zero value)

**Backtracking:**
To recover selected items, trace from DP[N][W]:
- If DP[i][w] ≠ DP[i-1][w], item i was selected
- Move to DP[i-1][w - wᵢ]
- Continue until i = 0 or w = 0

## Currency Scaling Strategy

### Problem
Raw INR values (e.g., 1,000,000) create massive DP tables:
- O(N × 1,000,000) memory/time is infeasible

### Solution: Currency Scaling
```
scaled_weight = weight_inr // currency_scale
scaled_capacity = budget_inr // currency_scale
```

Default `currency_scale = 10000` (10,000 INR = 1 unit)

Example:
- Budget: 50,000,000 INR → Scaled: 5,000 units
- Request: 2,500,000 INR → Scaled: 250 units
- DP Table: O(N × 5,000) instead of O(N × 50,000,000)

### Trade-offs
- **Precision Loss**: Amounts rounded down to nearest 10,000 INR
- **Mitigation**: Use smaller scale (1000 or 100) for smaller budgets
- **Configuration**: `KNAPSACK_CURRENCY_SCALE` in settings

## Implementation Details

### KnapsackItem Dataclass
```python
@dataclass
class KnapsackItem:
    request_id: int           # Database PK
    request_code: str         # REQ-XXXXXX
    weight: int               # funding_gap_inr (scaled internally)
    value: float              # urgency_score
    patient_id: int
    disease_id: int
    hospital_id: int
    is_emergency: bool = False
```

### KnapsackResult Dataclass
```python
@dataclass
class KnapsackResult:
    selected_items: List[KnapsackItem]
    total_weight: int         # Actual INR (not scaled)
    total_value: float        # Sum of urgency scores
    remaining_capacity: int   # Actual INR
    selected_request_ids: List[int]
```

### KnapsackSolver Class
```python
class KnapsackSolver:
    def __init__(self, budget_inr: int, currency_scale: int = 10000):
        self.budget_inr = budget_inr
        self.currency_scale = currency_scale
        self.scaled_budget = budget_inr // currency_scale
    
    def solve(self, items: List[KnapsackItem]) -> KnapsackResult:
        # Filter items that exceed budget
        valid_items = [item for item in items if item.weight <= self.budget_inr]
        
        # Scale weights
        scaled_items = [
            (item, item.weight // self.currency_scale) 
            for item in valid_items
        ]
        
        # DP array: 1D space optimization
        dp = [0.0] * (self.scaled_budget + 1)
        # Track selections for backtracking
        keep = [[False] * (self.scaled_budget + 1) for _ in range(len(scaled_items) + 1)]
        
        # Fill DP table
        for i, (item, scaled_w) in enumerate(scaled_items, 1):
            for w in range(self.scaled_budget, scaled_w - 1, -1):
                new_val = dp[w - scaled_w] + item.value
                if new_val > dp[w]:
                    dp[w] = new_val
                    keep[i][w] = True
        
        # Backtrack to find selected items
        selected = []
        w = self.scaled_budget
        for i in range(len(scaled_items), 0, -1):
            if keep[i][w]:
                selected.append(scaled_items[i-1][0])
                w -= scaled_items[i-1][1]
        
        selected.reverse()
        
        # Calculate actual (non-scaled) totals
        total_weight = sum(item.weight for item in selected)
        total_value = sum(item.value for item in selected)
        
        return KnapsackResult(
            selected_items=selected,
            total_weight=total_weight,
            total_value=total_value,
            remaining_capacity=self.budget_inr - total_weight,
            selected_request_ids=[item.request_id for item in selected]
        )
```

## Complexity Analysis

| Metric | Complexity |
|--------|------------|
| Time | O(N × W_scaled) |
| Space | O(W_scaled) for DP array, O(N × W_scaled) for backtracking |
| Where | N = eligible requests, W_scaled = budget_inr / currency_scale |

### Typical Values
- N: 50-500 requests
- Budget: 10M-100M INR
- Scale: 10,000
- W_scaled: 1,000-10,000
- Operations: 50K-5M (very fast)

## Edge Cases Handled

1. **Empty Items List** → Returns empty result, full budget remaining
2. **Zero Budget** → Returns empty result
3. **All Items Exceed Budget** → Returns empty result
4. **Exact Budget Match** → Returns optimal combination
5. **Duplicate Request IDs** → Not expected (validated at DB level)
6. **Negative Weights** → Not possible (funding_gap ≥ 0)

## Integration Points

### From Allocation API
```python
# In allocation.py
items = create_items_from_requests(eligible_requests)
solver = KnapsackSolver(budget.normal_budget_inr, settings.KNAPSACK_CURRENCY_SCALE)
knapsack_result = solver.solve(items)
```

### To Greedy Fallback
```python
# Remaining budget passed to greedy
remaining = budget.normal_budget_inr - knapsack_result.total_weight
greedy_result = run_greedy_fallback(remaining, items, knapsack_result.selected_request_ids)
```

## Testing

### Unit Tests (dsa-engine/tests/test_knapsack.py)
- Empty input
- Zero budget
- Single item fits/exceeds
- Multiple combinations
- Optimal selection verification
- Backtracking correctness
- Remaining budget calculation
- Currency scaling behavior

### Test Command
```bash
python -m pytest dsa-engine/tests/test_knapsack.py -v
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| KNAPSACK_CURRENCY_SCALE | 10000 | INR to DP units |
| MAX_URGENCY_SCORE | 100 | Score cap |

## Limitations & Future Improvements

1. **Scaling Precision**: For very small budgets, use smaller scale
2. **Large N**: For N > 1000, consider approximation algorithms
3. **Multi-objective**: Currently single-objective (urgency); could add equity constraints
4. **Real-time**: Current implementation is batch; streaming version for real-time would need different approach

## References

- Cormen et al., "Introduction to Algorithms", Chapter 15 (Dynamic Programming)
- Martello & Toth, "Knapsack Problems: Algorithms and Computer Implementations"