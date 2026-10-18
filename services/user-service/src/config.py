import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SERVICE_NAME: str = "user-service"
    SERVICE_PORT: int = 8001
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/user.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "foodiehub-cloudnative-super-secure-jwt-secret-key-32bytes-min!")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
