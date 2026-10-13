from datetime import datetime
from pydantic import BaseModel


class ExtractedTextOut(BaseModel):
    resume_id: int
    file_type: str
    status: str
    text: str
    message: str | None = None


class SectionDetectionOut(BaseModel):
    resume_id: int
    header_block: str
    sections: dict[str, str]
    other_sections: dict[str, str]
    unrecognized_sections: dict[str, str]


class ParsedResumeOut(BaseModel):
    id: int
    resume_id: int
    status: str
    personal_info: dict | None = None
    summary: str | None = None
    skills: list[str] | None = None
    education: list[dict] | None = None
    experience: list[dict] | None = None
    projects: list[dict] | None = None
    certifications: list[dict] | None = None
    achievements: list[dict] | None = None
    other_sections: dict | None = None
    unrecognized_sections: dict | None = None
    parser_used: str | None = None
    parser_warning: str | None = None
    parse_error: str | None = None
    parsed_at: datetime | None = None
    verified_at: datetime | None = None

    class Config:
        from_attributes = True


class ParsedResumeUpdate(BaseModel):
    personal_info: dict | None = None
    summary: str | None = None
    skills: list[str] | None = None
    education: list[dict] | None = None
    experience: list[dict] | None = None
    projects: list[dict] | None = None
    certifications: list[dict] | None = None
    achievements: list[dict] | None = None