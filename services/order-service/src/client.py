import logging
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from src.config import settings

logger = logging.getLogger("order-service")

async def validate_restaurant_and_items(restaurant_id: int, item_ids: List[int]) -> Dict[str, Any]:
    """
    Calls Restaurant Service to validate that the restaurant exists and is active,
    and that all requested items belong to this restaurant and are available.
    Returns verified item details and restaurant info.
    """
    url = f"{settings.RESTAURANT_SERVICE_URL.rstrip('/')}/api/restaurants/validate-items"
    payload = {
        "restaurant_id": restaurant_id,
        "item_ids": item_ids
    }
    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == status.HTTP_200_OK:
                data = resp.json()
                if not data.get("all_valid"):
                    errors = data.get("errors", ["Unknown validation failure"])
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Order validation failed: {'; '.join(errors)}"
                    )
                return data
            elif resp.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Restaurant #{restaurant_id} was not found"
                )
            else:
                logger.error(f"Restaurant service returned unexpected code {resp.status_code}: {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Restaurant service failed to validate order items (HTTP {resp.status_code})"
                )
    except httpx.RequestError as exc:
        logger.error(f"Failed to connect to Restaurant Service at {url}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Restaurant Service is temporarily unreachable. Please try again."
        )

async def create_delivery_assignment(
    order_id: int,
    user_id: int,
    restaurant_id: int,
    pickup_address: str,
    dropoff_address: str
) -> Optional[Dict[str, Any]]:
    """
    Calls Delivery Service to dispatch a driver assignment.
    """
    url = f"{settings.DELIVERY_SERVICE_URL.rstrip('/')}/api/deliveries"
    payload = {
        "order_id": order_id,
        "user_id": user_id,
        "restaurant_id": restaurant_id,
        "pickup_address": pickup_address,
        "dropoff_address": dropoff_address,
        "estimated_minutes": 30
    }
    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in [200, 201]:
                logger.info(f"Successfully initiated delivery for order #{order_id}")
                return resp.json()
            else:
                logger.warning(f"Delivery service returned status {resp.status_code}: {resp.text}")
                return None
    except httpx.RequestError as exc:
        logger.warning(f"Could not reach Delivery Service for order #{order_id}: {exc}")
        return None
    except Exception as exc:
        logger.error(f"Error calling Delivery Service: {exc}")
        return None

async def send_order_notification(
    user_id: int,
    order_id: int,
    title: str,
    message: str,
    notif_type: str
) -> bool:
    """
    Calls Notification Service to persist an in-app notification.
    """
    url = f"{settings.NOTIFICATION_SERVICE_URL.rstrip('/')}/api/notifications"
    payload = {
        "user_id": user_id,
        "order_id": order_id,
        "title": title,
        "message": message,
        "type": notif_type
    }
    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in [200, 201]:
                logger.info(f"Order #{order_id} notification sent to user #{user_id}")
                return True
            else:
                logger.warning(f"Notification service returned {resp.status_code}: {resp.text}")
                return False
    except httpx.RequestError as exc:
        logger.warning(f"Notification service unreachable for order #{order_id}: {exc}")
        return False
    except Exception as exc:
        logger.error(f"Error sending order notification: {exc}")
        return False

async def sync_delivery_status(order_id: int, new_status: str) -> Optional[Dict[str, Any]]:
    """
    Calls Delivery Service to synchronize delivery status corresponding to an order.
    """
    url = f"{settings.DELIVERY_SERVICE_URL.rstrip('/')}/api/deliveries/order/{order_id}/status"
    payload = {"status": new_status}
    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.patch(url, json=payload)
            if resp.status_code == 200:
                logger.info(f"Synced delivery status to {new_status} for order #{order_id}")
                return resp.json()
            else:
                logger.warning(f"Delivery status sync returned HTTP {resp.status_code}: {resp.text}")
                return None
    except Exception as exc:
        logger.warning(f"Failed to sync delivery status for order #{order_id}: {exc}")
        return None

