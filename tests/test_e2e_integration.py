"""
End-to-End Integration Verification Test Suite for FoodieHub.
Verifies complete flow across User, Restaurant, Order, Delivery, and Notification services.
"""
import pytest
import sys
import importlib.util
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
import jwt
from fastapi.testclient import TestClient

root_dir = Path(__file__).parent.parent

def load_isolated_service_app(service_dir_name: str):
    # Purge any cached 'src' modules from previous microservice imports
    for mod_key in list(sys.modules.keys()):
        if mod_key == "src" or mod_key.startswith("src."):
            del sys.modules[mod_key]

    service_path = root_dir / "services" / service_dir_name
    main_file = service_path / "src" / "main.py"
    sys.path = [str(service_path)] + [p for p in sys.path if not p.startswith(str(root_dir / "services"))]

    module_name = f"{service_dir_name.replace('-', '_')}_main"
    spec = importlib.util.spec_from_file_location(module_name, str(main_file))
    if not spec or not spec.loader:
        raise ImportError(f"Could not load spec for {main_file}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module.app

def create_jwt_token(user_id: int, email: str, name: str, role: str = "customer") -> str:
    secret = "foodiehub-cloudnative-super-secure-jwt-secret-key-32bytes-min!"
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def test_full_customer_order_journey():
    """
    Executes the complete customer journey:
    1. Authenticate user.
    2. Browse restaurant catalog and select dishes.
    3. Place an order with server-calculated totals.
    4. Validate delivery assignment creation.
    5. Validate in-app notification dispatch.
    6. Enforce strict cross-user security (User 2 blocked from User 1's order).
    7. Execute order status transition.
    """
    # 1. Authenticate customer with User Service
    user_app = load_isolated_service_app("user-service")
    with TestClient(user_app) as user_client:
        login_res = user_client.post("/api/users/login", json={
            "email": "customer@foodiehub.com",
            "password": "Password123!"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        user_info = login_res.json()["user"]
        user_id = user_info["id"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Browse restaurants with Restaurant Service
    restaurant_app = load_isolated_service_app("restaurant-service")
    with TestClient(restaurant_app) as restaurant_client:
        restaurants_res = restaurant_client.get("/api/restaurants")
        assert restaurants_res.status_code == 200
        restaurants = restaurants_res.json()
        assert len(restaurants) >= 4
        first_rest = restaurants[0]
        rest_id = first_rest["id"]

        # Get restaurant menu
        menu_res = restaurant_client.get(f"/api/restaurants/{rest_id}/menu")
        assert menu_res.status_code == 200
        menu_items = menu_res.json()
        assert len(menu_items) >= 2
        item1 = menu_items[0]
        item2 = menu_items[1]

    # 3. Place Order with Server-Side Pricing Verification
    expected_subtotal = round(item1["price"] * 2 + item2["price"] * 1, 2)
    expected_tax = round(expected_subtotal * 0.05, 2)
    expected_delivery_fee = first_rest["delivery_fee"]
    expected_total = round(expected_subtotal + expected_tax + expected_delivery_fee, 2)

    order_payload = {
        "restaurant_id": rest_id,
        "items": [
            {"menu_item_id": item1["id"], "quantity": 2},
            {"menu_item_id": item2["id"], "quantity": 1},
        ],
        "delivery_address": "742 Evergreen Terrace, Springfield",
        "contact_phone": "+1-555-0101",
        "notes": "Ring doorbell",
        "idempotency_key": f"e2e-order-{int(datetime.now().timestamp())}"
    }

    order_app = load_isolated_service_app("order-service")
    with TestClient(order_app) as order_client:
        with patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock) as mock_val, \
             patch("src.routes.create_delivery_assignment", new_callable=AsyncMock) as mock_deliv, \
             patch("src.routes.send_order_notification", new_callable=AsyncMock) as mock_notif:

            mock_val.return_value = {
                "restaurant_id": rest_id,
                "restaurant_name": first_rest["name"],
                "delivery_fee": expected_delivery_fee,
                "is_restaurant_active": True,
                "all_valid": True,
                "items": [
                    {"id": item1["id"], "name": item1["name"], "price": item1["price"], "is_available": True, "restaurant_id": rest_id},
                    {"id": item2["id"], "name": item2["name"], "price": item2["price"], "is_available": True, "restaurant_id": rest_id},
                ],
                "errors": []
            }
            mock_deliv.return_value = {"id": 101, "status": "ASSIGNED"}
            mock_notif.return_value = True

            order_res = order_client.post("/api/orders", headers=headers, json=order_payload)
            assert order_res.status_code == 201, f"Order placement failed: {order_res.text}"
            order_data = order_res.json()
            order_id = order_data["id"]

            # Verify Server-Calculated Totals
            assert order_data["subtotal"] == expected_subtotal
            assert order_data["tax"] == expected_tax
            assert order_data["delivery_fee"] == expected_delivery_fee
            assert order_data["total_amount"] == expected_total
            assert order_data["status"] == "CONFIRMED"
            assert len(order_data["items"]) == 2

    # 4. Verify Delivery Creation & Status
    delivery_app = load_isolated_service_app("delivery-service")
    with TestClient(delivery_app) as delivery_client:
        with patch("src.routes.send_notification", new_callable=AsyncMock) as mock_del_notif:
            mock_del_notif.return_value = True
            deliv_res = delivery_client.post("/api/deliveries", json={
                "order_id": order_id,
                "user_id": user_id,
                "restaurant_id": rest_id,
                "pickup_address": f"{first_rest['name']} Kitchen",
                "dropoff_address": "742 Evergreen Terrace, Springfield",
                "estimated_minutes": 30
            })
            assert deliv_res.status_code in [200, 201]

            # Track delivery
            track_res = delivery_client.get(f"/api/deliveries/order/{order_id}", headers=headers)
            assert track_res.status_code == 200
            assert track_res.json()["order_id"] == order_id

    # 5. Verify In-App Notification Generation
    notification_app = load_isolated_service_app("notification-service")
    with TestClient(notification_app) as notification_client:
        notif_post_res = notification_client.post("/api/notifications", json={
            "user_id": user_id,
            "order_id": order_id,
            "title": "Order Confirmed",
            "message": f"Your order #{order_id} has been confirmed!",
            "type": "ORDER_CONFIRMED"
        })
        assert notif_post_res.status_code in [200, 201]

        notifs_res = notification_client.get("/api/notifications", headers=headers)
        assert notifs_res.status_code == 200
        user_notifs = notifs_res.json()
        assert user_notifs["total_count"] >= 1

    # 6. User Isolation Security Test: User 2 Attempting to Access User 1's Order must be 403 Forbidden!
    user2_token = create_jwt_token(user_id=999, email="attacker@test.com", name="Attacker")
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    order_app2 = load_isolated_service_app("order-service")
    with TestClient(order_app2) as order_client2:
        snoop_order_res = order_client2.get(f"/api/orders/{order_id}", headers=user2_headers)
        assert snoop_order_res.status_code == 403, "Cross-user order access must be forbidden (403)!"

    delivery_app2 = load_isolated_service_app("delivery-service")
    with TestClient(delivery_app2) as delivery_client2:
        snoop_deliv_res = delivery_client2.get(f"/api/deliveries/order/{order_id}", headers=user2_headers)
        assert snoop_deliv_res.status_code == 403, "Cross-user delivery access must be forbidden (403)!"

    # 7. Valid Order Status Transitions
    admin_token = create_jwt_token(user_id=2, email="admin@foodiehub.com", name="Admin", role="admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    order_app3 = load_isolated_service_app("order-service")
    with TestClient(order_app3) as order_client3:
        with patch("src.routes.send_order_notification", new_callable=AsyncMock):
            # CONFIRMED -> PREPARING
            step1 = order_client3.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "PREPARING"})
            assert step1.status_code == 200
            assert step1.json()["status"] == "PREPARING"

            # PREPARING -> OUT_FOR_DELIVERY
            step2 = order_client3.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "OUT_FOR_DELIVERY"})
            assert step2.status_code == 200
            assert step2.json()["status"] == "OUT_FOR_DELIVERY"

            # OUT_FOR_DELIVERY -> DELIVERED
            step3 = order_client3.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "DELIVERED"})
            assert step3.status_code == 200
            assert step3.json()["status"] == "DELIVERED"
