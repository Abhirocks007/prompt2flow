from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_base_url: str = "https://api.groq.com/openai/v1"

    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant: str = "common"

    app_origin: str = "http://localhost:5173"
    api_origin: str = "http://localhost:8000"


settings = Settings()
DATA_DIR = ROOT / "data"
OUTPUTS_DIR = DATA_DIR / "outputs"
STORE_PATH = DATA_DIR / "store.json"
TOKENS_PATH = DATA_DIR / "tokens.json"
