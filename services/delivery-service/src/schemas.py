from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class DeliveryCreate(BaseModel):
    order_id: int
    user_id: int
    restaurant_id: int
    pickup_address: str = Field(..., min_length=3)
    dropoff_address: str = Field(..., min_length=3)
    estimated_minutes: int = Field(30, ge=5, le=120)
    driver_name: Optional[str] = "Bob Courier"
    driver_phone: Optional[str] = "+1-555-0102"

class DeliveryStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(ASSIGNED|PICKED_UP|IN_TRANSIT|DELIVERED|FAILED)$")

class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    user_id: int
    restaurant_id: int
    driver_name: str
    driver_phone: str
    status: str
    pickup_address: str
    dropoff_address: str
    estimated_delivery_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: datetime
