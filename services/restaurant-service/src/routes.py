from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.database import get_db
from src.models import Restaurant, MenuItem
from src.schemas import (
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
    RestaurantDetailResponse,
    MenuItemCreate,
    MenuItemUpdate,
    MenuItemResponse,
    ValidateItemsRequest,
    ValidateItemsResponse,
    ValidatedItemDetail,
    HealthResponse,
)
from src.auth import require_admin

logger = logging.getLogger("restaurant-service")
router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
@router.get("/ready", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    return HealthResponse(
        status="healthy",
        service="restaurant-service",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

@router.get("/api/restaurants", response_model=List[RestaurantResponse], tags=["Restaurants"])
def list_restaurants(
    cuisine: Optional[str] = Query(None, description="Filter by cuisine type"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    active_only: bool = Query(True, description="Only show active restaurants"),
    db: Session = Depends(get_db)
):
    query = db.query(Restaurant)
    if active_only:
        query = query.filter(Restaurant.is_active == True)
    if cuisine:
        query = query.filter(Restaurant.cuisine_type.ilike(f"%{cuisine.strip()}%"))
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Restaurant.name.ilike(search_pattern)) | (Restaurant.description.ilike(search_pattern))
        )
    return query.order_by(Restaurant.rating.desc()).all()

@router.get("/api/restaurants/{restaurant_id}", response_model=RestaurantDetailResponse, tags=["Restaurants"])
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    return restaurant

@router.post("/api/restaurants", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED, tags=["Restaurants"])
def create_restaurant(
    req: RestaurantCreate,
    db: Session = Depends(get_db),
    admin_payload: dict = Depends(require_admin)
):
    restaurant = Restaurant(**req.model_dump())
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    logger.info(f"Created restaurant: {restaurant.name} (id={restaurant.id}) by admin {admin_payload.get('sub')}")
    return restaurant

@router.put("/api/restaurants/{restaurant_id}", response_model=RestaurantResponse, tags=["Restaurants"])
def update_restaurant(
    restaurant_id: int,
    req: RestaurantUpdate,
    db: Session = Depends(get_db),
    admin_payload: dict = Depends(require_admin)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(restaurant, field, val)
    
    db.commit()
    db.refresh(restaurant)
    logger.info(f"Updated restaurant: id={restaurant.id} by admin {admin_payload.get('sub')}")
    return restaurant

@router.get("/api/restaurants/{restaurant_id}/menu", response_model=List[MenuItemResponse], tags=["Menu"])
def list_menu_items(
    restaurant_id: int,
    available_only: bool = Query(False, description="Filter only available items"),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    query = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    return query.all()

@router.post("/api/restaurants/{restaurant_id}/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED, tags=["Menu"])
def add_menu_item(
    restaurant_id: int,
    req: MenuItemCreate,
    db: Session = Depends(get_db),
    admin_payload: dict = Depends(require_admin)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant with ID {restaurant_id} not found"
        )
    item = MenuItem(restaurant_id=restaurant_id, **req.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    logger.info(f"Added menu item: {item.name} to restaurant {restaurant_id} by admin {admin_payload.get('sub')}")
    return item

@router.put("/api/restaurants/{restaurant_id}/menu/{item_id}", response_model=MenuItemResponse, tags=["Menu"])
def update_menu_item(
    restaurant_id: int,
    item_id: int,
    req: MenuItemUpdate,
    db: Session = Depends(get_db),
    admin_payload: dict = Depends(require_admin)
):
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant_id
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item with ID {item_id} not found in restaurant {restaurant_id}"
        )
    
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)
    
    db.commit()
    db.refresh(item)
    return item

# Internal validation endpoint for Order Service
@router.post("/api/restaurants/validate-items", response_model=ValidateItemsResponse, tags=["Internal"])
def validate_items_for_order(req: ValidateItemsRequest, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == req.restaurant_id).first()
    if not restaurant:
        return ValidateItemsResponse(
            restaurant_id=req.restaurant_id,
            restaurant_name="",
            delivery_fee=0.0,
            is_restaurant_active=False,
            items=[],
            all_valid=False,
            errors=[f"Restaurant {req.restaurant_id} does not exist"]
        )

    errors = []
    if not restaurant.is_active:
        errors.append(f"Restaurant '{restaurant.name}' is currently closed or inactive")

    found_items = db.query(MenuItem).filter(MenuItem.id.in_(req.item_ids)).all()
    found_map = {item.id: item for item in found_items}

    validated_list: List[ValidatedItemDetail] = []
    for item_id in req.item_ids:
        if item_id not in found_map:
            errors.append(f"Menu item {item_id} was not found")
            continue
        
        item = found_map[item_id]
        if item.restaurant_id != req.restaurant_id:
            errors.append(f"Menu item '{item.name}' (id={item.id}) does not belong to restaurant {restaurant.name}")
            continue

        if not item.is_available:
            errors.append(f"Menu item '{item.name}' is currently unavailable")

        validated_list.append(
            ValidatedItemDetail(
                id=item.id,
                name=item.name,
                price=item.price,
                is_available=item.is_available,
                restaurant_id=item.restaurant_id,
            )
        )

    all_valid = (len(errors) == 0 and len(validated_list) == len(req.item_ids))
    return ValidateItemsResponse(
        restaurant_id=restaurant.id,
        restaurant_name=restaurant.name,
        delivery_fee=restaurant.delivery_fee,
        is_restaurant_active=restaurant.is_active,
        items=validated_list,
        all_valid=all_valid,
        errors=errors,
    )
