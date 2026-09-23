from datetime import datetime
from pydantic import BaseModel


class ResumeDraftSave(BaseModel):
    """Full builder state — used for both create (POST) and overwrite (PUT)."""
    title: str = "Untitled Resume"
    template_id: str = "professional"
    font_family_id: str | None = None
    font_size_id: str | None = None
    personal_information: dict | None = None
    summary: str | None = None
    skills: list[str] | None = None
    education: list[dict] | None = None
    experience: list[dict] | None = None
    projects: list[dict] | None = None
    certifications: list[dict] | None = None
    achievements: list[dict] | None = None
    additional_sections: list[dict] | None = None


class ResumeDraftOut(ResumeDraftSave):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeDraftSummary(BaseModel):
    """Lightweight shape for the drafts list — avoids sending full section data per row."""
    id: int
    title: str
    template_id: str
    updated_at: datetime

    class Config:
        from_attributes = True