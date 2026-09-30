from sqlalchemy.orm import Session

from app.models.analysis import ResumeAnalysis


def create_analysis(db: Session, resume_id: int, analysis_data: dict) -> ResumeAnalysis:
    """Always inserts a new row — re-analysis must never overwrite history."""
    try:
        record = ResumeAnalysis(resume_id=resume_id, **analysis_data)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        raise


def get_latest_analysis(db: Session, resume_id: int) -> ResumeAnalysis | None:
    return (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.resume_id == resume_id)
        .order_by(ResumeAnalysis.created_at.desc())
        .first()
    )


def get_analysis_history(db: Session, resume_id: int) -> list[ResumeAnalysis]:
    return (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.resume_id == resume_id)
        .order_by(ResumeAnalysis.created_at.desc())
        .all()
    )