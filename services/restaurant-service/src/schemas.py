from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class MenuItemBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    price: float = Field(..., gt=0, description="Price must be greater than zero")
    category: str = Field(..., min_length=2, max_length=50)
    image_url: str = Field(..., min_length=5)
    is_available: bool = True
    is_vegetarian: bool = False

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, min_length=5)
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_vegetarian: Optional[bool] = None

class MenuItemResponse(MenuItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    created_at: datetime

class RestaurantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    cuisine_type: str = Field(..., min_length=2, max_length=50)
    address: str = Field(..., min_length=5, max_length=300)
    phone: str = Field(..., min_length=5, max_length=30)
    rating: float = Field(4.5, ge=0.0, le=5.0)
    delivery_time_mins: int = Field(30, ge=5, le=120)
    delivery_fee: float = Field(2.99, ge=0.0)
    image_url: str = Field(..., min_length=5)
    is_active: bool = True

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    cuisine_type: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    delivery_time_mins: Optional[int] = Field(None, ge=5, le=120)
    delivery_fee: Optional[float] = Field(None, ge=0.0)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class RestaurantResponse(RestaurantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime

class RestaurantDetailResponse(RestaurantResponse):
    menu_items: List[MenuItemResponse] = []

# Internal validation schemas for Order Service
class ValidateItemsRequest(BaseModel):
    restaurant_id: int
    item_ids: List[int]

class ValidatedItemDetail(BaseModel):
    id: int
    name: str
    price: float
    is_available: bool
    restaurant_id: int

class ValidateItemsResponse(BaseModel):
    restaurant_id: int
    restaurant_name: str
    delivery_fee: float
    is_restaurant_active: bool
    items: List[ValidatedItemDetail]
    all_valid: bool
    errors: List[str]

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    timestamp: datetime
