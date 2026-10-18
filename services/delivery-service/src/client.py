import logging
import httpx
from src.config import settings

logger = logging.getLogger("delivery-service")

async def send_notification(user_id: int, order_id: int, title: str, message: str, notif_type: str) -> bool:
    url = f"{settings.NOTIFICATION_SERVICE_URL.rstrip('/')}/api/notifications"
    payload = {
        "user_id": user_id,
        "order_id": order_id,
        "title": title,
        "message": message,
        "type": notif_type,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload)
            if response.status_code in [200, 201]:
                logger.info(f"Successfully notified user {user_id} regarding delivery for order {order_id}")
                return True
            else:
                logger.warning(f"Notification service returned status {response.status_code}: {response.text}")
                return False
    except httpx.RequestError as exc:
        logger.warning(f"Failed to reach Notification Service at {url}: {exc}")
        return False
    except Exception as exc:
        logger.error(f"Unexpected error sending notification: {exc}")
        return False
