from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.ats_analyzer import analyze_ats as run_rule_based_ats_analysis
from app.ai.resume_intelligence.analyzer import (
    analyze_resume_semantics,
    compose_intelligence_report,
    deterministic_role_dimensions,
    validate_ai_evidence,
)
from app.ai.resume_intelligence.role_profiles import get_role_profile
from app.models.ats_analysis import ATSAnalysis
from app.models.resume import Resume
from app.models.user import User
from app.repositories import ats_repository
from app.services import resume_service
from app.services.ats_service import _build_analyzer_input


def _build_resume_context(resume: Resume) -> dict:
    parsed = resume.parsed_data
    return {
        "summary": parsed.summary,
        "skills": parsed.skills or [],
        "education": parsed.education or [],
        "experience": parsed.experience or [],
        "projects": parsed.projects or [],
        "certifications": parsed.certifications or [],
        "achievements": parsed.achievements or [],
        "organizations": (parsed.other_sections or {}).get("organizations", []),
        "responsibilities": (parsed.other_sections or {}).get("responsibilities", []),
    }


def analyze_resume_intelligence(
    db: Session,
    resume_id: int,
    target_role: str,
    current_user: User,
) -> ATSAnalysis:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    parsed = resume.parsed_data
    if not parsed or parsed.status != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please review and confirm your parsed resume before running ATS analysis.",
        )
    analyzer_input = _build_analyzer_input(resume)

    try:
        deterministic_result = run_rule_based_ats_analysis(
            analyzer_input,
            target_role=target_role,
            file_path=resume.file_path,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to perform deterministic ATS analysis right now.",
        ) from error

    role_profile = get_role_profile(target_role)
    resume_context = _build_resume_context(resume)
    dimensions = deterministic_role_dimensions(resume_context, role_profile, deterministic_result)

    try:
        ai_result = analyze_resume_semantics(resume_context, role_profile)
        ai_result = validate_ai_evidence(ai_result, resume_context)
    except Exception:
        ai_result = None

    _, report = compose_intelligence_report(
        target_role,
        role_profile,
        deterministic_result,
        dimensions,
        ai_result,
    )
    # The primary authoritative score is calculated from the deterministic rule-based component scores
    primary_ats_score = deterministic_result["ats_score"]
    report["role_match_score"] = primary_ats_score
    report["ats_score"] = primary_ats_score

    try:
        return ats_repository.create_ats_analysis(
            db,
            resume.id,
            deterministic_result,
            target_role=target_role,
            role_match_score=primary_ats_score,
            intelligence_report=report,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the resume intelligence report.",
        ) from error


def get_latest_resume_intelligence(
    db: Session,
    resume_id: int,
    current_user: User,
    target_role: str | None = None,
) -> ATSAnalysis:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = ats_repository.get_latest_ats_analysis(db, resume.id, target_role=target_role)
    if not record or not record.intelligence_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Resume IQ report found for this resume.",
        )
    return record
