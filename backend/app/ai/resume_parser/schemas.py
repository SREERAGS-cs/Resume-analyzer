"""
Uniform structured-extraction shape used by BOTH the Gemini path and the
rule-based fallback, so the service layer has one mapping function regardless
of which parser actually ran. Field names match the EXISTING ParsedResume
model (personal_info, not personal_information) for DB compatibility.
"""
from pydantic import BaseModel


class PersonalInfo(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None


class EducationEntry(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    score: str | None = None
    score_type: str | None = None  # e.g. "CGPA", "Percentage"


class ExperienceEntry(BaseModel):
    company: str | None = None
    job_title: str | None = None
    employment_type: str | None = None  # employment / internship / freelance etc.
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    responsibilities: list[str] = []
    achievements: list[str] = []


class ProjectEntry(BaseModel):
    name: str | None = None
    description: str | None = None
    technologies: list[str] = []
    start_date: str | None = None
    end_date: str | None = None
    role: str | None = None
    link: str | None = None


class CertificationEntry(BaseModel):
    name: str | None = None
    issuer: str | None = None
    date: str | None = None
    credential_id: str | None = None
    credential_url: str | None = None


class AchievementEntry(BaseModel):
    title: str | None = None
    description: str | None = None
    date: str | None = None


class OrganizationEntry(BaseModel):
    name: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class ResumeExtractionResult(BaseModel):
    personal_info: PersonalInfo = PersonalInfo()
    summary: str | None = None
    skills: list[str] = []
    education: list[EducationEntry] = []
    experience: list[ExperienceEntry] = []
    projects: list[ProjectEntry] = []
    certifications: list[CertificationEntry] = []
    achievements: list[AchievementEntry] = []
    organizations: list[OrganizationEntry] = []
    responsibilities: list[str] = []
    publications: list[str] = []
    volunteering: list[str] = []
    languages: list[str] = []
    interests: list[str] = []
    other_sections: dict = {}
    unrecognized_sections: dict = {}