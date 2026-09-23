from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.resume_draft import ResumeDraft


def get_user_drafts(db: Session, user_id: int) -> list[ResumeDraft]:
    return db.query(ResumeDraft).filter(ResumeDraft.user_id == user_id).order_by(ResumeDraft.updated_at.desc()).all()


def get_owned_draft_or_404(db: Session, draft_id: int, user_id: int) -> ResumeDraft:
    draft = db.query(ResumeDraft).filter(ResumeDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")
    if draft.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this draft.")
    return draft


def create_draft(db: Session, user_id: int, payload: dict) -> ResumeDraft:
    draft = ResumeDraft(user_id=user_id, **payload)
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


def update_draft(db: Session, draft: ResumeDraft, payload: dict) -> ResumeDraft:
    for field, value in payload.items():
        setattr(draft, field, value)
    db.commit()
    db.refresh(draft)
    return draft


def delete_draft(db: Session, draft: ResumeDraft):
    db.delete(draft)
    db.commit()