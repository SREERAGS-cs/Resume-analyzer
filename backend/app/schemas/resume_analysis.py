from datetime import datetime
from pydantic import BaseModel, Field


class RecommendationItem(BaseModel):
    title: str
    description: str


class ResumeAnalysisBase(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    content_score: int | None = Field(default=None, ge=0, le=100)
    structure_score: int | None = Field(default=None, ge=0, le=100)
    skills_score: int | None = Field(default=None, ge=0, le=100)
    summary_score: int | None = Field(default=None, ge=0, le=100)
    education_score: int | None = Field(default=None, ge=0, le=100)
    experience_score: int | None = Field(default=None, ge=0, le=100)
    projects_score: int | None = Field(default=None, ge=0, le=100)
    certifications_score: int | None = Field(default=None, ge=0, le=100)
    strengths: list[str] = []
    improvements: list[str] = []
    recommendations: list[RecommendationItem] = []


class ResumeAnalysisCreate(ResumeAnalysisBase):
    resume_id: int


class ResumeAnalysisResponse(ResumeAnalysisBase):
    id: int
    resume_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True