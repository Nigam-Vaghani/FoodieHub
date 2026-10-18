from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from src.database import Base

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, unique=True, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    restaurant_id = Column(Integer, nullable=False)
    driver_name = Column(String(100), default="Bob Courier", nullable=False)
    driver_phone = Column(String(50), default="+1-555-0102", nullable=False)
    status = Column(String(50), default="ASSIGNED", nullable=False) # ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED
    pickup_address = Column(String(500), nullable=False)
    dropoff_address = Column(String(500), nullable=False)
    estimated_delivery_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
