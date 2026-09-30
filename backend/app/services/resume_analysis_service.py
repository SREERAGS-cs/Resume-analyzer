from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.resume import Resume
from app.models.user import User
from app.services import resume_service
from app.repositories import analysis_repository
from app.ai.rule_based_analyzer import analyze_resume as run_rule_based_analysis


def _build_analyzer_input(resume: Resume) -> dict:
    parsed = resume.parsed_data
    if not parsed or parsed.status not in ("needs_review", "verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This resume hasn't been parsed yet. Please analyze its content on the resume review page first.",
        )
    return {
        "personal_info": parsed.personal_info,
        "summary": parsed.summary,
        "skills": parsed.skills,
        "education": parsed.education,
        "experience": parsed.experience,
        "projects": parsed.projects,
        "certifications": parsed.certifications,
    }


def analyze_resume(db: Session, resume_id: int, current_user: User):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    analyzer_input = _build_analyzer_input(resume)

    try:
        result = run_rule_based_analysis(analyzer_input)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to analyze this resume right now. Please try again.",
        )

    try:
        return analysis_repository.create_analysis(db, resume.id, result)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the analysis result. Please try again.",
        )


def get_latest_analysis(db: Session, resume_id: int, current_user: User):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = analysis_repository.get_latest_analysis(db, resume.id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No analysis found for this resume.")
    return record


def get_analysis_history(db: Session, resume_id: int, current_user: User):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    return analysis_repository.get_analysis_history(db, resume.id)