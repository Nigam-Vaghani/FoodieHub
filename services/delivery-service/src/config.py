import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SERVICE_NAME: str = "delivery-service"
    SERVICE_PORT: int = 8004
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/delivery.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "foodiehub-cloudnative-super-secure-jwt-secret-key-32bytes-min!")
    JWT_ALGORITHM: str = "HS256"
    NOTIFICATION_SERVICE_URL: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")
    HTTP_TIMEOUT_SECONDS: float = 5.0
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
