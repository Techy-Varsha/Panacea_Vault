"""
Panacea Vault - FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.api import auth, requests, scoring, allocation, emergency, dashboard, audit, hospitals, users, reference


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Panacea Vault API...")
    # Create tables if they don't exist (in dev)
    if settings.ENVIRONMENT == "development":
        Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    print("Shutting down Panacea Vault API...")


app = FastAPI(
    title="Panacea Vault API",
    description="Medical crowdfunding allocation engine driven by 0/1 Knapsack",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(hospitals.router, prefix="/api/hospitals", tags=["Hospitals"])
app.include_router(reference.router, prefix="/api", tags=["Reference Data"])
app.include_router(requests.router, prefix="/api/funding-requests", tags=["Funding Requests"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["Scoring"])
app.include_router(allocation.router, prefix="/api/allocation", tags=["Allocation"])
app.include_router(emergency.router, prefix="/api/emergency", tags=["Emergency"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])


@app.get("/")
async def root():
    return {
        "name": "Panacea Vault API",
        "version": "1.0.0",
        "description": "Medical crowdfunding allocation engine",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}