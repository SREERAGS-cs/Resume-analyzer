import os
import uuid
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.resume import Resume
from app.models.activity import ActivityLog

ALLOWED_EXTENSIONS = {"pdf", "docx"}
import zipfile
import io
# ...existing imports stay...

def _validate_file_signature(extension: str, contents: bytes):
    if extension == "pdf":
        if not contents.startswith(b"%PDF-"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is not a valid PDF.")
    elif extension == "docx":
        if not contents.startswith(b"PK\x03\x04"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is not a valid DOCX.")
        try:
            with zipfile.ZipFile(io.BytesIO(contents)) as z:
                if "word/document.xml" not in z.namelist():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is not a valid DOCX.")
        except zipfile.BadZipFile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is not a valid DOCX.")

def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def log_activity(db: Session, user_id: int, action: str, detail: str | None = None):
    entry = ActivityLog(user_id=user_id, action=action, detail=detail)
    db.add(entry)
    db.commit()


async def save_resume_file(user_id: int, file: UploadFile) -> tuple[str, str, int]:
    """Validates and writes the file to disk. Returns (stored_path, extension, size_in_bytes)."""
    extension = _get_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported.",
        )

    contents = await file.read()
    size = len(contents)
    _validate_file_signature(extension, contents)
    if size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB limit.",
        )

    user_dir = os.path.join(settings.UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}.{extension}"
    stored_path = os.path.join(user_dir, stored_filename)

    with open(stored_path, "wb") as f:
        f.write(contents)

    return stored_path, extension, size


def create_resume_record(db: Session, user_id: int, original_filename: str, stored_path: str, extension: str, size: int) -> Resume:
    display_name = original_filename.rsplit(".", 1)[0]
    resume = Resume(
        user_id=user_id,
        original_filename=original_filename,
        display_name=display_name,
        file_path=stored_path,
        file_type=extension,
        file_size=size,
        version=1,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    log_activity(db, user_id, "resume_uploaded", display_name)
    return resume


def get_user_resumes(db: Session, user_id: int) -> list[Resume]:
    return db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.created_at.desc()).all()


def get_owned_resume_or_404(db: Session, resume_id: int, user_id: int) -> Resume:
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if resume.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this resume.")
    return resume


def rename_resume(db: Session, resume: Resume, new_name: str) -> Resume:
    resume.display_name = new_name.strip()
    db.commit()
    db.refresh(resume)
    log_activity(db, resume.user_id, "resume_renamed", resume.display_name)
    return resume


def delete_resume(db: Session, resume: Resume):
    display_name = resume.display_name
    user_id = resume.user_id

    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)

    db.delete(resume)
    db.commit()
    log_activity(db, user_id, "resume_deleted", display_name)