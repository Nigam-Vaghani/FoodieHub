from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    cuisine_type = Column(String(100), nullable=False, index=True)
    address = Column(String(500), nullable=False)
    phone = Column(String(50), nullable=False)
    rating = Column(Float, default=4.5, nullable=False)
    delivery_time_mins = Column(Integer, default=30, nullable=False)
    delivery_fee = Column(Float, default=2.99, nullable=False)
    image_url = Column(String(1000), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    image_url = Column(String(1000), nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    is_vegetarian = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    restaurant = relationship("Restaurant", back_populates="menu_items")
