import pytest
from datetime import datetime, timezone, timedelta
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
    assert res.json()["service"] == "notification-service"

def test_create_notification(client):
    payload = {
        "user_id": 1,
        "order_id": 101,
        "title": "Order Confirmed",
        "message": "Your order #101 has been received.",
        "type": "ORDER_CONFIRMED"
    }
    res = client.post("/api/notifications", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["user_id"] == 1
    assert data["order_id"] == 101
    assert data["is_read"] is False

def test_duplicate_notification_suppression(client):
    payload = {
        "user_id": 1,
        "order_id": 102,
        "title": "Delivery Update",
        "message": "Courier is nearby.",
        "type": "DELIVERY_UPDATE"
    }
    res1 = client.post("/api/notifications", json=payload)
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # Immediate duplicate request
    res2 = client.post("/api/notifications", json=payload)
    assert res2.status_code == 201 or res2.status_code == 200
    id2 = res2.json()["id"]
    assert id1 == id2

def test_get_user_notifications(client):
    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    # Create notifications for user 1 and user 2
    client.post("/api/notifications", json={
        "user_id": 1,
        "title": "N1",
        "message": "Msg 1",
        "type": "GENERAL"
    })
    client.post("/api/notifications", json={
        "user_id": 2,
        "title": "N2",
        "message": "Msg 2",
        "type": "GENERAL"
    })

    res = client.get("/api/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 1
    assert data["unread_count"] == 1
    assert data["notifications"][0]["title"] == "N1"

def test_mark_notification_as_read(client):
    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/notifications", json={
        "user_id": 1,
        "title": "Unread N",
        "message": "Msg",
        "type": "GENERAL"
    })
    notif_id = create_res.json()["id"]

    patch_res = client.patch(f"/api/notifications/{notif_id}/read", headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["is_read"] is True

def test_cross_user_read_forbidden(client):
    # Notification for user 1
    create_res = client.post("/api/notifications", json={
        "user_id": 1,
        "title": "User 1 Secret Notif",
        "message": "Msg",
        "type": "GENERAL"
    })
    notif_id = create_res.json()["id"]

    # User 2 tries to mark it as read
    user2_token = create_test_token(user_id=2)
    headers = {"Authorization": f"Bearer {user2_token}"}

    patch_res = client.patch(f"/api/notifications/{notif_id}/read", headers=headers)
    assert patch_res.status_code == 403

def test_mark_all_as_read(client):
    token = create_test_token(user_id=1)
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/notifications", json={"user_id": 1, "title": "A", "message": "1", "type": "GEN"})
    client.post("/api/notifications", json={"user_id": 1, "title": "B", "message": "2", "type": "GEN"})

    read_all_res = client.patch("/api/notifications/read-all", headers=headers)
    assert read_all_res.status_code == 200

    list_res = client.get("/api/notifications", headers=headers)
    assert list_res.json()["unread_count"] == 0
