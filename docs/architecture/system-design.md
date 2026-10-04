# Panacea Vault - System Architecture

## Overview

Panacea Vault is an end-to-end medical crowdfunding allocation prototype driven by a strict 0/1 Knapsack engine, real project datasets, transparent scoring, emergency handling, financial auditability, and a Bio-Emerald product identity.

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TS)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Pages     │ │ Components  │ │  Contexts   │ │ Services  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI + Python)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │   API    │ │ Schemas  │ │ Services │ │  Auth    │ │ Utils │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DSA Engine (Core Algorithms)                 │
│  ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │ Knapsack  │ │  Greedy  │ │  Scoring  │ │   Emergency    │  │
│  └───────────┘ └──────────┘ └───────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (MySQL)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  users, roles, hospitals, patients, diseases,          │   │
│  │  procedures, treatment_packages, funding_requests,      │   │
│  │  urgency_scores, budgets, allocation_runs,              │   │
│  │  allocation_results, emergency_allocations,             │   │
│  │  disbursements, utilization_certificates, audit_logs    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Dataset (CSV) → Validation → Database Seed → Backend API → DSA Engine → Allocation Results
                                                          ↓
                                              Financial Ledger + Audit Trail
                                                          ↓
                                              Frontend Dashboard/Visualization
```

## Core Pipeline

1. **Dataset Validation** - Validate CSV datasets for integrity
2. **Database Seeding** - Load validated data into MySQL
3. **Request Creation** - Doctors create funding requests with disease/procedure
4. **Scoring** - UrgencyScorer calculates score from ICD, TTC, success rate, age, waiting
5. **Budget Setup** - Admin creates daily budget with 15% emergency reserve
6. **Allocation Run** - Admin triggers allocation:
   - Stage 1: 0/1 Knapsack DP optimization
   - Stage 2: Greedy fallback on remaining budget
7. **Approval** - Admin approves allocations
8. **Disbursement** - Simulated hospital disbursement
9. **Utilization** - Hospital submits utilization certificate
10. **Verification** - Admin verifies utilization
11. **Settlement** - Case marked settled
12. **Audit Trail** - All events logged

## Allocation Algorithm

### Stage 1: 0/1 Knapsack
- **Items**: Treatment requests (weight = funding_gap_inr, value = urgency_score)
- **Capacity**: Normal budget (total - 15% emergency reserve)
- **Algorithm**: Dynamic Programming O(N × W) with currency scaling
- **Output**: Optimal subset maximizing total urgency

### Stage 2: Greedy Fallback
- **Input**: Remaining budget after Knapsack
- **Strategy**: Sort by urgency/cost ratio (value density), select items that fit
- **Output**: Additional allocations using leftover funds

### Emergency Reserve
- 15% of daily budget reserved
- Requires ADMIN authorization
- ESI Level 1-2 or life-threatening ICD categories
- Separate audit trail

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic 2 |
| Database | MySQL 8.0+ |
| Auth | JWT (HS256), bcrypt password hashing |
| DSA | Pure Python (no external dependencies) |
| Charts | Recharts |
| Icons | Lucide React |

## Bio-Emerald Design System

### Dark Mode (Default)
- Background: #041E20
- Text: #E8F5E9
- Primary: #00FFA3
- Card: rgba(6, 42, 45, 0.85)
- Border: rgba(0, 255, 163, 0.15)
- Highlight: #FFB300

### Light Mode
- Background: #D1E8E2
- Text: #2C3E50
- Heading: #1A5276
- Card: rgba(255,255,255,0.85)
- Highlight: #C0392B
- Tech: #16A085

## RBAC Matrix

| Role | Requests | Allocation | Emergency | Audit | Users | Budget |
|------|----------|------------|-----------|-------|-------|--------|
| PATIENT | Own only | - | - | - | - | - |
| DOCTOR | Create/View own | - | - | - | - | - |
| HOSPITAL | Approved only | - | - | - | - | - |
| ADMIN | All | Run/Approve | Authorize | - | Manage | Manage |
| AUDITOR | View all | View all | View all | Full | View | View |
| DONOR | - | - | - | - | - | - |