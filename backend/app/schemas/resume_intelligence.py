from pydantic import BaseModel, Field, field_validator
from app.schemas.ats_analysis import ATSAnalysisResponse


class ResumeIntelligenceRequest(BaseModel):
    resume_id: int
    target_role: str = Field(min_length=1, max_length=120)

    @field_validator("target_role")
    @classmethod
    def validate_target_role(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("target_role must not be blank")
        return value


class ResumeIntelligenceResponse(ATSAnalysisResponse):
    intelligence_report: dict
