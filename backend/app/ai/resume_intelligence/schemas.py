from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Priority = Literal["high", "medium", "low"]
DimensionKey = Literal[
    "role_skill_match",
    "keyword_match",
    "project_relevance",
    "experience_relevance",
    "resume_content_quality",
    "resume_structure",
]


class StrengthFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=1, max_length=160)
    explanation: str = Field(min_length=1, max_length=1200)
    evidence: str = Field(min_length=1, max_length=500)
    role_relevance: str = Field(min_length=1, max_length=600)


class MissingFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    item: str = Field(min_length=1, max_length=180)
    status: Literal["not_demonstrated", "partially_demonstrated", "clearly_demonstrated"]
    reason: str = Field(min_length=1, max_length=800)
    importance: Priority
    evidence: str | None = Field(default=None, max_length=500)


class ImprovementFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    section: str = Field(min_length=1, max_length=100)
    issue: str = Field(min_length=1, max_length=800)
    why_it_matters: str = Field(min_length=1, max_length=800)
    recommendation: str = Field(min_length=1, max_length=1000)
    priority: Priority
    evidence: str | None = Field(default=None, max_length=500)


class DeemphasizeFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    item: str = Field(min_length=1, max_length=180)
    reason: str = Field(min_length=1, max_length=800)
    suggestion: str = Field(min_length=1, max_length=800)
    evidence: str = Field(min_length=1, max_length=500)


class PriorityAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    priority: Priority
    action: str = Field(min_length=1, max_length=800)
    reason: str = Field(min_length=1, max_length=800)


class SemanticDimension(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dimension: DimensionKey
    score: int = Field(ge=0, le=100)
    rationale: str = Field(min_length=1, max_length=800)
    evidence: str | None = Field(default=None, max_length=500)


class ResumeIntelligenceAIResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    overall_assessment: str = Field(min_length=1, max_length=2000)
    strengths: list[StrengthFinding] = Field(default_factory=list, max_length=12)
    missing: list[MissingFinding] = Field(default_factory=list, max_length=12)
    improvements: list[ImprovementFinding] = Field(default_factory=list, max_length=12)
    deemphasize: list[DeemphasizeFinding] = Field(default_factory=list, max_length=8)
    priority_actions: list[PriorityAction] = Field(default_factory=list, max_length=12)
    dimension_assessments: list[SemanticDimension] = Field(default_factory=list, max_length=6)
