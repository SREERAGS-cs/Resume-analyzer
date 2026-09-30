from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.resume_analysis import ResumeAnalysisResponse, ResumeAnalysisHistoryItem, AnalyzeRequest
from app.services import resume_analysis_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/resume-analysis", tags=["resume-analysis"])


@router.post("/analyze", response_model=ResumeAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_resume(
    payload: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_analysis_service.analyze_resume(db, payload.resume_id, current_user)


@router.get("/{resume_id}", response_model=ResumeAnalysisResponse)
def get_latest_analysis(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_analysis_service.get_latest_analysis(db, resume_id, current_user)


@router.get("/{resume_id}/history", response_model=list[ResumeAnalysisHistoryItem])
def get_analysis_history(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_analysis_service.get_analysis_history(db, resume_id, current_user)