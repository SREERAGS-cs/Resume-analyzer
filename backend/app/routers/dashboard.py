from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.activity import ActivityLog
from app.services.resume_service import get_user_resumes
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ACTIVITY_LABELS = {
    "resume_uploaded": "Resume uploaded",
    "resume_renamed": "Resume renamed",
    "resume_deleted": "Resume deleted",
}


@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resumes = get_user_resumes(db, current_user.id)
    total_resumes = len(resumes)
    latest_resume = resumes[0] if resumes else None

    recent_logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_resumes": total_resumes,
        "latest_ats_score": None,      # no ATS analysis yet — Phase 2+
        "job_matches": 0,               # no job matching yet — Phase 2+
        "analyses_completed": 0,        # no analysis yet — Phase 2+
        "latest_resume": {
            "id": latest_resume.id,
            "display_name": latest_resume.display_name,
            "file_type": latest_resume.file_type,
            "updated_at": latest_resume.updated_at,
        } if latest_resume else None,
        "recent_activity": [
            {
                "id": log.id,
                "label": ACTIVITY_LABELS.get(log.action, log.action),
                "detail": log.detail,
                "created_at": log.created_at,
            }
            for log in recent_logs
        ],
        "ats_performance": [],  # empty until ATS analysis exists — Phase 2+
    }