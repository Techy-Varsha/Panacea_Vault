"""
Audit log schemas
"""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    old_state: Optional[Any] = None
    new_state: Optional[Any] = None
    metadata: Optional[Any] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True