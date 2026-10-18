from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, desc

from src.database import get_db
from src.models import Order, OrderItem
from src.schemas import (
    OrderCreateRequest,
    OrderStatusUpdate,
    OrderResponse,
    HealthResponse,
)
from src.config import settings
from src.auth import get_current_user_payload
from src.client import (
    validate_restaurant_and_items,
    create_delivery_assignment,
    send_order_notification,
    sync_delivery_status,
)

logger = logging.getLogger("order-service")
router = APIRouter()

VALID_ORDER_TRANSITIONS = {
    "PENDING": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["PREPARING", "CANCELLED"],
    "PREPARING": ["OUT_FOR_DELIVERY", "CANCELLED"],
    "OUT_FOR_DELIVERY": ["DELIVERED"],
    "DELIVERED": [],
    "CANCELLED": [],
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
        service="order-service",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

@router.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, tags=["Orders"])
async def create_order(
    req: OrderCreateRequest,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(user_payload.get("sub"))

    # Idempotency check:
    if req.idempotency_key:
        existing = db.query(Order).filter(
            Order.user_id == user_id,
            Order.idempotency_key == req.idempotency_key
        ).first()
        if existing:
            logger.info(f"Idempotent order request matched existing order #{existing.id}")
            return existing

    # Validate items with Restaurant Service
    item_quantities = {item.menu_item_id: item.quantity for item in req.items}
    item_ids = list(item_quantities.keys())

    validation_result = await validate_restaurant_and_items(req.restaurant_id, item_ids)

    restaurant_name = validation_result.get("restaurant_name", f"Restaurant #{req.restaurant_id}")
    delivery_fee = float(validation_result.get("delivery_fee", 2.99))
    validated_items = {v["id"]: v for v in validation_result.get("items", [])}

    # Calculate totals server-side
    subtotal = 0.0
    order_items_to_create = []

    for item_id, qty in item_quantities.items():
        val_item = validated_items.get(item_id)
        if not val_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {item_id} could not be verified"
            )
        unit_price = float(val_item["price"])
        item_total = round(unit_price * qty, 2)
        subtotal += item_total

        order_items_to_create.append({
            "menu_item_id": item_id,
            "name": val_item["name"],
            "unit_price": unit_price,
            "quantity": qty,
            "item_total": item_total
        })

    subtotal = round(subtotal, 2)
    tax = round(subtotal * settings.TAX_RATE, 2)
    total_amount = round(subtotal + tax + delivery_fee, 2)

    # Persist Order and Items atomically
    new_order = Order(
        user_id=user_id,
        restaurant_id=req.restaurant_id,
        restaurant_name=restaurant_name,
        status="CONFIRMED",
        subtotal=subtotal,
        tax=tax,
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        delivery_address=req.delivery_address.strip(),
        contact_phone=req.contact_phone.strip(),
        notes=req.notes.strip() if req.notes else None,
        idempotency_key=req.idempotency_key,
    )
    db.add(new_order)
    db.flush()  # assign new_order.id

    for item_info in order_items_to_create:
        db_item = OrderItem(
            order_id=new_order.id,
            **item_info
        )
        db.add(db_item)

    db.commit()
    db.refresh(new_order)
    logger.info(f"Order #{new_order.id} placed successfully by user #{user_id}. Total: ${total_amount:.2f}")

    # Async downstream inter-service notifications & delivery creation
    # Restaurant address placeholder for pickup
    pickup_address = f"{restaurant_name} Kitchen, Culinary Ave"
    await create_delivery_assignment(
        order_id=new_order.id,
        user_id=user_id,
        restaurant_id=new_order.restaurant_id,
        pickup_address=pickup_address,
        dropoff_address=new_order.delivery_address
    )

    await send_order_notification(
        user_id=user_id,
        order_id=new_order.id,
        title="Order Placed Successfully",
        message=f"Your order #{new_order.id} with {restaurant_name} for ${total_amount:.2f} is confirmed!",
        notif_type="ORDER_CONFIRMED"
    )

    return new_order

@router.get("/api/orders", response_model=List[OrderResponse], tags=["Orders"])
def list_orders(
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    current_user_id = int(user_payload.get("sub"))
    role = user_payload.get("role")

    query = db.query(Order)
    if role not in ["admin", "driver"]:
        query = query.filter(Order.user_id == current_user_id)

    return query.order_by(desc(Order.created_at)).all()

@router.get("/api/orders/{order_id}", response_model=OrderResponse, tags=["Orders"])
def get_order_by_id(
    order_id: int,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order #{order_id} not found"
        )

    current_user_id = int(user_payload.get("sub"))
    role = user_payload.get("role")

    # Prevent cross-user access
    if order.user_id != current_user_id and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this order"
        )

    return order

@router.patch("/api/orders/{order_id}/status", response_model=OrderResponse, tags=["Orders"])
async def update_order_status(
    order_id: int,
    req: OrderStatusUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order #{order_id} not found"
        )

    current_user_id = int(user_payload.get("sub"))
    role = user_payload.get("role")

    # Only owner (for cancellation) or admin/staff can update status
    if order.user_id != current_user_id and role not in ["admin", "driver"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to change this order status"
        )

    # Customer can only cancel
    if role == "customer" and req.status != "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers can only cancel pending orders"
        )

    current_status = order.status
    new_status = req.status

    if new_status != current_status:
        allowed = VALID_ORDER_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{current_status}' to '{new_status}'. Allowed: {allowed}"
            )
        order.status = new_status
        db.commit()
        db.refresh(order)
        logger.info(f"Order #{order_id} transitioned from {current_status} to {new_status}")

        # Send notification to user
        status_msgs = {
            "PREPARING": f"The kitchen has started preparing your order #{order.id}.",
            "OUT_FOR_DELIVERY": f"Your order #{order.id} is out for delivery!",
            "DELIVERED": f"Your order #{order.id} has been delivered. Enjoy!",
            "CANCELLED": f"Your order #{order.id} has been cancelled.",
        }
        await send_order_notification(
            user_id=order.user_id,
            order_id=order.id,
            title=f"Order Status: {new_status.replace('_', ' ').title()}",
            message=status_msgs.get(new_status, f"Order status updated to {new_status}"),
            notif_type="ORDER_STATUS_UPDATE"
        )

        # Synchronize Delivery Service
        if new_status == "OUT_FOR_DELIVERY":
            await sync_delivery_status(order_id=order.id, new_status="IN_TRANSIT")
        elif new_status == "DELIVERED":
            await sync_delivery_status(order_id=order.id, new_status="DELIVERED")

    return order

@router.post("/api/orders/{order_id}/advance-status", response_model=OrderResponse, tags=["Orders"])
async def advance_order_status(
    order_id: int,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    """
    Demo & Presentation helper:
    Transitions an order through its natural lifecycle:
    CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
    Also synchronizes delivery status and dispatches real-time user notifications.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order #{order_id} not found"
        )

    role = user_payload.get("role")

    if role not in ["admin", "driver"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only delivery partners (drivers) or administrators can advance order status. Customers cannot advance their own orders."
        )

    progression = {
        "PENDING": "CONFIRMED",
        "CONFIRMED": "PREPARING",
        "PREPARING": "OUT_FOR_DELIVERY",
        "OUT_FOR_DELIVERY": "DELIVERED",
    }

    next_status = progression.get(order.status)
    if not next_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order #{order_id} is in '{order.status}' status and cannot be advanced further."
        )

    current_status = order.status
    order.status = next_status
    db.commit()
    db.refresh(order)
    logger.info(f"Order #{order_id} advanced from {current_status} to {next_status}")

    status_msgs = {
        "CONFIRMED": f"Your order #{order.id} has been confirmed.",
        "PREPARING": f"The kitchen has started preparing your order #{order.id}.",
        "OUT_FOR_DELIVERY": f"Your order #{order.id} is out for delivery! Courier is on the way.",
        "DELIVERED": f"Your order #{order.id} has been delivered. Enjoy!",
    }
    await send_order_notification(
        user_id=order.user_id,
        order_id=order.id,
        title=f"Order Status: {next_status.replace('_', ' ').title()}",
        message=status_msgs.get(next_status, f"Order status updated to {next_status}"),
        notif_type="ORDER_STATUS_UPDATE"
    )

    # Synchronize Delivery Service
    if next_status == "OUT_FOR_DELIVERY":
        await sync_delivery_status(order_id=order.id, new_status="IN_TRANSIT")
    elif next_status == "DELIVERED":
        await sync_delivery_status(order_id=order.id, new_status="DELIVERED")

    return order

