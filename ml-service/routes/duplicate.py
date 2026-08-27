"""
Duplicate Detection Route
POST /api/ml/detect-duplicate
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.duplicate_engine import DuplicateEngine

router = APIRouter()

class DuplicateRequest(BaseModel):
    title: str = Field(..., min_length=3, description="Proposed project title / description")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    constituency_id: Optional[str] = Field(None, description="Optional constituency UUID filter")
    max_cosine_distance: Optional[float] = Field(0.15, description="Maximum cosine distance for semantic match")
    max_distance_meters: Optional[float] = Field(200.0, description="Maximum geospatial proximity in meters")

class MatchedProject(BaseModel):
    project_id: str
    project_code: str
    title: str
    work_category: str
    state: str
    district: str
    sanction_amount: float
    status: str
    latitude: float
    longitude: float
    distance_meters: float
    cosine_distance: float
    cosine_similarity: float
    collision_type: str
    risk_score: float

class DuplicateResponse(BaseModel):
    is_duplicate: bool
    duplicate_risk_score: float
    total_matches: int
    explanation: str
    matches: List[MatchedProject]

@router.post("/detect-duplicate", response_model=DuplicateResponse)
async def detect_duplicate(payload: DuplicateRequest):
    try:
        res = DuplicateEngine.check_duplicate(
            title=payload.title,
            lat=payload.lat,
            lng=payload.lng,
            constituency_id=payload.constituency_id,
            max_cosine_distance=payload.max_cosine_distance or 0.15,
            max_distance_meters=payload.max_distance_meters or 200.0
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate detection failed: {str(e)}")
