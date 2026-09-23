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

    try:
        detected = detect_sections(extraction["text"])

        record.raw_text = extraction["text"]
        record.header_block = detected["header_block"]
        record.summary = detected["sections"].get("summary")
        record.skills_raw = detected["sections"].get("skills")
        record.education_raw = detected["sections"].get("education")
        record.experience_raw = detected["sections"].get("experience")
        record.projects_raw = detected["sections"].get("projects")
        record.certifications_raw = detected["sections"].get("certifications")
        record.achievements_raw = detected["sections"].get("achievements")
        record.other_sections = detected["other_sections"]
        record.unrecognized_sections = detected["unrecognized_sections"]

        record.personal_info = extract_personal_info(detected["header_block"], extraction.get("hyperlinks"))
        record.skills = extract_skills(record.skills_raw)
        record.education = extract_education(record.education_raw)
        record.experience = extract_experience(record.experience_raw)
        record.projects = extract_projects(record.projects_raw)
        record.certifications = extract_certifications(record.certifications_raw)
        record.achievements = extract_achievements(record.achievements_raw)

    except Exception:
        record.status = "failed"
        record.parse_error = "An unexpected error occurred while parsing this resume's structured data."
        db.commit()
        db.refresh(record)
        return record

    record.parse_error = None
    record.status = "needs_review"
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