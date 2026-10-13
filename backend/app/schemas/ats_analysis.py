from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ATSIssueItem(BaseModel):
    type: str
    severity: str
    message: str
    section: str | None = None
    element: str | None = None
    specific_issue: str | None = None
    effect: str | None = None
    recommendation: str | None = None
    inspection_method: str | None = None


class ATSRecommendationItem(BaseModel):
    category: str
    message: str


class ATSAnalysisBase(BaseModel):
    target_role: str | None = None
    role_match_score: int | None = Field(default=None, ge=0, le=100)
    ats_score: int = Field(ge=0, le=100)
    keyword_score: int | None = Field(default=None, ge=0, le=100)
    section_score: int | None = Field(default=None, ge=0, le=100)
    formatting_score: int | None = Field(default=None, ge=0, le=100)
    content_score: int | None = Field(default=None, ge=0, le=100)

    # 6 Component scores (0-100)
    role_skills_score: int | None = Field(default=None, ge=0, le=100)
    project_experience_score: int | None = Field(default=None, ge=0, le=100)
    qualifications_keywords_score: int | None = Field(default=None, ge=0, le=100)
    content_quality_score: int | None = Field(default=None, ge=0, le=100)
    ats_parsing_score: int | None = Field(default=None, ge=0, le=100)

    detected_keywords: list[str] = []
    missing_keywords: list[str] = []
    issues: list[ATSIssueItem] = []
    recommendations: list[ATSRecommendationItem] = []


class ATSAnalyzeRequest(BaseModel):
    resume_id: int
    target_role: str | None = Field(default=None, max_length=120)

    @field_validator("target_role")
    @classmethod
    def validate_target_role(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("target_role must not be blank")
        return value


class ATSAnalysisHistoryItem(BaseModel):
    id: int
    resume_id: int
    target_role: str | None = None
    role_match_score: int | None = Field(default=None, ge=0, le=100)
    ats_score: int
    keyword_score: int | None = Field(default=None, ge=0, le=100)
    section_score: int | None = Field(default=None, ge=0, le=100)
    formatting_score: int | None = Field(default=None, ge=0, le=100)
    content_score: int | None = Field(default=None, ge=0, le=100)
    role_skills_score: int | None = Field(default=None, ge=0, le=100)
    project_experience_score: int | None = Field(default=None, ge=0, le=100)
    qualifications_keywords_score: int | None = Field(default=None, ge=0, le=100)
    content_quality_score: int | None = Field(default=None, ge=0, le=100)
    ats_parsing_score: int | None = Field(default=None, ge=0, le=100)
    created_at: datetime

    class Config:
        from_attributes = True


class ATSAnalysisCreate(ATSAnalysisBase):
    resume_id: int


class ATSAnalysisResponse(ATSAnalysisBase):
    id: int
    resume_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

