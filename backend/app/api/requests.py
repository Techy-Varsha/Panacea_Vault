"""
Funding Requests API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from app.database import get_db
from app.auth.dependencies import require_doctor, require_admin, require_hospital, get_current_active_user
from app.models.user import UserRole
from app.schemas.funding_request import FundingRequestResponse, FundingRequestCreate, FundingRequestUpdate, FundingRequestList
from app.models.funding_request import FundingRequest, RequestStatus
from app.models.user import User
from app.models.disease import Disease
from app.models.procedure import Procedure
from app.models.treatment_package import TreatmentPackage
from app.models.hospital import Hospital


router = APIRouter()


@router.get("", response_model=FundingRequestList)
async def list_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    hospital_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    is_emergency: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List funding requests with role-based filtering"""
    query = db.query(FundingRequest)

    # Role-based filtering
    if current_user.role.name == "DOCTOR":
        query = query.filter(FundingRequest.requesting_doctor_id == current_user.id)
    elif current_user.role.name == UserRole.HOSPITAL.value:
        query = query.filter(FundingRequest.hospital_id == current_user.id)
    elif current_user.role.name == UserRole.PATIENT.value:
        # Patients can only see their own requests
        from app.models.patient import Patient
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            query = query.filter(FundingRequest.patient_id == patient.id)
        else:
            return FundingRequestList(items=[], total=0, page=1, page_size=limit)

    # Additional filters
    if status:
        try:
            query = query.filter(FundingRequest.status == RequestStatus(status.upper()))
        except ValueError:
            pass

    if hospital_id and current_user.role.name in [UserRole.ADMIN.value, UserRole.AUDITOR.value]:
        query = query.filter(FundingRequest.hospital_id == hospital_id)

    if patient_id and current_user.role.name in [UserRole.ADMIN.value, UserRole.AUDITOR.value, UserRole.DOCTOR.value]:
        query = query.filter(FundingRequest.patient_id == patient_id)

    if is_emergency is not None:
        query = query.filter(FundingRequest.is_emergency == is_emergency)

    # Order by urgency score descending
    query = query.order_by(FundingRequest.urgency_score.desc())

    total = query.count()
    requests = query.offset(skip).limit(limit).all()

    page = (skip // limit) + 1
    return FundingRequestList(items=requests, total=total, page=page, page_size=limit)


@router.get("/{request_id}", response_model=FundingRequestResponse)
async def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get funding request by ID"""
    request = db.query(FundingRequest).filter(FundingRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Funding request not found")

    # Check permissions
    if not _can_access_request(current_user, request):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return request


def _can_access_request(user: User, request: FundingRequest) -> bool:
    """Check if user can access this request"""
    if user.role.name == UserRole.ADMIN.value or user.role.name == UserRole.AUDITOR.value:
        return True
    if user.role.name == UserRole.DOCTOR.value and request.requesting_doctor_id == user.id:
        return True
    if user.role.name == UserRole.HOSPITAL.value and request.hospital_id == user.id:
        return True
    if user.role.name == UserRole.PATIENT.value:
        from app.models.patient import Patient
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if patient and request.patient_id == patient.id:
            return True
    return False


@router.post("", response_model=FundingRequestResponse, status_code=201)
async def create_request(
    request_data: FundingRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Create new funding request (doctor only)"""
    # Validate references
    for model, id_val, name in [
        (Patient, request_data.patient_id, "Patient"),
        (Disease, request_data.disease_id, "Disease"),
        (Procedure, request_data.procedure_id, "Procedure"),
        (TreatmentPackage, request_data.treatment_package_id, "Treatment Package"),
        (Hospital, request_data.hospital_id, "Hospital"),
    ]:
        if not db.query(model).filter(model.id == id_val).first():
            raise HTTPException(status_code=400, detail=f"{name} not found")

    # Verify doctor is the requesting doctor
    if request_data.requesting_doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only create requests for yourself")

    request = FundingRequest(**request_data.model_dump())
    request.status = RequestStatus.PENDING
    db.add(request)
    db.commit()
    db.refresh(request)

    # TODO: Create audit log

    return request


@router.patch("/{request_id}", response_model=FundingRequestResponse)
async def update_request(
    request_id: int,
    request_data: FundingRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update funding request"""
    request = db.query(FundingRequest).filter(FundingRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Funding request not found")

    # Check permissions
    if not _can_modify_request(current_user, request):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    update_data = request_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(request, field, value)

    db.commit()
    db.refresh(request)

    # TODO: Create audit log

    return request


def _can_modify_request(user: User, request: FundingRequest) -> bool:
    """Check if user can modify this request"""
    if user.role.name == UserRole.ADMIN.value:
        return True
    if user.role.name == UserRole.DOCTOR.value and request.requesting_doctor_id == user.id:
        return True
    return False