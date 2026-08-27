"""
ML Microservice Configuration Module
Loads environment variables, defines service settings, and manages database connectivity.
"""

import os
import re
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Search and load .env files in priority order
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent

load_dotenv(CURRENT_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    PORT: int = int(os.getenv("PORT", "8001"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    @property
    def sanitized_db_url(self) -> str:
        """
        Cleans up Supabase database URL for psycopg2 compatibility.
        Strips pgbouncer=true query parameter and defaults to port 5432 for direct queries.
        """
        if not self.DATABASE_URL:
            return ""
        clean = re.sub(r'[?&]pgbouncer=true', '', self.DATABASE_URL)
        clean = clean.replace(':6543', ':5432')
        return clean

settings = Settings()

def get_db_connection():
    """
    Returns a live psycopg2 connection to PostgreSQL with fallback to pooler port if required.
    """
    clean_url = settings.sanitized_db_url
    if not clean_url:
        raise ValueError("DATABASE_URL is not set in environment.")
    
    try:
        conn = psycopg2.connect(clean_url)
        return conn
    except Exception as e:
        # Fallback to pooler port without pgbouncer param
        fallback = re.sub(r'[?&]pgbouncer=true', '', settings.DATABASE_URL)
        return psycopg2.connect(fallback)
