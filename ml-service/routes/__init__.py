"""
API Router Aggregator
Combines duplicate, anomaly, timeline, milestone, and audit routes under /api/ml.
"""

from fastapi import APIRouter
from routes.duplicate import router as duplicate_router
from routes.anomaly import router as anomaly_router
from routes.timeline import router as timeline_router
from routes.milestone import router as milestone_router
from routes.audit import router as audit_router

api_router = APIRouter(prefix="/api/ml")

api_router.include_router(duplicate_router, tags=["Duplicate Detection"])
api_router.include_router(anomaly_router, tags=["Cost & Progress Anomaly"])
api_router.include_router(timeline_router, tags=["Timeline Prediction"])
api_router.include_router(milestone_router, tags=["Milestone Verification"])
api_router.include_router(audit_router, tags=["Executive Audit Explanation"])
