"""
Panacea Vault DSA Engine Package

This package contains the core allocation algorithms:
- knapsack: 0/1 Knapsack dynamic programming solver
- greedy: Greedy fallback allocator
- scoring: Urgency scoring engine
- emergency: Emergency reserve allocation
"""

from .knapsack.knapsack_solver import KnapsackSolver, KnapsackItem, KnapsackResult, create_items_from_requests
from .greedy.greedy_fallback import GreedyFallback, GreedyResult, run_greedy_fallback
from .scoring.urgency_scorer import UrgencyScorer, ScoringInput, UrgencyScoreBreakdown, calculate_urgency_score
from .emergency.emergency_allocator import EmergencyAllocator, EmergencyRequest, EmergencyAllocationResult, process_emergency_allocation

__all__ = [
    # Knapsack
    "KnapsackSolver",
    "KnapsackItem",
    "KnapsackResult",
    "create_items_from_requests",
    # Greedy
    "GreedyFallback",
    "GreedyResult",
    "run_greedy_fallback",
    # Scoring
    "UrgencyScorer",
    "ScoringInput",
    "UrgencyScoreBreakdown",
    "calculate_urgency_score",
    # Emergency
    "EmergencyAllocator",
    "EmergencyRequest",
    "EmergencyAllocationResult",
    "process_emergency_allocation",
]

# Version
__version__ = "1.0.0"