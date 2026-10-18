from datetime import datetime, timezone, timedelta
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, desc

from src.database import get_db
from src.models import Delivery
from src.schemas import (
    DeliveryCreate,
    DeliveryStatusUpdate,
    DeliveryResponse,
    HealthResponse,
)
from src.auth import get_current_user_payload
from src.client import send_notification

logger = logging.getLogger("delivery-service")
router = APIRouter()

VALID_DELIVERY_TRANSITIONS = {
    "ASSIGNED": ["PICKED_UP", "FAILED"],
    "PICKED_UP": ["IN_TRANSIT", "FAILED"],
    "IN_TRANSIT": ["DELIVERED", "FAILED"],
    "DELIVERED": [],
    "FAILED": [],
}

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
        service="delivery-service",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

@router.post("/api/deliveries", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED, tags=["Deliveries"])
async def create_delivery(req: DeliveryCreate, db: Session = Depends(get_db)):
    # Idempotent duplicate check: If a delivery for this order_id already exists, return it
    existing = db.query(Delivery).filter(Delivery.order_id == req.order_id).first()
    if existing:
        logger.info(f"Delivery assignment for order #{req.order_id} already exists (id={existing.id}). Returning existing record.")
        return existing

    eta = datetime.utcnow() + timedelta(minutes=req.estimated_minutes)
    delivery = Delivery(
        order_id=req.order_id,
        user_id=req.user_id,
        restaurant_id=req.restaurant_id,
        driver_name=req.driver_name or "Bob Courier",
        driver_phone=req.driver_phone or "+1-555-0102",
        status="ASSIGNED",
        pickup_address=req.pickup_address,
        dropoff_address=req.dropoff_address,
        estimated_delivery_time=eta,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    logger.info(f"Created delivery assignment: id={delivery.id} for order #{delivery.order_id}")

    # Notify user asynchronously
    await send_notification(
        user_id=delivery.user_id,
        order_id=delivery.order_id,
        title="Driver Assigned",
        message=f"Courier {delivery.driver_name} has been assigned to your order #{delivery.order_id}.",
        notif_type="DELIVERY_ASSIGNED",
    )

    return delivery

@router.get("/api/deliveries/order/{order_id}", response_model=DeliveryResponse, tags=["Deliveries"])
def get_delivery_by_order(
    order_id: int,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    delivery = db.query(Delivery).filter(Delivery.order_id == order_id).first()
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No delivery assignment found for order #{order_id}"
        )

    current_user_id = int(user_payload.get("sub"))
    role = user_payload.get("role")
    if delivery.user_id != current_user_id and role not in ["admin", "driver"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this delivery"
        )

    return delivery

@router.patch("/api/deliveries/order/{order_id}/status", response_model=DeliveryResponse, tags=["Deliveries"])
async def update_delivery_status_by_order(
    order_id: int,
    req: DeliveryStatusUpdate,
    db: Session = Depends(get_db)
):
    delivery = db.query(Delivery).filter(Delivery.order_id == order_id).first()
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No delivery assignment found for order #{order_id}"
        )

    current_status = delivery.status
    new_status = req.status

    if new_status != current_status:
        delivery.status = new_status
        db.commit()
        db.refresh(delivery)
        logger.info(f"Delivery for order #{order_id} transitioned from {current_status} to {new_status}")

        status_messages = {
            "PICKED_UP": f"Courier has picked up your order #{order_id} from the restaurant.",
            "IN_TRANSIT": f"Your order #{order_id} is on the way! Courier is en route.",
            "DELIVERED": f"Your order #{order_id} has been delivered! Enjoy your meal.",
            "FAILED": f"Delivery for order #{order_id} could not be completed.",
        }
        await send_notification(
            user_id=delivery.user_id,
            order_id=order_id,
            title=f"Delivery Update: {new_status.replace('_', ' ').title()}",
            message=status_messages.get(new_status, f"Delivery status updated to {new_status}"),
            notif_type="DELIVERY_UPDATE",
        )

    return delivery

@router.get("/api/deliveries/{delivery_id}", response_model=DeliveryResponse, tags=["Deliveries"])
def get_delivery(
    delivery_id: int,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery with ID {delivery_id} not found"
        )

    current_user_id = int(user_payload.get("sub"))
    role = user_payload.get("role")
    if delivery.user_id != current_user_id and role not in ["admin", "driver"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this delivery"
        )

    return delivery

@router.get("/api/deliveries", response_model=List[DeliveryResponse], tags=["Deliveries"])
def list_deliveries(
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    current_user_id = int(user_payload.get("sub"))
    role = user_payload.get("role")

    query = db.query(Delivery)
    if role not in ["admin", "driver"]:
        query = query.filter(Delivery.user_id == current_user_id)

    return query.order_by(desc(Delivery.created_at)).all()

@router.patch("/api/deliveries/{delivery_id}/status", response_model=DeliveryResponse, tags=["Deliveries"])
async def update_delivery_status(
    delivery_id: int,
    req: DeliveryStatusUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery with ID {delivery_id} not found"
        )

    current_status = delivery.status
    new_status = req.status

    if new_status != current_status:
        allowed = VALID_DELIVERY_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid delivery status transition from '{current_status}' to '{new_status}'. Allowed: {allowed}"
            )
        delivery.status = new_status
        db.commit()
        db.refresh(delivery)
        logger.info(f"Delivery #{delivery_id} transitioned from {current_status} to {new_status}")

        # Send notification to user
        status_messages = {
            "PICKED_UP": f"Courier has picked up your order #{delivery.order_id} from the restaurant.",
            "IN_TRANSIT": f"Your order #{delivery.order_id} is on the way! Courier is en route.",
            "DELIVERED": f"Your order #{delivery.order_id} has been delivered! Enjoy your meal.",
            "FAILED": f"Delivery for order #{delivery.order_id} could not be completed.",
        }
        await send_notification(
            user_id=delivery.user_id,
            order_id=delivery.order_id,
            title=f"Delivery Update: {new_status.replace('_', ' ').title()}",
            message=status_messages.get(new_status, f"Delivery status updated to {new_status}"),
            notif_type="DELIVERY_UPDATE",
        )

    return delivery
