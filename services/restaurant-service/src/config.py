import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SERVICE_NAME: str = "restaurant-service"
    SERVICE_PORT: int = 8002
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/restaurant.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "foodiehub-cloudnative-super-secure-jwt-secret-key-32bytes-min!")
    JWT_ALGORITHM: str = "HS256"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
