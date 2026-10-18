import logging
from sqlalchemy.orm import Session
from src.models import User
from src.auth import hash_password

logger = logging.getLogger("user-service")

def seed_users(db: Session):
    demo_users = [
        {
            "email": "customer@foodiehub.com",
            "password": "Password123!",
            "full_name": "Alice Customer",
            "phone": "+1-555-0101",
            "address": "123 Gourmet Street, Apt 4B, Food City",
            "role": "customer",
        },
        {
            "email": "admin@foodiehub.com",
            "password": "AdminPass123!",
            "full_name": "FoodieHub Administrator",
            "phone": "+1-555-0100",
            "address": "FoodieHub HQ, Innovation Way",
            "role": "admin",
        },
        {
            "email": "driver@foodiehub.com",
            "password": "DriverPass123!",
            "full_name": "Bob Courier",
            "phone": "+1-555-0102",
            "address": "Fleet Station 1, Central Ave",
            "role": "driver",
        },
    ]

    for data in demo_users:
        user = db.query(User).filter(User.email == data["email"]).first()
        if not user:
            new_u = User(
                email=data["email"],
                hashed_password=hash_password(data["password"]),
                full_name=data["full_name"],
                phone=data["phone"],
                address=data["address"],
                role=data["role"],
                is_active=True,
            )
            db.add(new_u)
            logger.info(f"Seeded user: {data['email']} ({data['role']})")
    
    db.commit()
