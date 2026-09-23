from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.resume import ResumeOut, ResumeRename
from app.services import resume_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeOut, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stored_path, extension, size = await resume_service.save_resume_file(current_user.id, file)
    resume = resume_service.create_resume_record(
        db, current_user.id, file.filename, stored_path, extension, size
    )
    return resume


@router.get("", response_model=list[ResumeOut])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_service.get_user_resumes(db, current_user.id)


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    filename = f"{resume.display_name}.{resume.file_type}"
    return FileResponse(resume.file_path, filename=filename)


@router.put("/{resume_id}", response_model=ResumeOut)
def rename_resume(
    resume_id: int,
    payload: ResumeRename,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    return resume_service.rename_resume(db, resume, payload.display_name)


@router.delete("/{resume_id}", status_code=204)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    resume_service.delete_resume(db, resume)