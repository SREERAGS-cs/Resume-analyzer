from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class JobMatchingAnalyzeRequest(BaseModel):
    resume_id: int
    job_title: str | None = Field(default=None, max_length=255)
    job_description: str = Field(min_length=1, max_length=20000)

    @field_validator("job_title")
    @classmethod
    def validate_job_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("job_title must not be blank")
        return value

    @field_validator("job_description")
    @classmethod
    def validate_job_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("job_description must not be blank")
        return value


class JobMatchingAnalysisBase(BaseModel):
    resume_id: int
    job_title: str | None = None
    job_description: str
    overall_score: int = Field(ge=0, le=100)
    score_level: str = Field(pattern=r"^(LOW|MEDIUM|HIGH)$")
    matched_skills: list[str] = []
    partial_matches: list[str] = []
    missing_requirements: list[str] = []
    responsibility_match: list[str] = []
    strengths: list[str] = []
    improvements: list[str] = []
    deemphasize: list[str] = []
    priority_actions: list[str] = []
    overall_assessment: str
    analysis_report: dict | None = None

    class Config:
        from_attributes = True


class JobMatchingAnalysisResponse(JobMatchingAnalysisBase):
    id: int
    created_at: datetime
    updated_at: datetime


class JobMatchingAnalysisHistoryItem(JobMatchingAnalysisBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
