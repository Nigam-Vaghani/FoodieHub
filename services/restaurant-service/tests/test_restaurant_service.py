import pytest
from datetime import datetime, timezone, timedelta
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import Base, get_db
from src.seed import seed_restaurants
from src.config import settings

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def create_test_token(role: str = "admin", user_id: int = 1) -> str:
    payload = {
        "sub": str(user_id),
        "email": "test@foodiehub.com",
        "name": "Test User",
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_restaurants(db)
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
    assert res.json()["service"] == "restaurant-service"

def test_list_restaurants_returns_seeded_data(client):
    res = client.get("/api/restaurants")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4
    names = [r["name"] for r in data]
    assert "Bella Italia Trattoria" in names

def test_filter_restaurants_by_cuisine(client):
    res = client.get("/api/restaurants?cuisine=Italian")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert all("Italian" in r["cuisine_type"] for r in data)

def test_get_restaurant_detail(client):
    res = client.get("/api/restaurants/1")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert "menu_items" in data
    assert len(data["menu_items"]) > 0

def test_get_nonexistent_restaurant_returns_404(client):
    res = client.get("/api/restaurants/99999")
    assert res.status_code == 404

def test_validate_items_success(client):
    # Restaurant 1 has item 1 and item 2
    res = client.post("/api/restaurants/validate-items", json={
        "restaurant_id": 1,
        "item_ids": [1, 2]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["all_valid"] is True
    assert len(data["items"]) == 2
    assert data["restaurant_id"] == 1

def test_validate_items_invalid_item(client):
    # Pass an item ID that does not exist
    res = client.post("/api/restaurants/validate-items", json={
        "restaurant_id": 1,
        "item_ids": [1, 99999]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["all_valid"] is False
    assert len(data["errors"]) > 0

def test_admin_create_restaurant(client):
    admin_token = create_test_token(role="admin")
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "Le Petit Bistro",
        "description": "Authentic French croissants and pastries.",
        "cuisine_type": "French",
        "address": "100 Paris St",
        "phone": "+1-555-0909",
        "rating": 4.9,
        "delivery_time_mins": 20,
        "delivery_fee": 1.99,
        "image_url": "https://example.com/french.jpg",
        "is_active": True
    }
    res = client.post("/api/restaurants", headers=headers, json=payload)
    assert res.status_code == 201
    assert res.json()["name"] == "Le Petit Bistro"

def test_customer_cannot_create_restaurant(client):
    customer_token = create_test_token(role="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}
    payload = {
        "name": "Unauthorized Place",
        "description": "Should fail",
        "cuisine_type": "Test",
        "address": "123 Test St",
        "phone": "+1-555-0000",
        "rating": 4.0,
        "delivery_time_mins": 20,
        "delivery_fee": 2.0,
        "image_url": "https://example.com/test.jpg"
    }
    res = client.post("/api/restaurants", headers=headers, json=payload)
    assert res.status_code == 403
