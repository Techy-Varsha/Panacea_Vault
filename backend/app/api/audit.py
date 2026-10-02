"""
Audit Log API endpoints
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.auth.dependencies import require_auditor, require_admin
from app.schemas.audit import AuditLogResponse
from app.models.audit import AuditLog, AuditAction
from app.models.user import User


router = APIRouter()


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    actor_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auditor)
):
    """List audit logs with filtering"""
    query = db.query(AuditLog)

    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    if action:
        try:
            query = query.filter(AuditLog.action == AuditAction(action.upper()))
        except ValueError:
            pass

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)

    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())

    logs = query.offset(skip).limit(limit).all()
    return logs


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auditor)
):
    """Get audit log by ID"""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log


@router.get("/actions/list")
async def list_audit_actions(
    current_user: User = Depends(require_auditor)
):
    """List all possible audit actions"""
    return [action.value for action in AuditAction]