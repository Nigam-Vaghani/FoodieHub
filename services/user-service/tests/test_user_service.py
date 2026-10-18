import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import Base, get_db
from src.seed import seed_users

# Use an in-memory SQLite database for fast, isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_users(db)
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
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "user-service"
    assert data["database"] == "connected"

def test_seed_user_login(client):
    response = client.post("/api/users/login", json={
        "email": "customer@foodiehub.com",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "customer@foodiehub.com"
    assert data["user"]["role"] == "customer"

def test_login_invalid_credentials(client):
    response = client.post("/api/users/login", json={
        "email": "customer@foodiehub.com",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_register_new_user(client):
    payload = {
        "email": "newuser@example.com",
        "password": "SecurePass123!",
        "full_name": "Bob Newbie",
        "phone": "+1-555-9999",
        "address": "456 Test Blvd",
        "role": "customer"
    }
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["full_name"] == "Bob Newbie"

def test_register_duplicate_email(client):
    payload = {
        "email": "customer@foodiehub.com",
        "password": "AnotherPassword123!",
        "full_name": "Duplicate Person",
    }
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

def test_get_current_user_me(client):
    # Log in first
    login_res = client.post("/api/users/login", json={
        "email": "customer@foodiehub.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]

    # Call /api/users/me
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/users/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == "customer@foodiehub.com"

def test_update_profile(client):
    login_res = client.post("/api/users/login", json={
        "email": "customer@foodiehub.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_res = client.put("/api/users/me", headers=headers, json={
        "full_name": "Alice Updated",
        "phone": "+1-555-8888",
        "address": "999 New Address St"
    })
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["full_name"] == "Alice Updated"
    assert data["phone"] == "+1-555-8888"

def test_cross_user_access_forbidden(client):
    # Log in as customer (id=1)
    login_res = client.post("/api/users/login", json={
        "email": "customer@foodiehub.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to view admin user (id=2)
    res = client.get("/api/users/2", headers=headers)
    assert res.status_code == 403

def test_unauthorized_without_token(client):
    res = client.get("/api/users/me")
    assert res.status_code in [401, 403]
