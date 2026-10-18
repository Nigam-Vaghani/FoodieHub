from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    restaurant_id = Column(Integer, nullable=False, index=True)
    restaurant_name = Column(String(255), nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    delivery_fee = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    delivery_address = Column(String(500), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    idempotency_key = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    menu_item_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    item_total = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
