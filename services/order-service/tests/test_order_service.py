import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import Base, get_db
from src.config import settings

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def create_test_token(user_id: int = 1, role: str = "customer") -> str:
    payload = {
        "sub": str(user_id),
        "email": f"user{user_id}@foodiehub.com",
        "name": f"User {user_id}",
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["service"] == "order-service"

@patch("src.routes.send_order_notification", new_callable=AsyncMock)
@patch("src.routes.create_delivery_assignment", new_callable=AsyncMock)
@patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock)
def test_create_order_server_pricing(mock_validate, mock_delivery, mock_notify, client):
    # Mock restaurant validation response: item 1 is $10.00, item 2 is $5.00
    mock_validate.return_value = {
        "restaurant_id": 1,
        "restaurant_name": "Bella Italia Trattoria",
        "delivery_fee": 3.00,
        "is_restaurant_active": True,
        "all_valid": True,
        "errors": [],
        "items": [
            {"id": 1, "name": "Pizza", "price": 10.00, "is_available": True, "restaurant_id": 1},
            {"id": 2, "name": "Drink", "price": 5.00, "is_available": True, "restaurant_id": 1},
        ]
    }
    mock_delivery.return_value = {"id": 10}
    mock_notify.return_value = True

    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "restaurant_id": 1,
        "items": [
            {"menu_item_id": 1, "quantity": 2}, # 2 * 10 = $20.00
            {"menu_item_id": 2, "quantity": 1}, # 1 * 5 = $5.00
        ],
        "delivery_address": "123 Main St, Apt 4B",
        "contact_phone": "+1-555-0101",
        "notes": "Leave at front door",
        "idempotency_key": "idemp-key-101"
    }

    res = client.post("/api/orders", headers=headers, json=payload)
    assert res.status_code == 201
    data = res.json()

    # Subtotal: 20 + 5 = 25.00
    # Tax: 25.00 * 0.05 = 1.25
    # Delivery fee: 3.00
    # Total: 25.00 + 1.25 + 3.00 = 29.25
    assert data["subtotal"] == 25.00
    assert data["tax"] == 1.25
    assert data["delivery_fee"] == 3.00
    assert data["total_amount"] == 29.25
    assert data["status"] == "CONFIRMED"
    assert len(data["items"]) == 2
    assert data["restaurant_name"] == "Bella Italia Trattoria"

@patch("src.routes.send_order_notification", new_callable=AsyncMock)
@patch("src.routes.create_delivery_assignment", new_callable=AsyncMock)
@patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock)
def test_order_idempotency(mock_validate, mock_delivery, mock_notify, client):
    mock_validate.return_value = {
        "restaurant_id": 1,
        "restaurant_name": "Bella Italia Trattoria",
        "delivery_fee": 3.00,
        "all_valid": True,
        "items": [{"id": 1, "name": "Pizza", "price": 10.00, "is_available": True, "restaurant_id": 1}]
    }
    mock_delivery.return_value = {"id": 10}
    mock_notify.return_value = True

    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "restaurant_id": 1,
        "items": [{"menu_item_id": 1, "quantity": 1}],
        "delivery_address": "123 Main St",
        "contact_phone": "+1-555-0101",
        "idempotency_key": "unique-order-uuid-999"
    }

    res1 = client.post("/api/orders", headers=headers, json=payload)
    assert res1.status_code == 201
    order_id1 = res1.json()["id"]

    # Immediate duplicate request with same idempotency key
    res2 = client.post("/api/orders", headers=headers, json=payload)
    assert res2.status_code in [200, 201]
    order_id2 = res2.json()["id"]
    assert order_id1 == order_id2

def test_cross_user_order_forbidden(client):
    # Manually create order for user 1
    token1 = create_test_token(user_id=1)
    token2 = create_test_token(user_id=2)

    with patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock) as mock_val, \
         patch("src.routes.create_delivery_assignment", new_callable=AsyncMock), \
         patch("src.routes.send_order_notification", new_callable=AsyncMock):
        mock_val.return_value = {
            "restaurant_id": 1,
            "restaurant_name": "Rest",
            "delivery_fee": 2.0,
            "all_valid": True,
            "items": [{"id": 1, "name": "P", "price": 10.0, "is_available": True, "restaurant_id": 1}]
        }
        res = client.post("/api/orders", headers={"Authorization": f"Bearer {token1}"}, json={
            "restaurant_id": 1,
            "items": [{"menu_item_id": 1, "quantity": 1}],
            "delivery_address": "123 Main St",
            "contact_phone": "+1-555-0101"
        })
        order_id = res.json()["id"]

    # User 2 tries to access user 1's order
    res_forbidden = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {token2}"})
    assert res_forbidden.status_code == 403

def test_order_status_transitions(client):
    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    with patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock) as mock_val, \
         patch("src.routes.create_delivery_assignment", new_callable=AsyncMock), \
         patch("src.routes.send_order_notification", new_callable=AsyncMock):
        mock_val.return_value = {
            "restaurant_id": 1,
            "restaurant_name": "Rest",
            "delivery_fee": 2.0,
            "all_valid": True,
            "items": [{"id": 1, "name": "P", "price": 10.0, "is_available": True, "restaurant_id": 1}]
        }
        res = client.post("/api/orders", headers=headers, json={
            "restaurant_id": 1,
            "items": [{"menu_item_id": 1, "quantity": 1}],
            "delivery_address": "123 Main St",
            "contact_phone": "+1-555-0101"
        })
        order_id = res.json()["id"]

    admin_token = create_test_token(user_id=99, role="admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Invalid jump: CONFIRMED -> DELIVERED directly
    with patch("src.routes.send_order_notification", new_callable=AsyncMock):
        res_bad = client.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "DELIVERED"})
        assert res_bad.status_code == 400
        assert "Invalid status transition" in res_bad.json()["detail"]

        # Valid: CONFIRMED -> PREPARING
        res_prep = client.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "PREPARING"})
        assert res_prep.status_code == 200
        assert res_prep.json()["status"] == "PREPARING"

        # Valid: PREPARING -> OUT_FOR_DELIVERY
        res_out = client.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "OUT_FOR_DELIVERY"})
        assert res_out.status_code == 200
        assert res_out.json()["status"] == "OUT_FOR_DELIVERY"

        # Valid: OUT_FOR_DELIVERY -> DELIVERED
        res_del = client.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "DELIVERED"})
        assert res_del.status_code == 200
        assert res_del.json()["status"] == "DELIVERED"

def test_advance_order_status_lifecycle(client):
    customer_token = create_test_token(user_id=1, role="customer")
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    driver_token = create_test_token(user_id=3, role="driver")
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    with patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock) as mock_val, \
         patch("src.routes.create_delivery_assignment", new_callable=AsyncMock), \
         patch("src.routes.send_order_notification", new_callable=AsyncMock):
        mock_val.return_value = {
            "restaurant_id": 1,
            "restaurant_name": "Test Bistro",
            "delivery_fee": 2.50,
            "all_valid": True,
            "items": [{"id": 1, "name": "Item 1", "price": 12.0, "is_available": True, "restaurant_id": 1}]
        }
        res = client.post("/api/orders", headers=customer_headers, json={
            "restaurant_id": 1,
            "items": [{"menu_item_id": 1, "quantity": 1}],
            "delivery_address": "456 Test Ave",
            "contact_phone": "+1-555-0199"
        })
        order_id = res.json()["id"]

    # Customer attempts to advance status -> 403 Forbidden!
    res_forbidden = client.post(f"/api/orders/{order_id}/advance-status", headers=customer_headers)
    assert res_forbidden.status_code == 403
    assert "Only delivery partners" in res_forbidden.json()["detail"]

    with patch("src.routes.send_order_notification", new_callable=AsyncMock), \
         patch("src.routes.sync_delivery_status", new_callable=AsyncMock):
        # Driver advances Step 1: CONFIRMED -> PREPARING
        res1 = client.post(f"/api/orders/{order_id}/advance-status", headers=driver_headers)
        assert res1.status_code == 200
        assert res1.json()["status"] == "PREPARING"

        # Driver advances Step 2: PREPARING -> OUT_FOR_DELIVERY
        res2 = client.post(f"/api/orders/{order_id}/advance-status", headers=driver_headers)
        assert res2.status_code == 200
        assert res2.json()["status"] == "OUT_FOR_DELIVERY"

        # Driver advances Step 3: OUT_FOR_DELIVERY -> DELIVERED
        res3 = client.post(f"/api/orders/{order_id}/advance-status", headers=driver_headers)
        assert res3.status_code == 200
        assert res3.json()["status"] == "DELIVERED"

        # Driver advances beyond DELIVERED -> 400 Bad Request
        res4 = client.post(f"/api/orders/{order_id}/advance-status", headers=driver_headers)
        assert res4.status_code == 400


def test_order_creation_inter_service_failure(client):
    from fastapi import HTTPException
    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate Restaurant Service returning validation failure
    with patch("src.routes.validate_restaurant_and_items", new_callable=AsyncMock) as mock_val:
        mock_val.side_effect = HTTPException(status_code=400, detail="Item #999 is out of stock")
        res = client.post("/api/orders", headers=headers, json={
            "restaurant_id": 1,
            "items": [{"menu_item_id": 999, "quantity": 1}],
            "delivery_address": "456 Test Ave",
            "contact_phone": "+1-555-0199"
        })
        assert res.status_code == 400
        assert "out of stock" in res.json()["detail"]

