"""
MPLADS ML Microservice Entrypoint
FastAPI server setup with CORS, health routes, lazy-loading architecture,
and comprehensive fraud analytics routing.
"""

import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Ensure UTF-8 console output
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from config import settings, get_db_connection
from routes import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager.
    Keeps startup instantaneous (lazy loading transformer & tree models on-demand).
    """
    print(f"[*] MPLADS ML Microservice initializing on {settings.HOST}:{settings.PORT}...")
    # Perform a non-blocking DB connectivity check
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.close()
        conn.close()
        print("[+] PostgreSQL Database connection verified.")
    except Exception as e:
        print(f"[!] Warning: Initial database check notice: {e}")
    yield
    print("[*] MPLADS ML Microservice shutting down.")

app = FastAPI(
    title="MPLADS AI/ML Anomaly & Detection Microservice",
    description=(
        "Production AI/ML Microservice for Members of Parliament Local Area Development Scheme (MPLADS). "
        "Provides semantic duplicate detection, geospatial collision queries, isolation forest anomaly scoring, "
        "XGBoost timeline delay predictions, perceptual milestone photo verification, and LLM executive audit summaries."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error_type": type(exc).__name__,
            "detail": str(exc),
            "path": request.url.path
        }
    )

# Health Check Routes
@app.get("/health", tags=["Health"])
@app.get("/api/ml/health", tags=["Health"])
async def health_check():
    db_connected = False
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM projects;")
        proj_count = cur.fetchone()[0]
        cur.close()
        conn.close()
        db_connected = True
    except Exception:
        proj_count = 0

    return {
        "status": "online",
        "service": "MPLADS ML Microservice",
        "version": "1.0.0",
        "database_connected": db_connected,
        "total_projects_in_db": proj_count,
        "features": [
            "pgvector_semantic_search",
            "postgis_proximity_search",
            "isolation_forest_cost_anomaly",
            "xgboost_delay_regressor",
            "phash_image_verification",
            "genai_audit_agent"
        ]
    }

# Mount ML Routes under /api/ml
app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
