import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
CLIENT_DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "clients")

os.makedirs(CLIENT_DATA_DIR, exist_ok=True)
