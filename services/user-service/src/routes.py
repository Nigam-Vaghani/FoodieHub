from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.database import get_db
from src.models import User
from src.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    UserResponse,
    TokenResponse,
    HealthResponse,
)
from src.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin,
)

logger = logging.getLogger("user-service")
router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
@router.get("/ready", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        db_status = f"unhealthy: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connectivity failed: {str(e)}"
        )
    return HealthResponse(
        status="healthy",
        service="user-service",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

@router.post("/api/users/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    # Check for existing email
    normalized_email = req.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists"
        )
    
    role = req.role if req.role in ["customer", "driver", "admin"] else "customer"
    new_user = User(
        email=normalized_email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        phone=req.phone.strip() if req.phone else None,
        address=req.address.strip() if req.address else None,
        role=role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Registered new user: {new_user.email} (id={new_user.id})")

    token_data = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "name": new_user.full_name,
        "role": new_user.role,
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/api/users/login", response_model=TokenResponse, tags=["Auth"])
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    normalized_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(req.password, user.hashed_password):
        logger.warning(f"Failed login attempt for {normalized_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role,
    }
    access_token = create_access_token(token_data)
    logger.info(f"User logged in: {user.email} (id={user.id})")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/api/users/me", response_model=UserResponse, tags=["Users"])
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.put("/api/users/me", response_model=UserResponse, tags=["Users"])
def update_user_profile(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.full_name is not None:
        current_user.full_name = req.full_name.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip() if req.phone.strip() else None
    if req.address is not None:
        current_user.address = req.address.strip() if req.address.strip() else None

    db.commit()
    db.refresh(current_user)
    logger.info(f"Updated profile for user: {current_user.email} (id={current_user.id})")
    return UserResponse.model_validate(current_user)

@router.get("/api/users/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only allow the user to see their own profile unless admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this user profile"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse.model_validate(user)
