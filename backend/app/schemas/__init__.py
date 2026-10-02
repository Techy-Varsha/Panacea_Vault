"""
Panacea Vault API Schemas
"""

from app.schemas.auth import Token, TokenData, UserLogin, UserRegister
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.hospital import HospitalResponse, HospitalCreate, HospitalUpdate
from app.schemas.patient import PatientResponse, PatientCreate, PatientUpdate
from app.schemas.funding_request import (
    FundingRequestResponse,
    FundingRequestCreate,
    FundingRequestUpdate,
    FundingRequestList
)
from app.schemas.scoring import ScoreRequest, ScoreResponse, ScoreBreakdown
from app.schemas.allocation import (
    AllocationRunRequest,
    AllocationRunResponse,
    AllocationResultResponse,
    AllocationDetailsResponse
)
from app.schemas.emergency import EmergencyAllocationRequest, EmergencyAllocationResponse
from app.schemas.dashboard import DashboardSummary, AllocationFlowData
from app.schemas.audit import AuditLogResponse

__all__ = [
    "Token", "TokenData", "UserLogin", "UserRegister",
    "UserResponse", "UserCreate", "UserUpdate",
    "HospitalResponse", "HospitalCreate", "HospitalUpdate",
    "PatientResponse", "PatientCreate", "PatientUpdate",
    "FundingRequestResponse", "FundingRequestCreate", "FundingRequestUpdate", "FundingRequestList",
    "ScoreRequest", "ScoreResponse", "ScoreBreakdown",
    "AllocationRunRequest", "AllocationRunResponse", "AllocationResultResponse", "AllocationDetailsResponse",
    "EmergencyAllocationRequest", "EmergencyAllocationResponse",
    "DashboardSummary", "AllocationFlowData",
    "AuditLogResponse",
]