# Panacea Vault - Greedy Fallback Algorithm Documentation

## Overview

The Greedy Fallback is the secondary allocation stage that runs after the 0/1 Knapsack. It uses the remaining budget (after Knapsack allocations) to fund additional eligible treatment packages that fit, using a value-density heuristic.

## Purpose

- Utilize otherwise-unused budget fragments
- Fund additional patients where packages fit in remaining budget
- Provide deterministic, explainable fallback
- Complement (not replace) the optimal Knapsack solution

## Algorithm

### Strategy: Value Density (Urgency per Cost)

```
value_density = urgency_score / funding_gap_inr
```

### Steps

1. **Input**: 
   - Remaining budget (after Knapsack)
   - Eligible requests (excluding already selected by Knapsack)
   - Emergency reserve amount (kept separate, not used)

2. **Filter**: Remove requests already selected in Knapsack stage

3. **Sort**: Descending by value_density (urgency_score / funding_gap_inr)

4. **Select**: Iterate sorted list, select each request that fits in remaining budget

5. **Update**: Subtract allocated amount from remaining budget

6. **Output**: Selected requests, total allocated, remaining budget

### Pseudocode

```
function greedy_fallback(remaining_budget, items, exclude_ids):
    # Filter out already selected
    candidates = [item for item in items if item.request_id not in exclude_ids]
    
    # Sort by value density (urgency per rupee) descending
    candidates.sort(key=lambda x: x.value / x.weight, reverse=True)
    
    selected = []
    total_weight = 0
    total_value = 0
    allocation_order = []
    
    for item in candidates:
        if item.weight <= remaining_budget - total_weight:
            selected.append(item)
            total_weight += item.weight
            total_value += item.value
            allocation_order.append(item.request_id)
    
    return GreedyResult(
        selected_items=selected,
        total_weight=total_weight,
        total_value=total_value,
        remaining_capacity=remaining_budget - total_weight,
        selected_request_ids=[item.request_id for item in selected],
        allocation_order=allocation_order
    )
```

## Why Value Density?

### Comparison of Greedy Strategies

| Strategy | Sort Key | Pros | Cons |
|----------|----------|------|------|
| Value Density | urgency/cost | Maximizes urgency per rupee | May skip high-urgency expensive items |
| Highest Urgency | urgency | Helps most critical first | May waste budget on few expensive items |
| Lowest Cost | cost | Funds maximum count | May fund low-urgency cases |
| Highest Value | urgency | Same as highest urgency | Same issues |

### Rationale for Value Density

1. **Budget Efficiency**: Maximizes urgency points per rupee spent
2. **Fairness**: Doesn't systematically favor expensive or cheap treatments
3. **Deterministic**: Same input → same output (stable sort)
4. **Explainable**: "We funded the most urgency per rupee"

## Deterministic Output

### Stability Guarantees

- Same input items → Same output selection
- Tie-breaking: Stable sort preserves original order
- No randomness in algorithm

### Implementation Detail

```python
# Python's sort is stable (Timsort)
candidates.sort(key=lambda x: x.value / x.weight, reverse=True)
# If two items have same density, original order preserved
```

## GreedyResult Dataclass

```python
@dataclass
class GreedyResult:
    selected_items: List[KnapsackItem]
    total_weight: int          # Actual INR allocated
    total_value: float         # Sum of urgency scores
    remaining_capacity: int    # Budget left unused
    selected_request_ids: List[int]
    allocation_order: List[int]  # Order of selection (for audit)
```

## Integration with Knapsack

### Budget Flow

```
Daily Budget (100%)
    │
    ├── Emergency Reserve (15%) ──→ Emergency Allocator (separate)
    │
    └── Normal Budget (85%)
            │
            ├── Knapsack Stage
            │   ├── Capacity: normal_budget
            │   ├── Output: knapsack_allocated, knapsack_selected
            │   └── Remaining: normal_budget - knapsack_allocated
            │
            └── Greedy Fallback Stage
                ├── Capacity: remaining_after_knapsack
                ├── Excludes: knapsack_selected
                └── Output: greedy_allocated, greedy_selected
```

### API Integration

```python
# In allocation.py
knapsack_result = solver.solve(items)

# Calculate remaining for greedy
remaining_budget = budget.normal_budget_inr - knapsack_result.total_weight
knapsack_selected_ids = set(knapsack_result.selected_request_ids)

# Run greedy fallback
greedy_result = run_greedy_fallback(
    remaining_budget_inr=remaining_budget,
    items=items,
    exclude_ids=knapsack_selected_ids
)
```

## Properties

### Guaranteed

- ✅ Never exceeds remaining budget
- ✅ Never selects already-allocated requests
- ✅ Never uses emergency reserve
- ✅ Deterministic output
- ✅ Records allocation order for audit

### NOT Guaranteed

- ❌ Global optimality (Knapsack is optimal for its stage)
- ❌ Maximum number of patients funded
- ❌ Maximum total urgency (that's Knapsack's job)

## Complexity Analysis

| Metric | Complexity |
|--------|------------|
| Time | O(N log N) for sorting |
| Space | O(N) for candidates list |
| Where | N = remaining eligible requests |

## Edge Cases

1. **Zero Remaining Budget** → Returns empty result
2. **No Fitting Items** → Returns empty result
3. **All Fit Exactly** → Returns all, budget = 0
4. **Single Item Fits** → Returns that item

## Testing

### Unit Tests (dsa-engine/tests/test_greedy.py)
- Zero remaining budget
- No fitting items
- Multiple fitting items
- Deterministic output
- Exclusion of Knapsack selections
- Emergency reserve not used

### Test Command
```bash
python -m pytest dsa-engine/tests/test_greedy.py -v
```

## Configuration

No specific configuration - uses remaining budget from Knapsack stage.

## Limitations & Future Improvements

1. **Single Pass**: One iteration through sorted items; could do multiple passes for better packing
2. **No Lookahead**: Doesn't consider combinations (e.g., two small items vs one large)
3. **Fragmentation**: May leave small unusable budget fragments
4. **Future**: Could implement "best-fit decreasing" or multiple heuristic passes

## Relationship to Knapsack

| Aspect | Knapsack (Stage 1) | Greedy (Stage 2) |
|--------|-------------------|------------------|
| Goal | Global optimum | Local improvement |
| Method | Dynamic Programming | Heuristic (value density) |
| Guarantee | Optimal for given budget | No global guarantee |
| Budget | Full normal budget | Remaining only |
| Items | All eligible | Excludes Knapsack picks |
| Complexity | O(N × W) | O(N log N) |

## Audit Trail

Each Greedy allocation creates:
- AllocationResult records with stage='GREEDY_FALLBACK'
- AllocationRun.greedy_* fields populated
- AuditLog: GREEDY_FALLBACK_COMPLETED

## References

- Kellerer, Pferschy, Pisinger, "Knapsack Problems" - Chapter on Greedy Approximations
- "A Greedy Heuristic for the Knapsack Problem" - Dantzig (1957) - Original value-density approach