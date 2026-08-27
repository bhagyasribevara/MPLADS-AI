"""
Cost & Financial Anomaly Scoring Route
POST /api/ml/score-anomaly
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.cost_anomaly import CostAnomalyEngine

router = APIRouter()

class AnomalyScoreRequest(BaseModel):
    sanction_amount: float = Field(..., gt=0, description="Total sanctioned allocation amount in INR")
    disbursed_amount: float = Field(..., ge=0, description="Cumulative disbursed funds in INR")
    physical_progress: int = Field(..., ge=0, le=100, description="Physical progress percentage (0-100)")
    work_category: str = Field(..., min_length=2, description="Standard MPLADS work classification category")

class AnomalyScoreResponse(BaseModel):
    is_anomalous: bool
    anomaly_type: str
    is_ghost_project: Optional[bool] = False
    is_cost_overrun: Optional[bool] = False
    risk_score: float
    risk_level: str
    confidence_score: float
    disbursed_pct: float
    progress_pct: int
    category_median_inr: float
    cost_multiplier: float
    z_score: float
    isolation_forest_score: float
    explanation: str

@router.post("/score-anomaly", response_model=AnomalyScoreResponse)
async def score_anomaly(payload: AnomalyScoreRequest):
    try:
        res = CostAnomalyEngine.score_anomaly(
            sanction_amount=payload.sanction_amount,
            disbursed_amount=payload.disbursed_amount,
            physical_progress=payload.physical_progress,
            work_category=payload.work_category
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly scoring failed: {str(e)}")
