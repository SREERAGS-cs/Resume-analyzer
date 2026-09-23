from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.parsed_resume import ExtractedTextOut, SectionDetectionOut, ParsedResumeOut, ParsedResumeUpdate
from app.services import resume_service, parsed_resume_service
from app.services.resume_parsing_service import extract_resume_text
from app.parsers.section_detector import detect_sections
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/resumes", tags=["parsing"])


@router.get("/{resume_id}/text", response_model=ExtractedTextOut)
def get_resume_text(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    result = extract_resume_text(resume)
    return ExtractedTextOut(resume_id=resume.id, file_type=resume.file_type, status=result["status"], text=result["text"], message=result["message"])


@router.get("/{resume_id}/sections", response_model=SectionDetectionOut)
def get_resume_sections(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    extraction = extract_resume_text(resume)
    if extraction["status"] != "text_extracted":
        raise HTTPException(status_code=422, detail=extraction["message"])
    detected = detect_sections(extraction["text"])
    return SectionDetectionOut(resume_id=resume.id, **detected)


@router.post("/{resume_id}/parse", response_model=ParsedResumeOut, status_code=status.HTTP_201_CREATED)
def parse_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    return parsed_resume_service.run_parsing_pipeline(db, resume)


@router.get("/{resume_id}/parsed", response_model=ParsedResumeOut)
def get_parsed_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = parsed_resume_service.get_parsed_resume(db, resume.id)
    if not record:
        raise HTTPException(status_code=404, detail="This resume has not been parsed yet.")
    return record


@router.put("/{resume_id}/parsed", response_model=ParsedResumeOut)
def update_resume_parsed_data(
    resume_id: int,
    payload: ParsedResumeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = parsed_resume_service.get_parsed_resume(db, resume.id)
    if not record:
        raise HTTPException(status_code=404, detail="This resume has not been parsed yet.")
    updates = payload.dict(exclude_unset=True)
    return parsed_resume_service.update_parsed_resume(db, record, updates)


@router.post("/{resume_id}/parsed/verify", response_model=ParsedResumeOut)
def verify_parsed_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = parsed_resume_service.get_parsed_resume(db, resume.id)
    if not record:
        raise HTTPException(status_code=404, detail="This resume has not been parsed yet.")
    return parsed_resume_service.mark_verified(db, record)


@router.get("/{resume_id}/preview")
def preview_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Inline preview (no attachment disposition) — for embedding in the review UI.
    Only PDFs render usefully in-browser; DOCX has no reliable native preview,
    so callers should fall back to the existing /download endpoint for those.
    """
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    if resume.file_type != "pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Inline preview is only available for PDF files.",
        )
    return FileResponse(resume.file_path, media_type="application/pdf")