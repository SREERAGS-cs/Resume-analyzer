from datetime import datetime
from pydantic import BaseModel, field_validator


VALID_THEMES = {"light", "dark", "system"}
VALID_WORK_MODES = {"On-site", "Hybrid", "Remote", "Any"}
VALID_OPPORTUNITY_TYPES = {"Internship", "Full-time", "Part-time", "Contract", "Apprenticeship"}


class UserSettingsOut(BaseModel):
    id: int
    user_id: int
    theme: str = "system"
    target_role: str | None = None
    job_location: str | None = None
    work_mode: str = "Any"
    opportunity_type: str = "Full-time"
    email_job_alerts: bool = True
    email_analysis_alerts: bool = True
    email_security_alerts: bool = True
    in_app_notifications: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    target_role: str | None = None
    job_location: str | None = None
    work_mode: str | None = None
    opportunity_type: str | None = None
    email_job_alerts: bool | None = None
    email_analysis_alerts: bool | None = None
    email_security_alerts: bool | None = None
    in_app_notifications: bool | None = None

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str | None) -> str | None:
        if v is not None:
            v_clean = v.strip().lower()
            if v_clean not in VALID_THEMES:
                raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
            return v_clean
        return v

    @field_validator("work_mode")
    @classmethod
    def validate_work_mode(cls, v: str | None) -> str | None:
        if v is not None:
            v_clean = v.strip()
            matched = next((m for m in VALID_WORK_MODES if m.lower() == v_clean.lower()), None)
            if not matched:
                raise ValueError(f"Work mode must be one of: {', '.join(sorted(VALID_WORK_MODES))}")
            return matched
        return v

    @field_validator("opportunity_type")
    @classmethod
    def validate_opportunity_type(cls, v: str | None) -> str | None:
        if v is not None:
            v_clean = v.strip()
            matched = next((o for o in VALID_OPPORTUNITY_TYPES if o.lower() == v_clean.lower()), None)
            if not matched:
                raise ValueError(f"Opportunity type must be one of: {', '.join(sorted(VALID_OPPORTUNITY_TYPES))}")
            return matched
        return v

    @field_validator("target_role", "job_location")
    @classmethod
    def trim_text(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            return v_stripped if v_stripped else None
        return None


class AccountDeleteRequest(BaseModel):
    password: str
    confirmation: str

    @field_validator("confirmation")
    @classmethod
    def validate_confirmation(cls, v: str) -> str:
        if v.strip().upper() != "DELETE":
            raise ValueError("Confirmation must be exactly 'DELETE'")
        return v.strip()
