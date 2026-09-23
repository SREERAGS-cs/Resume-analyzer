from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.resume_draft import ResumeDraftSave, ResumeDraftOut, ResumeDraftSummary
from app.services import resume_draft_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/resume-drafts", tags=["resume-drafts"])


@router.post("", response_model=ResumeDraftOut, status_code=status.HTTP_201_CREATED)
def create_draft(
    payload: ResumeDraftSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_draft_service.create_draft(db, current_user.id, payload.dict())


@router.get("", response_model=list[ResumeDraftSummary])
def list_drafts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_draft_service.get_user_drafts(db, current_user.id)


@router.get("/{draft_id}", response_model=ResumeDraftOut)
def get_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_draft_service.get_owned_draft_or_404(db, draft_id, current_user.id)


@router.put("/{draft_id}", response_model=ResumeDraftOut)
def update_draft(
    draft_id: int,
    payload: ResumeDraftSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    draft = resume_draft_service.get_owned_draft_or_404(db, draft_id, current_user.id)
    return resume_draft_service.update_draft(db, draft, payload.dict())


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    draft = resume_draft_service.get_owned_draft_or_404(db, draft_id, current_user.id)
    resume_draft_service.delete_draft(db, draft)