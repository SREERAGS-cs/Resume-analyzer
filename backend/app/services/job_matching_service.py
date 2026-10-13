from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.resume_parser.llm_client import call_gemini
from app.config.settings import settings
from app.models.job_matching import JobMatchingAnalysis
from app.models.resume import Resume
from app.models.user import User
from app.repositories import job_matching_repository
from app.services import resume_service

GENERIC_REQUIREMENT_WORDS = {
    "ability",
    "abilities",
    "accelerated",
    "accelerators",
    "advanced",
    "advantage",
    "advice",
    "advise",
    "algorithms",
    "analyze",
    "analysis",
    "api",
    "clear",
    "degree",
    "develop",
    "developed",
    "development",
    "engineering",
    "experience",
    "expertise",
    "good",
    "highly",
    "knowledge",
    "like",
    "must",
    "preferred",
    "proven",
    "requirements",
    "role",
    "skills",
    "strong",
    "team",
    "working",
    "work",
    "years",
    "ability to",
}

RESPONSIBILITY_VERBS = (
    "design",
    "develop",
    "build",
    "maintain",
    "monitor",
    "scale",
    "plan",
    "improve",
    "enhance",
    "create",
    "deliver",
    "support",
    "optimize",
    "troubleshoot",
    "write",
    "analyze",
    "examine",
    "lead",
    "own",
    "drive",
    "work with",
    "collaborate",
    "implement",
)

REQUIREMENT_ALIASES = {
    "Python": ["python", "python programming"],
    "FastAPI": ["fastapi", "fast api", "rest api development", "restful api", "rest apis", "backend api development"],
    "PostgreSQL": ["postgresql", "postgres sql", "sql and relational databases", "relational databases", "sql"],
    "Machine Learning": ["machine learning", "ml", "machine-learning", "ml models"],
    "Large Language Models (LLMs)": ["large language models", "llms", "large language model", "llm", "generative ai", "gen ai"],
    "Retrieval-Augmented Generation (RAG)": ["retrieval augmented generation", "rag", "retrieval-augmented generation"],
    "Docker": ["docker", "containerization", "containers", "dockerization"],
    "CI/CD": ["ci/cd", "continuous integration", "continuous deployment", "github actions", "gitlab ci", "deployment automation"],
    "Data Structures and Algorithms": ["data structures and algorithms", "dsa", "algorithms and data structures", "algorithm design"],
    "Cloud Deployment": ["cloud deployment", "aws", "azure", "gcp", "cloud infrastructure"],
    "Backend API Development": ["backend api development", "api development", "backend services", "backend engineering"],
    "SQL": ["sql", "postgresql", "mysql", "database querying"],
    "Vector Databases": ["vector databases", "vector database", "pinecone", "weaviate", "mongodb vector"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "reactjs"],
    "JavaScript": ["javascript", "js"],
}


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""
    text = value.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9+\s/\-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _normalize_terms(value: str | None) -> set[str]:
    text = _normalize_text(value)
    return {token for token in text.split() if token and len(token) > 2 and token not in {"the", "with", "from", "into", "this", "that", "your", "job", "role", "work", "team", "will", "and", "for", "must", "have", "using", "about"}}


def _extract_resume_skills(resume: Resume) -> list[str]:
    parsed = resume.parsed_data
    skills: list[str] = []
    if parsed:
        skills.extend(parsed.skills or [])
        if parsed.skills_raw:
            for chunk in str(parsed.skills_raw).split(","):
                skills.append(chunk.strip())
    return sorted({skill.strip() for skill in skills if skill and skill.strip()})


def _flatten_strings(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, (list, tuple, set)):
        items: list[str] = []
        for item in value:
            items.extend(_flatten_strings(item))
        return items
    if isinstance(value, dict):
        items = []
        for nested in value.values():
            items.extend(_flatten_strings(nested))
        return items
    return [str(value)]


def _resume_evidence_text(resume: Resume) -> str:
    parsed = resume.parsed_data
    if not parsed:
        return ""
    chunks: list[str] = []
    for field in [
        parsed.summary,
        parsed.skills,
        parsed.education,
        parsed.experience,
        parsed.projects,
        parsed.certifications,
        parsed.achievements,
        parsed.other_sections,
    ]:
        chunks.extend(_flatten_strings(field))
    return _normalize_text("\n".join(chunks))


def _canonical_requirement(value: str) -> str:
    normalized = _normalize_text(value)
    if not normalized:
        return ""

    if normalized.startswith("build "):
        normalized = normalized[len("build "):]
    if normalized.startswith("develop "):
        normalized = normalized[len("develop "):]
    if normalized.startswith("design "):
        normalized = normalized[len("design "):]
    if normalized.startswith("create "):
        normalized = normalized[len("create "):]
    if normalized.startswith("work with "):
        normalized = normalized[len("work with "):]
    if normalized.startswith("experience with "):
        normalized = normalized[len("experience with "):]

    if "data pipeline" in normalized and "api" in normalized:
        return "API Development and Data Pipelines"
    if "data pipeline" in normalized:
        return "Data Pipeline Development"
    if "api" in normalized and not any(term in normalized for term in ["machine learning", "large language model", "rag"]):
        return "API Development"
    if "cloud deployment" in normalized:
        return "Cloud Deployment"

    for canonical, aliases in REQUIREMENT_ALIASES.items():
        alias_values = {_normalize_text(alias) for alias in aliases}
        if normalized in alias_values or normalized == _normalize_text(canonical):
            return canonical
        if normalized.startswith(_normalize_text(canonical)) or _normalize_text(canonical).startswith(normalized):
            return canonical
    return normalized.replace(" apis ", " APIs ").replace(" api ", " API ").title()


def _looks_like_responsibility_sentence(value: str) -> bool:
    normalized = _normalize_text(value)
    if not normalized:
        return False
    if len(normalized.split()) <= 5:
        return False
    return any(verb in normalized for verb in RESPONSIBILITY_VERBS)


def _is_generic_requirement(value: str) -> bool:
    normalized = _normalize_text(value)
    if not normalized:
        return True
    tokens = normalized.split()
    if len(tokens) <= 1:
        return True
    if any(token in GENERIC_REQUIREMENT_WORDS for token in tokens):
        return True
    if len(tokens) < 2:
        return True
    return False


def _extract_requirement_candidates(job_description: str) -> list[str]:
    parts = re.split(r"[.;\n]+", job_description)
    candidates: list[str] = []
    seen: set[str] = set()

    for text in parts:
        cleaned = text.strip()
        if not cleaned:
            continue
        cleaned = re.sub(r"^(must have|required|preferred|strong|experience with|working knowledge of|familiarity with|knowledge of|ability to|responsible for|to be able to)\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if not cleaned:
            continue
        if _looks_like_responsibility_sentence(cleaned):
            continue
        if _is_generic_requirement(cleaned):
            continue
        canonical = _canonical_requirement(cleaned)
        if canonical and canonical not in seen:
            seen.add(canonical)
            candidates.append(canonical)

    for canonical, aliases in REQUIREMENT_ALIASES.items():
        normalized_description = _normalize_text(job_description)
        if canonical.lower() in normalized_description or any(_normalize_text(alias) in normalized_description for alias in aliases):
            if canonical not in seen:
                seen.add(canonical)
                candidates.append(canonical)

    return candidates


def _requirement_matches_requirement(requirement: str, resume_text: str, resume_skills: list[str]) -> bool:
    requirement_norm = _normalize_text(requirement)
    aliases = REQUIREMENT_ALIASES.get(requirement, [requirement])
    alias_pool = { _normalize_text(alias) for alias in aliases }
    alias_pool.add(requirement_norm)
    resume_tokens = set(_normalize_text(" ".join(resume_skills)).split())
    for alias in alias_pool:
        if not alias:
            continue
        if alias in resume_text:
            return True
        if alias in _normalize_text(" ".join(resume_skills)):
            return True
        alias_tokens = set(alias.split())
        if alias_tokens and alias_tokens.issubset(resume_tokens):
            return True
    if requirement_norm in resume_text:
        return True
    return False


def _score_level(score: int) -> str:
    if score >= 75:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def _build_jd_requirement_payload(job_title: str | None, job_description: str) -> list[str]:
    deterministic = _extract_requirement_candidates(job_description)
    if not settings.GEMINI_API_KEY:
        return deterministic

    prompt = f"""
You are extracting only meaningful job requirements from a job description.
Return valid JSON as an array of strings. Each item must be a meaningful requirement concept, not a generic word.
Do NOT include generic English words such as: accelerated, advanced, advantage, advise, analyze, experience, ability, team, knowledge, strong, preferred, work, good, role, skills, good, strong, advanced, ability, etc.
Do NOT return single-token words like API, algorithms, analyze, experience, knowledge, etc unless they are part of a longer meaningful requirement phrase.
Normalize synonyms:
- REST APIs / REST API development / RESTful APIs => "FastAPI" only when the JD clearly requires FastAPI; otherwise prefer "REST API Development"
- machine learning / ML / machine-learning => "Machine Learning"
- large language models / LLMs / LLM => "Large Language Models (LLMs)"
- retrieval augmented generation / RAG => "Retrieval-Augmented Generation (RAG)"
- PostgreSQL / MySQL / SQL => keep them distinct when they are distinct technologies.
- Return at least 3 meaningful requirements when available.
- If no meaningful requirements are present, return an empty array.
- IMPORTANT: output should be short meaningful concepts, not full sentences.

Job title: {job_title or 'Not provided'}
Job description:
{job_description}
"""

    try:
        response = call_gemini(prompt)
        data = json.loads(response)
        if isinstance(data, list):
            ai_requirements = []
            for item in data:
                if isinstance(item, str):
                    normalized = _canonical_requirement(item)
                    if normalized and not _is_generic_requirement(normalized):
                        ai_requirements.append(normalized)
            if ai_requirements:
                merged = deterministic + [requirement for requirement in ai_requirements if requirement not in deterministic]
                return merged
    except Exception:
        pass

    return deterministic


def _build_analysis_result(resume: Resume, job_title: str | None, job_description: str) -> dict:
    parsed = resume.parsed_data
    if not parsed or parsed.status != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please review and confirm your parsed resume before running job matching.",
        )

    resume_skills = _extract_resume_skills(resume)
    resume_text = _resume_evidence_text(resume)
    requirements = _build_jd_requirement_payload(job_title, job_description)
    if not requirements:
        return {
            "job_title": job_title,
            "job_description": job_description,
            "overall_score": 0,
            "score_level": "LOW",
            "matched_skills": [],
            "partial_matches": [],
            "missing_requirements": [],
            "responsibility_match": [],
            "strengths": ["The job description does not provide enough meaningful requirements for a reliable match comparison."],
            "improvements": ["Clarify the key technical and responsibility requirements in the job description."],
            "deemphasize": [],
            "priority_actions": ["Add a more specific job description so job matching can compare the actual requirements against the resume."],
            "overall_assessment": "The job description does not provide enough meaningful requirements to evaluate this resume against the role with confidence.",
            "analysis_report": {
                "resume_skill_count": len(resume_skills),
                "job_description_words": len(re.findall(r"\b\w+\b", job_description)),
                "matched_skills_count": 0,
                "missing_requirement_count": 0,
                "score_level": "LOW",
            },
        }

    matched_requirements: list[str] = []
    missing_requirements: list[str] = []

    for requirement in requirements:
        if _requirement_matches_requirement(requirement, resume_text, resume_skills):
            matched_requirements.append(requirement)
        else:
            missing_requirements.append(requirement)

    matched_skills = sorted({skill for skill in resume_skills if any(_normalize_text(skill) in _normalize_text(req) or _normalize_text(req) in _normalize_text(skill) for req in matched_requirements)})
    overall_score = 0 if not requirements else round((len(matched_requirements) / len(requirements)) * 100)
    if len(matched_requirements) == len(requirements) and len(requirements) > 0:
        overall_score = min(95, overall_score)
    if not matched_requirements and requirements:
        overall_score = 0

    score_level = _score_level(overall_score)

    strengths = (
        [f"The resume demonstrates relevant evidence for: {', '.join(matched_requirements[:3])}."] if matched_requirements else ["The resume does not yet show clear evidence for the key requirements in the job description."]
    )
    improvements = [
        "Add concrete examples that map directly to the missing requirements in the job description.",
        "Rewrite resume bullets so they clearly reflect the exact responsibilities and technologies the role needs.",
    ]
    deemphasize = [
        "Reduce emphasis on unrelated or non-job-specific experience that does not map to the requirements.",
    ] if missing_requirements else []
    priority_actions = [
        f"Strengthen evidence for the missing requirements: {', '.join(missing_requirements[:4])}." if missing_requirements else "No major missing requirements remain based on the current evidence.",
        "Align resume bullets to the exact responsibilities and tools described in the target role.",
    ]
    overall_assessment = (
        "This resume shows a credible match for the role, but some meaningful job requirements still need stronger evidence to close the gap."
        if overall_score < 75
        else "This resume aligns well with the core requirements of the role and has strong evidence for the most important qualifications."
    )

    explicit_requirements = [
        part.strip()
        for part in re.split(r"[.;\n]", job_description)
        if len(part.strip()) > 25 and not _looks_like_responsibility_sentence(part.strip())
    ][:6]
    partial_matches = [
        req for req in explicit_requirements
        if req and any(token in _normalize_terms(req) for token in _normalize_terms(job_description))
    ]

    responsibility_sentences = [
        part.strip()
        for part in re.split(r"[.;\n]", job_description)
        if len(part.strip()) > 25 and _looks_like_responsibility_sentence(part.strip())
    ][:5]

    return {
        "job_title": job_title,
        "job_description": job_description,
        "overall_score": overall_score,
        "score_level": score_level,
        "matched_skills": matched_skills,
        "partial_matches": partial_matches,
        "missing_requirements": missing_requirements[:8],
        "responsibility_match": responsibility_sentences,
        "strengths": strengths,
        "improvements": improvements,
        "deemphasize": deemphasize,
        "priority_actions": priority_actions,
        "overall_assessment": overall_assessment,
        "analysis_report": {
            "resume_skill_count": len(resume_skills),
            "job_description_words": len(re.findall(r"\b\w+\b", job_description)),
            "matched_skills_count": len(matched_skills),
            "missing_requirement_count": len(missing_requirements[:8]),
            "score_level": score_level,
        },
    }


def analyze_job_matching(db: Session, resume_id: int, current_user: User, job_title: str | None, job_description: str) -> JobMatchingAnalysis:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    result = _build_analysis_result(resume, job_title, job_description)
    try:
        return job_matching_repository.create_job_matching_analysis(db, resume.id, result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the job matching result. Please try again.",
        ) from exc


def get_latest_job_matching_analysis(db: Session, resume_id: int, current_user: User) -> JobMatchingAnalysis:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = job_matching_repository.get_latest_job_matching_analysis(db, resume.id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No job matching analysis found for this resume.",
        )
    return record


def get_job_matching_analysis_history(db: Session, resume_id: int, current_user: User) -> list[JobMatchingAnalysis]:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    return job_matching_repository.get_job_matching_analysis_history(db, resume.id)


def get_job_matching_analysis_by_id(db: Session, analysis_id: int, current_user: User) -> JobMatchingAnalysis:
    record = job_matching_repository.get_job_matching_analysis_by_id(db, analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job matching analysis not found.",
        )
    resume_service.get_owned_resume_or_404(db, record.resume_id, current_user.id)
    return record


def analyze_job_matching(db: Session, resume_id: int, current_user: User, job_title: str | None, job_description: str) -> JobMatchingAnalysis:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    result = _build_analysis_result(resume, job_title, job_description)
    try:
        return job_matching_repository.create_job_matching_analysis(db, resume.id, result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the job matching result. Please try again.",
        ) from exc


def get_latest_job_matching_analysis(db: Session, resume_id: int, current_user: User) -> JobMatchingAnalysis:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    record = job_matching_repository.get_latest_job_matching_analysis(db, resume.id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No job matching analysis found for this resume.",
        )
    return record


def get_job_matching_analysis_history(db: Session, resume_id: int, current_user: User) -> list[JobMatchingAnalysis]:
    resume = resume_service.get_owned_resume_or_404(db, resume_id, current_user.id)
    return job_matching_repository.get_job_matching_analysis_history(db, resume.id)


def get_job_matching_analysis_by_id(db: Session, analysis_id: int, current_user: User) -> JobMatchingAnalysis:
    record = job_matching_repository.get_job_matching_analysis_by_id(db, analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job matching analysis not found.",
        )
    resume_service.get_owned_resume_or_404(db, record.resume_id, current_user.id)
    return record
