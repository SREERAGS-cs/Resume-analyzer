from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.resume import Resume
from app.models.parsed_resume import ParsedResume
from app.services.resume_parsing_service import extract_resume_text
from app.parsers.section_detector import detect_sections
from app.parsers.field_extractors.personal_info import extract_personal_info
from app.parsers.field_extractors.skills import extract_skills
from app.parsers.field_extractors.education import extract_education
from app.parsers.field_extractors.experience import extract_experience
from app.parsers.field_extractors.projects import extract_projects
from app.parsers.field_extractors.certifications import extract_certifications
from app.parsers.field_extractors.achievements import extract_achievements
from app.ai.resume_parser.resume_extractor import extract_resume_data as extract_with_gemini


def get_parsed_resume(db: Session, resume_id: int) -> ParsedResume | None:
    return db.query(ParsedResume).filter(ParsedResume.resume_id == resume_id).first()


def get_or_create_parsed_record(db: Session, resume: Resume) -> ParsedResume:
    existing = get_parsed_resume(db, resume.id)
    if existing:
        return existing
    record = ParsedResume(resume_id=resume.id, user_id=resume.user_id, status="not_started")
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _run_fallback_extraction(record: ParsedResume, raw_text: str, hyperlinks: list[str]) -> dict:
    """Existing deterministic pipeline, reshaped into the same uniform structure Gemini returns."""
    detected = detect_sections(raw_text)

    record.header_block = detected["header_block"]
    record.skills_raw = detected["sections"].get("skills")
    record.education_raw = detected["sections"].get("education")
    record.experience_raw = detected["sections"].get("experience")
    record.projects_raw = detected["sections"].get("projects")
    record.certifications_raw = detected["sections"].get("certifications")
    record.achievements_raw = detected["sections"].get("achievements")

    return {
        "personal_info": extract_personal_info(detected["header_block"], hyperlinks),
        "summary": detected["sections"].get("summary"),
        "skills": extract_skills(detected["sections"].get("skills")),
        "education": extract_education(detected["sections"].get("education")),
        "experience": extract_experience(detected["sections"].get("experience")),
        "projects": extract_projects(detected["sections"].get("projects")),
        "certifications": extract_certifications(detected["sections"].get("certifications")),
        "achievements": extract_achievements(detected["sections"].get("achievements")),
        "organizations": [], "responsibilities": [], "publications": [],
        "volunteering": [], "languages": [], "interests": [],
        "other_sections": detected["other_sections"],
        "unrecognized_sections": detected["unrecognized_sections"],
    }


def run_parsing_pipeline(db: Session, resume: Resume) -> ParsedResume:
    record = get_or_create_parsed_record(db, resume)

    if record.status == "processing":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This resume is already being analyzed. Please wait for it to finish.")

    record.status = "processing"
    db.commit()

    extraction = extract_resume_text(resume)
    if extraction["status"] != "text_extracted":
        record.status = "failed"
        record.parse_error = extraction["message"] or "Unable to extract sufficient text from this resume."
        db.commit()
        db.refresh(record)
        return record

    raw_text = extraction["text"]
    hyperlinks = extraction.get("hyperlinks") or []
    record.raw_text = raw_text

    parser_used = "gemini"
    parser_warning = None
    structured = None

    try:
        structured = extract_with_gemini(raw_text, hyperlinks)
    except Exception as e:
        print(f"[Gemini extraction failed] {type(e).__name__}: {e}")  # temporary debug logging
        parser_used = "fallback"
        parser_warning = (
            "AI-based extraction was unavailable, so a rule-based fallback parser was used instead. "
            "Please review the extracted information carefully."
        )
        try:
            structured = _run_fallback_extraction(record, raw_text, hyperlinks)
        except Exception:
            record.status = "failed"
            record.parse_error = "An unexpected error occurred while parsing this resume's structured data."
            db.commit()
            db.refresh(record)
            return record
    record.personal_info = structured.get("personal_info")
    record.summary = structured.get("summary")
    record.skills = structured.get("skills") or []
    record.education = structured.get("education") or []
    record.experience = structured.get("experience") or []
    record.projects = structured.get("projects") or []
    record.certifications = structured.get("certifications") or []
    record.achievements = structured.get("achievements") or []

    extra_sections = dict(structured.get("other_sections") or {})
    for key in ("organizations", "responsibilities", "publications", "volunteering", "languages", "interests"):
        value = structured.get(key)
        if value:
            extra_sections[key] = value
    record.other_sections = extra_sections
    record.unrecognized_sections = structured.get("unrecognized_sections") or {}

    record.parser_used = parser_used
    record.parser_warning = parser_warning
    record.parse_error = None
    record.status = "needs_review"  # NEVER auto-verified, regardless of which parser ran
    record.parsed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return record


def update_parsed_resume(db: Session, record: ParsedResume, updates: dict) -> ParsedResume:
    for field, value in updates.items():
        setattr(record, field, value)
    if record.status == "verified":
        record.status = "needs_review"
        record.verified_at = None
    db.commit()
    db.refresh(record)
    return record


def mark_verified(db: Session, record: ParsedResume) -> ParsedResume:
    if record.status != "needs_review":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot verify a resume with status '{record.status}'. It must be in 'needs_review' first.")
    record.status = "verified"
    record.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record