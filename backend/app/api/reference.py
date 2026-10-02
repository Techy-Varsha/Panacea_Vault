"""
Reference data API endpoints (Diseases, Procedures, Treatment Packages, Patients)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.auth.dependencies import get_current_active_user
from app.models.disease import Disease
from app.models.procedure import Procedure
from app.models.treatment_package import TreatmentPackage
from app.models.patient import Patient
from app.models.hospital import Hospital
from app.models.user import User


router = APIRouter(prefix="/reference", tags=["Reference Data"])


# Diseases
@router.get("/diseases", response_model=List[dict])
async def list_diseases(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all diseases"""
    query = db.query(Disease)
    if department:
        query = query.filter(Disease.department == department)
    diseases = query.offset(skip).limit(limit).all()
    return [
        {
            "id": d.id,
            "icd10_category": d.icd10_category,
            "description": d.description,
            "department": d.department,
            "prototype_base_severity": d.prototype_base_severity,
            "source_note": d.source_note,
        }
        for d in diseases
    ]


@router.get("/diseases/{disease_id}", response_model=dict)
async def get_disease(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get disease by ID"""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")
    return {
        "id": disease.id,
        "icd10_category": disease.icd10_category,
        "description": disease.description,
        "department": disease.department,
        "prototype_base_severity": disease.prototype_base_severity,
        "source_note": disease.source_note,
    }


# Procedures
@router.get("/procedures", response_model=List[dict])
async def list_procedures(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all procedures"""
    query = db.query(Procedure)
    if department:
        query = query.filter(Procedure.department == department)
    procedures = query.offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "department": p.department,
            "surgery_name": p.surgery_name,
            "example_icd10_pcs_code": p.example_icd10_pcs_code,
            "source_note": p.source_note,
        }
        for p in procedures
    ]


# Treatment Packages
@router.get("/treatment-packages", response_model=List[dict])
async def list_treatment_packages(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    disease_id: Optional[int] = None,
    procedure_id: Optional[int] = None,
    is_active: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all treatment packages"""
    query = db.query(TreatmentPackage).filter(TreatmentPackage.is_active == is_active)
    if disease_id:
        query = query.filter(TreatmentPackage.disease_id == disease_id)
    if procedure_id:
        query = query.filter(TreatmentPackage.procedure_id == procedure_id)
    packages = query.offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "package_code": p.package_code,
            "disease_id": p.disease_id,
            "procedure_id": p.procedure_id,
            "surgery_cost_inr": float(p.surgery_cost_inr),
            "icu_cost_inr": float(p.icu_cost_inr),
            "medication_cost_inr": float(p.medication_cost_inr),
            "total_package_cost_inr": float(p.total_package_cost_inr),
            "estimated_stay_days": p.estimated_stay_days,
            "notes": p.notes,
        }
        for p in packages
    ]


# Patients
@router.get("/patients", response_model=List[dict])
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all patients"""
    patients = db.query(Patient).offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "patient_code": p.patient_code,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
            "gender": p.gender,
            "city": p.city,
            "state": p.state,
        }
        for p in patients
    ]


# Hospitals (also accessible via reference)
@router.get("/hospitals", response_model=List[dict])
async def list_hospitals_ref(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    verified_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all hospitals"""
    query = db.query(Hospital)
    if verified_only:
        query = query.filter(Hospital.is_verified == True)
    hospitals = query.offset(skip).limit(limit).all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "address": h.address,
            "city": h.city,
            "state": h.state,
            "pincode": h.pincode,
            "contact_email": h.contact_email,
            "contact_phone": h.contact_phone,
            "license_number": h.license_number,
            "is_verified": h.is_verified,
        }
        for h in hospitals
    ]