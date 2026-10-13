from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.job_search import JobSearchRequest, JobSearchResponse
from app.services.job_search import job_search_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["job-search"])


@router.post("/search", response_model=JobSearchResponse)
def search_jobs(
    payload: JobSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return job_search_service.search_jobs(db, current_user, payload)
