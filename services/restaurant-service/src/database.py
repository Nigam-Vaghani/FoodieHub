import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from src.config import settings

# Ensure data directory exists if using local sqlite file
if settings.DATABASE_URL.startswith("sqlite:///./data/"):
    data_dir = Path("./data")
    data_dir.mkdir(parents=True, exist_ok=True)
elif "sqlite" in settings.DATABASE_URL and "/" in settings.DATABASE_URL:
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    parent = Path(db_path).parent
    if parent and str(parent) != ".":
        parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
