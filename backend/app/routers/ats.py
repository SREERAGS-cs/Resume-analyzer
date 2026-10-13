from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.ats_analysis import (
    ATSAnalyzeRequest,
    ATSAnalysisResponse,
    ATSAnalysisHistoryItem,
)
from app.schemas.resume_intelligence import ResumeIntelligenceRequest, ResumeIntelligenceResponse
from app.services import ats_service, resume_intelligence_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/ats", tags=["ats-analysis"])


@router.post("/analyze", response_model=ATSAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_ats(
    payload: ATSAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger ATS analysis for a resume.
    Creates and saves a new ATS analysis record in the database.
    """
    return ats_service.analyze_ats(db, payload.resume_id, current_user, payload.target_role)


@router.post("/intelligence", response_model=ResumeIntelligenceResponse, status_code=status.HTTP_201_CREATED)
def analyze_resume_intelligence(
    payload: ResumeIntelligenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a role-specific report while preserving deterministic ATS analysis."""
    return resume_intelligence_service.analyze_resume_intelligence(
        db,
        payload.resume_id,
        payload.target_role,
        current_user,
    )


@router.get("/intelligence/{resume_id}", response_model=ResumeIntelligenceResponse)
def get_latest_resume_intelligence(
    resume_id: int,
    target_role: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_intelligence_service.get_latest_resume_intelligence(
        db,
        resume_id,
        current_user,
        target_role=target_role,
    )


@router.get("/result/{analysis_id}", response_model=ATSAnalysisResponse)
def get_ats_analysis_by_id(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch a specific ATS analysis record by ID.
    Validates user ownership of the underlying resume.
    """
    return ats_service.get_ats_analysis_by_id(db, analysis_id, current_user)


@router.get("/{resume_id}", response_model=ATSAnalysisResponse)
def get_latest_ats_analysis(
    resume_id: int,
    target_role: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch the latest ATS analysis record for a resume.
    Returns 404 if no ATS analysis exists yet.
    """
    return ats_service.get_latest_ats_analysis(db, resume_id, current_user, target_role=target_role)


@router.get("/{resume_id}/history", response_model=list[ATSAnalysisResponse])
def get_ats_analysis_history(
    resume_id: int,
    target_role: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all historical ATS analysis records for a resume (newest to oldest).
    """
    return ats_service.get_ats_analysis_history(db, resume_id, current_user, target_role=target_role)
