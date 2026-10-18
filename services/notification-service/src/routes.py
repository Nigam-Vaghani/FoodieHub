from datetime import datetime, timezone, timedelta
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, desc

from src.database import get_db
from src.models import Notification
from src.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    HealthResponse,
)
from src.auth import get_current_user_payload

logger = logging.getLogger("notification-service")
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
        service="notification-service",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

@router.post("/api/notifications", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED, tags=["Notifications"])
def create_notification(req: NotificationCreate, db: Session = Depends(get_db)):
    # Idempotent deduplication check:
    # If same user, order_id, and type created in last 10 seconds, return existing
    if req.order_id:
        recent_threshold = datetime.utcnow() - timedelta(seconds=10)
        recent = db.query(Notification).filter(
            Notification.user_id == req.user_id,
            Notification.order_id == req.order_id,
            Notification.type == req.type,
            Notification.created_at >= recent_threshold
        ).first()
        if recent:
            logger.info(f"Duplicate notification suppressed for order {req.order_id}, type {req.type}")
            return recent

    notification = Notification(
        user_id=req.user_id,
        order_id=req.order_id,
        title=req.title.strip(),
        message=req.message.strip(),
        type=req.type or "GENERAL",
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info(f"Notification created: id={notification.id} for user={notification.user_id} title='{notification.title}'")
    return notification

@router.get("/api/notifications", response_model=NotificationListResponse, tags=["Notifications"])
def get_user_notifications(
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(user_payload.get("sub"))
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(desc(Notification.created_at)).all()

    unread_count = sum(1 for n in notifications if not n.is_read)
    total_count = len(notifications)

    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread_count,
        total_count=total_count,
    )

@router.patch("/api/notifications/{notification_id}/read", response_model=NotificationResponse, tags=["Notifications"])
def mark_notification_as_read(
    notification_id: int,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(user_payload.get("sub"))
    notification = db.query(Notification).filter(Notification.id == notification_id).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notification_id} not found"
        )

    # Prevent cross-user access
    if notification.user_id != user_id and user_payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this notification"
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@router.patch("/api/notifications/read-all", tags=["Notifications"])
def mark_all_notifications_as_read(
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(user_payload.get("sub"))
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
