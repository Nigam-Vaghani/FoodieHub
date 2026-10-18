from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class OrderItemRequest(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., ge=1, le=100, description="Quantity must be between 1 and 100")

class OrderCreateRequest(BaseModel):
    restaurant_id: int
    items: List[OrderItemRequest] = Field(..., min_length=1, description="Order must contain at least one item")
    delivery_address: str = Field(..., min_length=5, max_length=500)
    contact_phone: str = Field(..., min_length=5, max_length=50)
    notes: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=100)

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(CONFIRMED|PREPARING|OUT_FOR_DELIVERY|DELIVERED|CANCELLED)$")

class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    menu_item_id: int
    name: str
    unit_price: float
    quantity: int
    item_total: float

class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    restaurant_name: str
    status: str
    subtotal: float
    tax: float
    delivery_fee: float
    total_amount: float
    delivery_address: str
    contact_phone: str
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: datetime
