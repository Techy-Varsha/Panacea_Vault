"""
Hospital API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.auth.dependencies import require_admin, get_current_active_user
from app.schemas.hospital import HospitalResponse, HospitalCreate, HospitalUpdate
from app.models.hospital import Hospital
from app.models.user import User


router = APIRouter()


@router.get("", response_model=List[HospitalResponse])
async def list_hospitals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    verified_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List hospitals"""
    query = db.query(Hospital)

    if verified_only:
        query = query.filter(Hospital.is_verified == True)

    hospitals = query.offset(skip).limit(limit).all()
    return hospitals


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get hospital by ID"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.post("", response_model=HospitalResponse, status_code=201)
async def create_hospital(
    hospital_data: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create new hospital (admin only)"""
    # Check if license number already exists
    if hospital_data.license_number:
        existing = db.query(Hospital).filter(Hospital.license_number == hospital_data.license_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="License number already registered")

    hospital = Hospital(**hospital_data.dict())
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


@router.patch("/{hospital_id}", response_model=HospitalResponse)
async def update_hospital(
    hospital_id: int,
    hospital_data: HospitalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update hospital (admin only)"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    update_data = hospital_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hospital, field, value)

    db.commit()
    db.refresh(hospital)
    return hospital


@router.delete("/{hospital_id}", status_code=204)
async def delete_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete hospital (admin only)"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    db.delete(hospital)
    db.commit()
    return None