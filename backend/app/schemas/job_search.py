from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class OpportunityType(str, Enum):
    INTERNSHIP = "Internship"
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    APPRENTICESHIP = "Apprenticeship"


class LocationMode(str, Enum):
    NEAR_ME = "near_me"
    SPECIFIC_CITY = "specific_city"
    MULTIPLE_CITIES = "multiple_cities"
    ANYWHERE_INDIA = "anywhere_india"
    STATE_CITY = "state_city"
    REMOTE_ONLY = "remote_only"
    INTERNATIONAL = "international"


class ExperienceLevel(str, Enum):
    STUDENT_FRESHER = "Student / Fresher"
    ZERO_TO_ONE = "0–1 years"
    ONE_TO_TWO = "1–2 years"
    TWO_TO_THREE = "2–3 years"
    ANY = "Any"


class JobSearchRequest(BaseModel):
    resume_id: int = Field(gt=0)
    role: str = Field(min_length=2, max_length=120)
    company: str | None = Field(default=None, max_length=120)
    opportunity_type: OpportunityType
    location_mode: LocationMode
    locations: list[str] = Field(default_factory=list, max_length=10)
    state: str | None = Field(default=None, max_length=100)
    country: str = Field(default="in", max_length=10)
    work_modes: list[Literal["On-site", "Hybrid", "Remote"]] = Field(default_factory=list)
    experience_level: ExperienceLevel = ExperienceLevel.STUDENT_FRESHER
    page: int = Field(default=1, ge=1, le=10)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        role = value.strip()
        if not role:
            raise ValueError("role must not be blank")
        return role

    @field_validator("company")
    @classmethod
    def normalize_company(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned if cleaned else None

    @field_validator("state")
    @classmethod
    def normalize_state(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned if cleaned else None

    @field_validator("country")
    @classmethod
    def normalize_country(cls, value: str) -> str:
        cleaned = value.strip().lower()
        return cleaned if cleaned else "in"

    @field_validator("locations")
    @classmethod
    def normalize_locations(cls, value: list[str]) -> list[str]:
        locations = list(dict.fromkeys(location.strip() for location in value if location.strip()))
        if any(len(location) > 100 for location in locations):
            raise ValueError("each location must be at most 100 characters")
        return locations

    @field_validator("work_modes")
    @classmethod
    def normalize_work_modes(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))

    @model_validator(mode="after")
    def validate_location_selection(self):
        if self.location_mode in {LocationMode.NEAR_ME, LocationMode.SPECIFIC_CITY} and len(self.locations) != 1:
            raise ValueError("provide exactly one city for this location mode")
        if self.location_mode == LocationMode.MULTIPLE_CITIES and not self.locations:
            raise ValueError("provide at least one city for multiple cities")
        if self.location_mode == LocationMode.STATE_CITY and not self.state and not self.locations:
            raise ValueError("provide a state or city for state search")
        if self.location_mode == LocationMode.REMOTE_ONLY and self.work_modes and self.work_modes != ["Remote"]:
            raise ValueError("remote only searches require Remote as the only work mode")
        return self


class JobOpportunity(BaseModel):
    id: str
    source: str
    title: str
    company: str | None = None
    location: str | None = None
    work_mode: str | None = None
    employment_type: str | None = None
    description: str
    skills: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    relevance_label: Literal["Strong Match", "Partial Match", "Significant Gaps"]
    experience_compatibility: Literal["Compatible", "Potential mismatch", "Unclear"]
    location_compatibility: Literal["Compatible", "Unclear"]
    work_mode_compatibility: Literal["Compatible", "Unclear"]
    fit_reason: str | None = None
    posted_at: str | None = None
    application_url: str | None = None
    source_url: str | None = None


class JobSearchResponse(BaseModel):
    resume_id: int
    personalized: bool = True
    jobs: list[JobOpportunity]
    total: int
    page: int = 1
    provider: str = "Adzuna"
