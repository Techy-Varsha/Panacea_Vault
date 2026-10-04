# Panacea Vault

**Zero bias. Maximum impact.** An automated medical crowdfunding allocator driven by a strict 0/1 Knapsack engine.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://typescriptlang.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://mysql.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Problem

Medical crowdfunding platforms today suffer from:
- **Subjective allocation** - Decisions based on emotional appeal rather than medical urgency
- **No optimization** - Funds distributed first-come-first-served or by marketing reach
- **Zero transparency** - Donors can't see how allocation decisions are made
- **No audit trail** - Impossible to verify funds reached intended patients
- **Emergency gaps** - Critical cases wait in same queue as routine procedures

## Solution

Panacea Vault is an **end-to-end medical crowdfunding allocation prototype** that replaces subjective decisions with algorithmic fairness:

```
┌─────────────────────────────────────────────────────────────────┐
│  DATASET (Real Medical Codes)                                   │
│  ├─ ESI Reference (Emergency Triage)                            │
│  ├─ ICD-10 Severity (Disease Urgency)                          │
│  ├─ Surgery Mapping (Procedure Catalog)                        │
│  └─ Synthetic Queue (1000 Patient Workload)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  URGENCY SCORING ENGINE                                         │
│  base_severity + ttc + success_rate + age + waiting + emergency │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  DUAL-STAGE ALLOCATION                                          │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  STAGE 1: 0/1 KNAPSACK        │  STAGE 2: GREEDY FALLBACK    │  │
│  │  Dynamic Programming           │  Value-density heuristic     │  │
│  │  Optimal for budget            │  Uses remaining funds        │  │
│  │  Maximizes total urgency       │  Deterministic, auditable    │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FINANCIAL LIFECYCLE + AUDIT TRAIL                              │
│  Request → Score → Allocate → Approve → Disburse → Verify → Settle│
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Implementation |
|---------|---------------|
| **0/1 Knapsack DP** | O(N × W) with currency scaling (10k INR units) |
| **Greedy Fallback** | Value-density sort, deterministic, auditable |
| **Urgency Scoring** | 6-component model from real ICD/ESI data |
| **Emergency Reserve** | 15% budget, ESI 1-2, life-threatening ICDs |
| **Anti-Starvation** | +5 urgency points per waiting day |
| **RBAC** | 6 roles: PATIENT, DOCTOR, HOSPITAL, ADMIN, AUDITOR, DONOR |
| **Financial Ledger** | Simulated escrow, utilization certificates |
| **Audit Trail** | Immutable logs for every state transition |
| **Bio-Emerald UI** | Dark/light mode, glassmorphism, accessible |
| **Analytics** | Sankey flow, stacked bars, real backend data |

---

## Architecture

```
panacea-vault/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages (Dashboard, Requests, etc.)
│   │   ├── contexts/         # Auth, Theme contexts
│   │   ├── services/         # API client (axios)
│   │   └── assets/           # Styles, fonts
│   ├── tailwind.config.js    # Bio-Emerald design system
│   └── package.json
│
├── backend/                  # FastAPI + Python
│   ├── app/
│   │   ├── api/              # REST endpoints (13 routers)
│   │   ├── models/           # SQLAlchemy models (17 tables)
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── auth/             # JWT, bcrypt, RBAC dependencies
│   │   ├── services/         # Business logic
│   │   └── config.py         # Settings management
│   ├── database/
│   │   ├── schema/           # SQLAlchemy definitions
│   │   ├── migrations/       # Alembic migrations
│   │   └── seed/             # CSV → MySQL seeding
│   └── requirements.txt
│
├── dsa-engine/               # Core Algorithms (Pure Python)
│   ├── knapsack/             # 0/1 Knapsack DP solver
│   ├── greedy/               # Greedy fallback allocator
│   ├── scoring/              # Urgency scoring engine
│   ├── emergency/            # Emergency reserve allocator
│   └── tests/                # Unit tests for all algorithms
│
├── dataset/                  # Source Data (Immutable)
│   ├── ESI_Reference.csv
│   ├── ICD_Severity.csv
│   ├── Surgery_Mapping.csv
│   └── Synthetic_Queue.csv
│
├── scripts/
│   └── data_validation/      # validate_all.py
│
├── tests/
│   ├── backend/
│   ├── dsa/
│   ├── frontend/
│   └── integration/
│
└── docs/
    ├── architecture/
    ├── api/
    ├── database/
    └── algorithms/
```

---

## Quick Start

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- **MySQL** 8.0+
- **Git**

### 1. Clone Repository

```bash
git clone https://github.com/your-org/panacea-vault.git
cd panacea-vault
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your MySQL credentials

# Create database
mysql -u root -p -e "CREATE DATABASE panacea_vault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations (or auto-create in dev)
alembic upgrade head

# Seed database from CSV datasets
python -m database.seed.seed_data
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:3000 (proxies to :8000)
```

### 4. Start Backend API

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 5. Run Tests

```bash
# DSA Engine tests
cd dsa-engine
python -m pytest tests/ -v

# Backend tests
cd ../backend
python -m pytest tests/ -v

# Frontend tests
cd ../frontend
npm test
```

---

## Configuration

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/panacea_vault

# Security
SECRET_KEY=your-32-char-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# DSA Engine
KNAPSACK_CURRENCY_SCALE=10000
WAITING_TIME_BOOST=5
EMERGENCY_RESERVE_PERCENT=15.0
MAX_URGENCY_SCORE=100

# Environment
ENVIRONMENT=development
DEBUG=true

# Dataset Path
DATASET_PATH=D:/Panacea_Vault/dataset
```

See [.env.example](.env.example) for all options.

---

## Dataset

The `dataset/` directory contains **immutable source files**:

| File | Rows | Purpose |
|------|------|---------|
| `ESI_Reference.csv` | 5 | Emergency Severity Index levels 1-5 |
| `ICD_Severity.csv` | 30 | ICD-10 categories with prototype severity (50-99) |
| `Surgery_Mapping.csv` | 30 | Procedure catalog with ICD-10-PCS codes |
| `Synthetic_Queue.csv` | 1000 | Synthetic patient workload for testing |

**Validation:**
```bash
python scripts/data_validation/validate_all.py
```

**Data Dictionary:** [docs/dataset/data-dictionary.md](docs/dataset/data-dictionary.md)

---

## API Documentation

### Interactive Docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Category | Endpoint | Roles |
|----------|----------|-------|
| **Auth** | `POST /api/auth/login` | All |
| **Requests** | `POST /api/funding-requests` | DOCTOR, ADMIN |
| **Scoring** | `POST /api/scoring/calculate` | DOCTOR, ADMIN |
| **Allocation** | `POST /api/allocation/run` | ADMIN |
| **Emergency** | `POST /api/emergency/allocate` | ADMIN |
| **Dashboard** | `GET /api/dashboard/summary` | All Auth |
| **Audit** | `GET /api/audit` | AUDITOR, ADMIN |

Full docs: [docs/api/endpoints.md](docs/api/endpoints.md)

---

## User Roles & Permissions

| Role | Capabilities |
|------|--------------|
| **PATIENT** | View own requests, status |
| **DOCTOR** | Create requests, calculate scores, select ICD/procedure |
| **HOSPITAL** | View approved allocations, submit utilization certificates |
| **ADMIN** | Manage budgets, run allocations, authorize emergencies, manage users |
| **AUDITOR** | Inspect all records, allocation history, audit logs |
| **DONOR** | View aggregate impact metrics |

---

## Allocation Algorithm Details

### Stage 1: 0/1 Knapsack
- **Items**: Treatment requests
- **Weight**: `funding_gap_inr` (complete package cost - surety)
- **Value**: `urgency_score` (0-100)
- **Capacity**: Normal budget (85% of daily)
- **Algorithm**: Dynamic Programming with 1D space optimization
- **Scaling**: Currency scaled by 10,000 (configurable)

### Stage 2: Greedy Fallback
- **Input**: Remaining budget after Knapsack
- **Strategy**: Sort by `urgency_score / funding_gap_inr` descending
- **Selection**: First-fit while budget allows
- **Deterministic**: Stable sort, same input → same output

### Emergency Reserve
- 15% of daily budget reserved
- Eligibility: ESI 1-2, or life-threatening ICD (I21, I60, I61, S06, A41, J96, I71, O72, O00, T79, S36, S27)
- Requires ADMIN authorization
- Bypasses normal batch queue

Documentation:
- [Knapsack](docs/algorithms/knapsack.md)
- [Greedy](docs/algorithms/greedy.md)
- [Scoring](docs/algorithms/scoring.md)
- [Emergency](docs/algorithms/emergency.md)

---

## Financial Lifecycle

```
PENDING → ELIGIBLE → SELECTED → APPROVED → DISBURSED → UTILIZATION_PENDING → VERIFIED → SETTLED
                            ↑
                      EMERGENCY → APPROVED (bypasses SELECTED)
```

All transitions logged in `audit_logs` with actor, timestamp, metadata.

**Disbursement**: Simulated (`DEMO_PAYMENT`) - clearly labeled, never represented as real bank transfer.

---

## Bio-Emerald Design System

### Dark Mode (Default)
```css
Background:       #041E20
Text:             #E8F5E9
Primary Accent:   #00FFA3
Card:             rgba(6, 42, 45, 0.85)
Border:           rgba(0, 255, 163, 0.15)
Highlight:        #FFB300
```

### Light Mode
```css
Background:       #D1E8E2
Text:             #2C3E50
Heading:          #1A5276
Card:             rgba(255,255,255,0.85)
Highlight:        #C0392B
Tech:             #16A085
```

- Glassmorphism cards with backdrop blur
- Persistent Dark/Light toggle
- Accessible contrast ratios
- Responsive design

---

## Development

### Project Structure Conventions

- **Backend**: Service layer pattern, no logic in route handlers
- **Frontend**: Component composition, custom hooks for data fetching
- **DSA Engine**: Pure functions, independently testable, no dependencies
- **Database**: Explicit FK, indexes, computed columns, state machine

### Code Quality

```bash
# Backend
cd backend
ruff check .
black .
mypy app/

# Frontend
cd frontend
npm run lint
npm run typecheck
```

### Adding New Features

1. **Dataset changes** → Update CSV → Run validation → Re-seed
2. **New algorithm** → Add to dsa-engine/ → Write tests → Integrate in backend
3. **New API** → Add schema → Add model → Add route → Add RBAC → Test
4. **New UI** → Add page → Add to routes → Connect API → Style with Bio-Emerald

---

## Testing

### DSA Engine (Core Algorithms)
```bash
cd dsa-engine
python -m pytest tests/ -v
# test_knapsack.py, test_greedy.py, test_scoring.py, test_emergency.py
```

### Backend
```bash
cd backend
python -m pytest tests/ -v --cov=app
```

### Frontend
```bash
cd frontend
npm test
npm run test:coverage
```

### Integration
```bash
cd tests/integration
python -m pytest -v
```

---

## Deployment

### Docker (Recommended)

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: panacea_vault
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: mysql+pymysql://root:${DB_PASSWORD}@mysql:3306/panacea_vault
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

### Production Checklist

- [ ] Change `SECRET_KEY` to strong random value
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Use real SSL certificates
- [ ] Configure MySQL with strong passwords
- [ ] Set up Redis for session caching
- [ ] Configure log aggregation
- [ ] Set up monitoring/alerting
- [ ] Run database migrations (not auto-create)
- [ ] Restrict CORS to production domains
- [ ] Disable registration endpoint or add approval flow

---

## Limitations (Prototype)

| Area | Limitation |
|------|------------|
| **Data** | Synthetic queue only; no real patient data |
| **Payments** | Simulated (`DEMO_PAYMENT`) only |
| **Scalability** | Single-node; no horizontal scaling |
| **Auth** | Basic JWT; no MFA, SSO, password reset |
| **Scoring** | Prototype heuristic; not clinical guidelines |
| **Real-time** | Batch allocation; no streaming updates |
| **Compliance** | Not HIPAA/GDPR certified |

See [plan](plan) for full Definition of Done.

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow code style (ruff, black, prettier)
4. Write tests for new functionality
5. Update documentation
6. Submit PR with clear description

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **AHRQ** for Emergency Severity Index (ESI) reference
- **WHO** for ICD-10 terminology (severity scores are prototype heuristics)
- **ICD-10-PCS** for procedure coding structure (prototype codes)
- **Open Source** libraries: FastAPI, React, SQLAlchemy, Tailwind CSS, Recharts, Lucide

---

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Security**: security@panaceavault.example.com

---

**Built with ❤️ for transparent, fair medical funding allocation.**