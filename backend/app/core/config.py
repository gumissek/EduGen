from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "EduGen Local"
    app_env: str = "dev"
    static_password_hash: str = "$2b$12$QlBzWJ4xV5fZECfA6wBf7uKTV.wkSwj5oElwa7z8r5aUnnIN7deUy"
    session_timeout_minutes: int = 15
    database_url: str = "sqlite:///./data/edugen.sqlite"
    data_dir: str = "./data"
    api_prefix: str = "/api"
    default_model: str = "gpt-5-mini"
    openai_base_url: str | None = None
    openai_timeout_seconds: int = 120

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
