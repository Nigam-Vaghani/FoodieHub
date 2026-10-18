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
    assert res.json()["service"] == "delivery-service"

@patch("src.routes.send_notification", new_callable=AsyncMock)
def test_create_delivery(mock_notify, client):
    mock_notify.return_value = True
    payload = {
        "order_id": 501,
        "user_id": 1,
        "restaurant_id": 1,
        "pickup_address": "42 Little Italy Way",
        "dropoff_address": "123 Gourmet St",
        "estimated_minutes": 30
    }
    res = client.post("/api/deliveries", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["order_id"] == 501
    assert data["status"] == "ASSIGNED"
    assert data["driver_name"] == "Bob Courier"

@patch("src.routes.send_notification", new_callable=AsyncMock)
def test_idempotent_duplicate_delivery(mock_notify, client):
    mock_notify.return_value = True
    payload = {
        "order_id": 502,
        "user_id": 1,
        "restaurant_id": 1,
        "pickup_address": "42 Little Italy Way",
        "dropoff_address": "123 Gourmet St",
        "estimated_minutes": 30
    }
    res1 = client.post("/api/deliveries", json=payload)
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # Duplicate call
    res2 = client.post("/api/deliveries", json=payload)
    assert res2.status_code == 200 or res2.status_code == 201
    id2 = res2.json()["id"]
    assert id1 == id2

@patch("src.routes.send_notification", new_callable=AsyncMock)
def test_get_delivery_by_order(mock_notify, client):
    mock_notify.return_value = True
    create_res = client.post("/api/deliveries", json={
        "order_id": 503,
        "user_id": 1,
        "restaurant_id": 1,
        "pickup_address": "42 Little Italy Way",
        "dropoff_address": "123 Gourmet St",
    })
    assert create_res.status_code == 201

    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/deliveries/order/503", headers=headers)
    assert res.status_code == 200
    assert res.json()["order_id"] == 503

@patch("src.routes.send_notification", new_callable=AsyncMock)
def test_cross_user_delivery_access_forbidden(mock_notify, client):
    mock_notify.return_value = True
    create_res = client.post("/api/deliveries", json={
        "order_id": 504,
        "user_id": 1,
        "restaurant_id": 1,
        "pickup_address": "42 Little Italy Way",
        "dropoff_address": "123 Gourmet St",
    })
    assert create_res.status_code == 201

    # User 2 tries to access user 1's delivery
    token2 = create_test_token(user_id=2)
    headers = {"Authorization": f"Bearer {token2}"}
    res = client.get("/api/deliveries/order/504", headers=headers)
    assert res.status_code == 403

@patch("src.routes.send_notification", new_callable=AsyncMock)
def test_delivery_status_transitions(mock_notify, client):
    mock_notify.return_value = True
    create_res = client.post("/api/deliveries", json={
        "order_id": 505,
        "user_id": 1,
        "restaurant_id": 1,
        "pickup_address": "42 Little Italy Way",
        "dropoff_address": "123 Gourmet St",
    })
    assert create_res.status_code == 201
    delivery_id = create_res.json()["id"]

    driver_token = create_test_token(user_id=3, role="driver")
    headers = {"Authorization": f"Bearer {driver_token}"}

    # Invalid jump: ASSIGNED -> DELIVERED directly
    res_bad = client.patch(f"/api/deliveries/{delivery_id}/status", headers=headers, json={"status": "DELIVERED"})
    assert res_bad.status_code == 400
    assert "Invalid delivery status transition" in res_bad.json()["detail"]

    # Valid step 1: ASSIGNED -> PICKED_UP
    res_step1 = client.patch(f"/api/deliveries/{delivery_id}/status", headers=headers, json={"status": "PICKED_UP"})
    assert res_step1.status_code == 200
    assert res_step1.json()["status"] == "PICKED_UP"

    # Valid step 2: PICKED_UP -> IN_TRANSIT
    res_step2 = client.patch(f"/api/deliveries/{delivery_id}/status", headers=headers, json={"status": "IN_TRANSIT"})
    assert res_step2.status_code == 200
    assert res_step2.json()["status"] == "IN_TRANSIT"

    # Valid step 3: IN_TRANSIT -> DELIVERED
    res_step3 = client.patch(f"/api/deliveries/{delivery_id}/status", headers=headers, json={"status": "DELIVERED"})
    assert res_step3.status_code == 200
    assert res_step3.json()["status"] == "DELIVERED"

@patch("src.routes.send_notification", new_callable=AsyncMock)
def test_update_delivery_status_by_order_id(mock_notify, client):
    mock_notify.return_value = True
    create_res = client.post("/api/deliveries", json={
        "order_id": 999,
        "user_id": 1,
        "restaurant_id": 1,
        "pickup_address": "42 Little Italy Way",
        "dropoff_address": "123 Gourmet St",
    })
    assert create_res.status_code == 201

    res = client.patch("/api/deliveries/order/999/status", json={"status": "IN_TRANSIT"})
    assert res.status_code == 200
    assert res.json()["status"] == "IN_TRANSIT"
    assert res.json()["order_id"] == 999

