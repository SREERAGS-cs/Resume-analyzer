import os
import shutil
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings as app_settings
from app.models.activity import ActivityLog
from app.models.resume import Resume
from app.models.resume_draft import ResumeDraft
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.user_settings import AccountDeleteRequest, UserSettingsUpdate
from app.utils.security import verify_password


def get_or_create_user_settings(db: Session, user: User) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(
            user_id=user.id,
            target_role=user.target_role,
            job_location=user.location,
            theme="system",
            work_mode="Any",
            opportunity_type="Full-time",
            email_job_alerts=True,
            email_analysis_alerts=True,
            email_security_alerts=True,
            in_app_notifications=True,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_user_settings(
    db: Session, user: User, update_data: UserSettingsUpdate
) -> UserSettings:
    settings = get_or_create_user_settings(db, user)
    fields = update_data.model_dump(exclude_unset=True)

    for field, value in fields.items():
        setattr(settings, field, value)

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def export_user_data(db: Session, user: User) -> dict:
    settings = get_or_create_user_settings(db, user)

    resumes = db.query(Resume).filter(Resume.user_id == user.id).all()
    drafts = db.query(ResumeDraft).filter(ResumeDraft.user_id == user.id).all()
    activities = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
        .all()
    )

    return {
        "export_metadata": {
            "application": "ResumeIQ",
            "version": "1.0.0",
            "user_id": user.id,
            "export_timestamp": str(user.updated_at or user.created_at),
        },
        "account_profile": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "location": user.location,
            "linkedin_url": user.linkedin_url,
            "github_url": user.github_url,
            "portfolio_url": user.portfolio_url,
            "education": user.education,
            "target_role": user.target_role,
            "bio": user.bio,
            "created_at": str(user.created_at) if user.created_at else None,
            "updated_at": str(user.updated_at) if user.updated_at else None,
        },
        "preferences": {
            "theme": settings.theme,
            "target_role": settings.target_role,
            "job_location": settings.job_location,
            "work_mode": settings.work_mode,
            "opportunity_type": settings.opportunity_type,
            "email_job_alerts": settings.email_job_alerts,
            "email_analysis_alerts": settings.email_analysis_alerts,
            "email_security_alerts": settings.email_security_alerts,
            "in_app_notifications": settings.in_app_notifications,
        },
        "resumes": [
            {
                "id": r.id,
                "original_filename": r.original_filename,
                "display_name": r.display_name,
                "file_type": r.file_type,
                "file_size": r.file_size,
                "version": r.version,
                "created_at": str(r.created_at) if r.created_at else None,
            }
            for r in resumes
        ],
        "resume_drafts": [
            {
                "id": d.id,
                "title": d.title,
                "template_id": d.template_id,
                "created_at": str(d.created_at) if d.created_at else None,
                "updated_at": str(d.updated_at) if d.updated_at else None,
            }
            for d in drafts
        ],
        "activity_logs": [
            {
                "id": a.id,
                "action": a.action,
                "detail": a.detail,
                "created_at": str(a.created_at) if a.created_at else None,
            }
            for a in activities
        ],
    }


def delete_user_account(
    db: Session, user: User, delete_data: AccountDeleteRequest
) -> dict:
    if not verify_password(delete_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect. Account deletion cancelled.",
        )

    # Safe removal of uploaded resume files from disk
    user_upload_dir = os.path.join(app_settings.UPLOAD_DIR, str(user.id))
    if os.path.exists(user_upload_dir):
        try:
            shutil.rmtree(user_upload_dir)
        except OSError:
            pass

    # Delete user (foreign key cascades remove dependent records)
    db.delete(user)
    db.commit()

    return {
        "message": "Your account and all associated data have been permanently deleted."
    }
