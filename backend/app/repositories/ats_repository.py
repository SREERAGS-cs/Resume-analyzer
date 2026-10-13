from sqlalchemy.orm import Session

from app.models.ats_analysis import ATSAnalysis


def create_ats_analysis(
    db: Session,
    resume_id: int,
    analysis_data: dict,
    target_role: str | None = None,
    role_match_score: int | None = None,
    intelligence_report: dict | None = None,
) -> ATSAnalysis:
    """Always inserts a new row — re-analysis must never overwrite history."""
    try:
        # Filter analysis_data to only valid ATSAnalysis table columns
        valid_cols = {c.name for c in ATSAnalysis.__table__.columns}
        filtered_data = {k: v for k, v in analysis_data.items() if k in valid_cols}

        # If intelligence_report is not explicitly provided, build a backward-compatible report dict
        if intelligence_report is None:
            intelligence_report = {
                "target_role": target_role,
                "role_match_score": role_match_score or filtered_data.get("ats_score"),
                "component_scores": {
                    "role_skills_score": filtered_data.get("role_skills_score", filtered_data.get("section_score")),
                    "project_experience_score": filtered_data.get("project_experience_score"),
                    "qualifications_keywords_score": filtered_data.get("qualifications_keywords_score", filtered_data.get("keyword_score")),
                    "content_quality_score": filtered_data.get("content_quality_score", filtered_data.get("content_score")),
                    "formatting_score": filtered_data.get("formatting_score"),
                    "ats_parsing_score": filtered_data.get("ats_parsing_score"),
                },
                "matched_requirements": analysis_data.get("matched_requirements", []),
                "missing_requirements": analysis_data.get("missing_requirements", []),
                "partially_matched_requirements": analysis_data.get("partially_matched_requirements", []),
                "formatting_findings": analysis_data.get("formatting_findings", []),
                "content_findings": analysis_data.get("content_findings", []),
                "recommendations": analysis_data.get("recommendations", []),
            }

        record = ATSAnalysis(
            resume_id=resume_id,
            target_role=target_role,
            role_match_score=role_match_score if role_match_score is not None else filtered_data.get("ats_score"),
            intelligence_report=intelligence_report,
            **filtered_data,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        raise


def get_latest_ats_analysis(
    db: Session,
    resume_id: int,
    target_role: str | None = None,
) -> ATSAnalysis | None:
    query = db.query(ATSAnalysis).filter(ATSAnalysis.resume_id == resume_id)
    if target_role:
        query = query.filter(ATSAnalysis.target_role == target_role)
    return query.order_by(ATSAnalysis.created_at.desc()).first()


def get_ats_analysis_history(
    db: Session,
    resume_id: int,
    target_role: str | None = None,
) -> list[ATSAnalysis]:
    query = db.query(ATSAnalysis).filter(ATSAnalysis.resume_id == resume_id)
    if target_role:
        query = query.filter(ATSAnalysis.target_role == target_role)
    return query.order_by(ATSAnalysis.created_at.desc()).all()


def get_ats_analysis_by_id(db: Session, analysis_id: int) -> ATSAnalysis | None:
    return (
        db.query(ATSAnalysis)
        .filter(ATSAnalysis.id == analysis_id)
        .first()
    )
