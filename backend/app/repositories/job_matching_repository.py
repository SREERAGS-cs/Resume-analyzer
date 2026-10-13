from sqlalchemy.orm import Session

from app.models.job_matching import JobMatchingAnalysis


def create_job_matching_analysis(db: Session, resume_id: int, analysis_data: dict) -> JobMatchingAnalysis:
    try:
        record = JobMatchingAnalysis(resume_id=resume_id, **analysis_data)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        raise


def get_latest_job_matching_analysis(db: Session, resume_id: int) -> JobMatchingAnalysis | None:
    return (
        db.query(JobMatchingAnalysis)
        .filter(JobMatchingAnalysis.resume_id == resume_id)
        .order_by(JobMatchingAnalysis.created_at.desc(), JobMatchingAnalysis.id.desc())
        .first()
    )


def get_job_matching_analysis_history(db: Session, resume_id: int) -> list[JobMatchingAnalysis]:
    return (
        db.query(JobMatchingAnalysis)
        .filter(JobMatchingAnalysis.resume_id == resume_id)
        .order_by(JobMatchingAnalysis.created_at.desc(), JobMatchingAnalysis.id.desc())
        .all()
    )


def get_job_matching_analysis_by_id(db: Session, analysis_id: int) -> JobMatchingAnalysis | None:
    return db.query(JobMatchingAnalysis).filter(JobMatchingAnalysis.id == analysis_id).first()
