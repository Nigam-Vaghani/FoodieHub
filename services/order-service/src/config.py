import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SERVICE_NAME: str = "order-service"
    SERVICE_PORT: int = 8003
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/order.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "foodiehub-cloudnative-super-secure-jwt-secret-key-32bytes-min!")
    JWT_ALGORITHM: str = "HS256"

    # Inter-service URLs
    RESTAURANT_SERVICE_URL: str = os.getenv("RESTAURANT_SERVICE_URL", "http://localhost:8002")
    DELIVERY_SERVICE_URL: str = os.getenv("DELIVERY_SERVICE_URL", "http://localhost:8004")
    NOTIFICATION_SERVICE_URL: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8001")

    TAX_RATE: float = 0.05  # 5% sales tax
    HTTP_TIMEOUT_SECONDS: float = 5.0
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
