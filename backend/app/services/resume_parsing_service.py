import os
from fastapi import HTTPException, status

from app.models.resume import Resume
from app.parsers.pdf_parser import extract_text_from_pdf, extract_pdf_hyperlinks
from app.parsers.docx_parser import extract_text_from_docx
from app.parsers.text_cleaner import clean_text

MIN_MEANINGFUL_TEXT_LENGTH = 30


def extract_resume_text(resume: Resume) -> dict:
    if not os.path.exists(resume.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The stored resume file could not be found on the server.")

    hyperlinks = []
    try:
        if resume.file_type == "pdf":
            raw_text = extract_text_from_pdf(resume.file_path)
            hyperlinks = extract_pdf_hyperlinks(resume.file_path)
        elif resume.file_type == "docx":
            raw_text = extract_text_from_docx(resume.file_path)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type for text extraction.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while extracting text from this resume.")

    cleaned_text = clean_text(raw_text)

    if len(cleaned_text) < MIN_MEANINGFUL_TEXT_LENGTH:
        return {
            "status": "insufficient_text",
            "text": cleaned_text,
            "hyperlinks": hyperlinks,
            "message": "Very little text could be extracted from this document. It may be an image-based (scanned) resume, which isn't supported yet.",
        }

    return {"status": "text_extracted", "text": cleaned_text, "hyperlinks": hyperlinks, "message": None}