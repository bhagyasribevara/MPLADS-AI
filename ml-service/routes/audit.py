"""
Executive Audit Explanation Route
POST /api/ml/explain-risk
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.audit_agent import AuditAgent

router = APIRouter()

class ExplainRiskRequest(BaseModel):
    project_id: Optional[str] = Field(None, description="Optional project UUID to look up database record")
    anomaly_details: Optional[Dict[str, Any]] = Field(None, description="Context dictionary of detected anomaly metrics")

class ExplainRiskResponse(BaseModel):
    project_id: Optional[str]
    project_code: str
    anomaly_type: str
    engine_used: str
    executive_audit_explanation: str

@router.post("/explain-risk", response_model=ExplainRiskResponse)
async def explain_risk(payload: ExplainRiskRequest):
    try:
        res = AuditAgent.generate_explanation(
            project_id=payload.project_id,
            anomaly_details=payload.anomaly_details
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit risk explanation failed: {str(e)}")
