from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    google_api_key: str = ""
    google_cloud_project: str = ""
    google_application_credentials: str = ""
    gemini_model: str = "gemini-2.5-flash-native-audio-latest"
    firestore_collection_orders: str = "orders"
    firestore_collection_sessions: str = "sessions"

    class Config:
        env_file = ".env"
        extra = "ignore"
    
    def setup_credentials(self):
        """Set GOOGLE_APPLICATION_CREDENTIALS env var if path provided"""
        if self.google_application_credentials:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.google_application_credentials


def get_settings() -> Settings:
    settings = Settings()
    settings.setup_credentials()
    print(f"Using model: {settings.gemini_model}", flush=True)
    return settings
