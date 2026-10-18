from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class NotificationCreate(BaseModel):
    user_id: int
    order_id: Optional[int] = None
    title: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=2)
    type: Optional[str] = "GENERAL"

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    order_id: Optional[int] = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int
    total_count: int

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: datetime
