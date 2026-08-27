"""
Project Timeline & Completion Delay Prediction Route
POST /api/ml/predict-delay
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.timeline_predictor import TimelinePredictor

router = APIRouter()

class DelayPredictionRequest(BaseModel):
    sanction_amount: float = Field(..., gt=0, description="Total project sanction amount in INR")
    agency_name: str = Field(..., min_length=2, description="Executing public works agency")
    work_category: str = Field(..., min_length=2, description="Project work category")
    season: Optional[str] = Field(None, description="Optional seasonal context: MONSOON, WINTER, SUMMER")

class DelayPredictionResponse(BaseModel):
    predicted_delay_days: int
    predicted_delay_months: float
    baseline_duration_months: float
    projected_total_duration_months: float
    delay_risk_level: str
    season_context: str
    driving_risk_factors: List[str]
    recommendation: str

@router.post("/predict-delay", response_model=DelayPredictionResponse)
async def predict_delay(payload: DelayPredictionRequest):
    try:
        res = TimelinePredictor.predict_delay(
            sanction_amount=payload.sanction_amount,
            agency_name=payload.agency_name,
            work_category=payload.work_category,
            season=payload.season
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timeline prediction failed: {str(e)}")
