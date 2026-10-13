from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.job_matching import JobMatchingAnalyzeRequest, JobMatchingAnalysisResponse
from app.services import job_matching_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/job-matching", tags=["job-matching"])


@router.post("/analyze", response_model=JobMatchingAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_job_matching(
    payload: JobMatchingAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return job_matching_service.analyze_job_matching(
        db,
        payload.resume_id,
        current_user,
        payload.job_title,
        payload.job_description,
    )


@router.get("/{resume_id}", response_model=JobMatchingAnalysisResponse)
def get_latest_job_matching(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return job_matching_service.get_latest_job_matching_analysis(db, resume_id, current_user)


@router.get("/{resume_id}/history", response_model=list[JobMatchingAnalysisResponse])
def get_job_matching_history(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return job_matching_service.get_job_matching_analysis_history(db, resume_id, current_user)


@router.get("/result/{analysis_id}", response_model=JobMatchingAnalysisResponse)
def get_job_matching_by_id(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return job_matching_service.get_job_matching_analysis_by_id(db, analysis_id, current_user)
