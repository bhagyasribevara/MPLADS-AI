"""
Milestone Photographic Verification Route
POST /api/ml/verify-milestone
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from services.image_verifier import ImageVerifier

router = APIRouter()

class MatchedMilestone(BaseModel):
    milestone_id: str
    matched_project_id: str
    matched_project_code: str
    matched_project_title: str
    matched_stage_name: str
    matched_image_url: Optional[str]
    hamming_distance: int
    similarity_pct: float
    is_cross_project_fraud: bool

class MilestoneVerificationResponse(BaseModel):
    verdict: str
    is_duplicate_image: bool
    image_phash: str
    min_hamming_distance: int
    total_collisions: int
    explanation: str
    matched_milestones: List[MatchedMilestone]

@router.post("/verify-milestone", response_model=MilestoneVerificationResponse)
async def verify_milestone(
    image_file: UploadFile = File(..., description="Milestone inspection site photograph"),
    project_id: str = Form(..., description="UUID of the current project")
):
    try:
        content = await image_file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty image file uploaded.")

        res = ImageVerifier.verify_milestone_image(
            file_bytes=content,
            project_id=project_id
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Milestone verification failed: {str(e)}")
