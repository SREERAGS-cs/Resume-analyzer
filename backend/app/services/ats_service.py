import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.ats_analysis import ATSAnalysis
from app.models.resume import Resume
from app.models.user import User
from app.repositories import ats_repository
from app.services import resume_service
from app.ai.ats_analyzer import analyze_ats as run_rule_based_ats_analysis

logger = logging.getLogger(__name__)


def _build_analyzer_input(resume: Resume) -> dict:
    parsed = resume.parsed_data
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please review and confirm your parsed resume before running ATS analysis.",
        )
    if parsed.status != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please review and confirm your parsed resume before running ATS analysis.",
        )
    return {
        "raw_text": parsed.raw_text,
        "header_block": parsed.header_block,
        "personal_info": parsed.personal_info,
        "summary": parsed.summary,
        "skills_raw": parsed.skills_raw,
        "skills": parsed.skills,
        "education": parsed.education,
        "experience": parsed.experience,
        "projects": parsed.projects,
        "certifications": parsed.certifications,
        "achievements": parsed.achievements,
    }


def analyze_ats(
    db: Session,
    resume_id: int,
    current_user: User,
    target_role: str | None = None,
) -> ATSAnalysis:
    """
    Runs rule-based ATS analysis on verified resume data and saves a new analysis record.
    Always creates a new database row (re-analysis does not overwrite history).
    """
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    analyzer_input = _build_analyzer_input(resume)

    try:
        result = run_rule_based_ats_analysis(
            analyzer_input,
            target_role=target_role,
            file_path=resume.file_path,
        )
    except Exception as exc:
        logger.exception("Failed to run ATS analysis for resume_id=%s: %s", resume_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to perform ATS analysis right now: {exc}",
        )

    try:
        return ats_repository.create_ats_analysis(
            db,
            resume.id,
            result,
            target_role=target_role,
            role_match_score=result.get("ats_score"),
        )
    except Exception as exc:
        logger.exception("Failed to persist ATS analysis for resume_id=%s: %s", resume_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the ATS analysis result. Please try again.",
        )


def get_latest_ats_analysis(
    db: Session,
    resume_id: int,
    current_user: User,
    target_role: str | None = None,
) -> ATSAnalysis:
    """Fetches the latest ATS analysis record for an owned resume (optionally filtered by target role)."""
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = ats_repository.get_latest_ats_analysis(db, resume.id, target_role=target_role)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ATS analysis found for this resume.",
        )
    return record


def get_ats_analysis_history(
    db: Session,
    resume_id: int,
    current_user: User,
    target_role: str | None = None,
) -> list[ATSAnalysis]:
    """Fetches full ATS analysis history for an owned resume (newest to oldest)."""
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    return ats_repository.get_ats_analysis_history(db, resume.id, target_role=target_role)


def get_ats_analysis_by_id(db: Session, analysis_id: int, current_user: User) -> ATSAnalysis:
    """Fetches a specific ATS analysis record by ID after verifying resume ownership."""
    record = ats_repository.get_ats_analysis_by_id(db, analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ATS analysis record not found.",
        )
    # Ensure user owns the resume associated with this ATS analysis
    resume_service.get_owned_resume_or_404(db, record.resume_id, current_user.id)
    return record
