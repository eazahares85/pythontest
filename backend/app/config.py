from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = "mongodb://127.0.0.1:27017"
    mongodb_db: str = "innovasoft_app"

    innovasoft_api_base: str = "https://pruebareactjs.test-class.com/Api"

    environment: str = "development"
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "https://innovasoft-front.onrender.com"
    )
    cors_allow_render_regex: bool = True
    serve_frontend: bool = False

    def innovasoft_url(self, path: str) -> str:
        base = self.innovasoft_api_base.rstrip("/")
        p = path if path.startswith("/") else f"/{path}"
        return f"{base}{p}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
