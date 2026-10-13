import json
import re
from typing import Any

from pydantic import ValidationError

from app.ai.resume_parser.llm_client import call_gemini
from .prompts import build_correction_prompt, build_resume_intelligence_prompt
from .role_profiles import get_role_profile
from .schemas import ResumeIntelligenceAIResult


ROLE_MATCH_WEIGHTS = {
    "role_skill_match": 0.25,
    "keyword_match": 0.15,
    "project_relevance": 0.20,
    "experience_relevance": 0.15,
    "resume_content_quality": 0.15,
    "resume_structure": 0.10,
}

DIMENSION_LABELS = {
    "role_skill_match": "Role Skill Match",
    "keyword_match": "Keyword Match",
    "project_relevance": "Project Relevance",
    "experience_relevance": "Experience Relevance",
    "resume_content_quality": "Resume Content Quality",
    "resume_structure": "Resume Structure",
}


def _strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [text for item in value for text in _strings(item)]
    if isinstance(value, dict):
        return [text for item in value.values() for text in _strings(item)]
    return []


def _term_matches(term: str, text: str) -> bool:
    escaped = re.escape(term.strip())
    escaped = re.sub(r"\\\s+", r"\\s+", escaped)
    return bool(re.search(rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])", text, re.IGNORECASE))


def _unique_terms(values: list[str]) -> list[str]:
    unique = {}
    for value in values:
        clean = value.strip()
        if clean:
            unique.setdefault(clean.casefold(), clean)
    return list(unique.values())


def _coverage(terms: list[str], text: str) -> tuple[int, list[str]]:
    terms = _unique_terms(terms)
    if not terms:
        return 0, []
    matched = [term for term in terms if _term_matches(term, text)]
    return round(100 * len(matched) / len(terms)), matched


def _resume_sections(resume_context: dict) -> dict[str, str]:
    return {
        "all": "\n".join(_strings(resume_context)),
        "projects": "\n".join(_strings(resume_context.get("projects", []))),
        "experience": "\n".join(_strings(resume_context.get("experience", []))),
    }


def deterministic_role_dimensions(
    resume_context: dict,
    role_profile: dict,
    ats_result: dict,
) -> dict[str, int | None]:
    categories = role_profile.get("categories") or {}
    sections = _resume_sections(resume_context)
    predefined = not role_profile.get("is_custom")

    if not predefined:
        return {
            "role_skill_match": None,
            "keyword_match": None,
            "project_relevance": None,
            "experience_relevance": None,
            "resume_content_quality": ats_result.get("content_score", 0),
            "resume_structure": ats_result.get("section_score", 0),
        }

    core_skills = categories.get("core_skills", [])
    technology_terms = [
        term
        for category in ("languages", "frameworks", "databases", "tools", "concepts")
        for term in categories.get(category, [])
    ]
    role_terms = _unique_terms(core_skills + technology_terms)
    project_terms = _unique_terms(
        core_skills
        + categories.get("frameworks", [])
        + categories.get("project_characteristics", [])
    )
    experience_terms = _unique_terms(core_skills + categories.get("responsibilities", []))

    role_skill_score, _ = _coverage(core_skills + technology_terms, sections["all"])
    keyword_score, _ = _coverage(technology_terms, sections["all"])
    project_score, _ = _coverage(project_terms, sections["projects"])
    experience_score, _ = _coverage(experience_terms, sections["experience"])

    return {
        "role_skill_match": role_skill_score,
        "keyword_match": keyword_score,
        "project_relevance": project_score,
        "experience_relevance": experience_score,
        "resume_content_quality": int(ats_result.get("content_score") or 0),
        "resume_structure": int(ats_result.get("section_score") or 0),
    }


def _strip_json_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def _parse_ai_result(raw_response: str) -> ResumeIntelligenceAIResult:
    data = json.loads(_strip_json_fence(raw_response))
    return ResumeIntelligenceAIResult.model_validate(data)


def analyze_resume_semantics(resume_context: dict, role_profile: dict) -> ResumeIntelligenceAIResult:
    prompt = build_resume_intelligence_prompt(resume_context, role_profile)
    try:
        return _parse_ai_result(call_gemini(prompt))
    except (ValueError, TypeError, ValidationError) as first_error:
        correction = build_correction_prompt(resume_context, role_profile, str(first_error))
        return _parse_ai_result(call_gemini(correction))


def _normalized_text(value: str) -> str:
    return " ".join(value.casefold().split())


def _evidence_is_present(evidence: str | None, resume_text: str) -> bool:
    if not evidence or not evidence.strip():
        return False
    return _normalized_text(evidence) in _normalized_text(resume_text)


def validate_ai_evidence(
    result: ResumeIntelligenceAIResult,
    resume_context: dict,
) -> ResumeIntelligenceAIResult:
    source = "\n".join(_strings(resume_context))
    result.strengths = [
        finding for finding in result.strengths
        if _evidence_is_present(finding.evidence, source)
    ]
    result.deemphasize = [
        finding for finding in result.deemphasize
        if _evidence_is_present(finding.evidence, source)
    ]
    for finding in result.missing:
        if finding.evidence and not _evidence_is_present(finding.evidence, source):
            finding.evidence = None
    for finding in result.improvements:
        if finding.evidence and not _evidence_is_present(finding.evidence, source):
            finding.evidence = None
    for dimension in result.dimension_assessments:
        if dimension.evidence and not _evidence_is_present(dimension.evidence, source):
            dimension.evidence = None
    return result


def compose_intelligence_report(
    target_role: str,
    role_profile: dict,
    ats_result: dict,
    deterministic_dimensions: dict[str, int | None],
    ai_result: ResumeIntelligenceAIResult | None,
) -> tuple[int, dict]:
    semantic_dimensions = {
        item.dimension: item for item in (ai_result.dimension_assessments if ai_result else [])
    }
    dimension_rows = []
    final_scores = {}

    for key, weight in ROLE_MATCH_WEIGHTS.items():
        deterministic_score = deterministic_dimensions.get(key)
        semantic = semantic_dimensions.get(key)
        semantic_score = semantic.score if semantic else None

        if deterministic_score is not None and semantic_score is not None:
            score = round((deterministic_score + semantic_score) / 2)
        elif semantic_score is not None:
            score = semantic_score
        elif deterministic_score is not None:
            score = deterministic_score
        else:
            score = int(ats_result.get("ats_score") or 0)

        final_scores[key] = max(0, min(100, int(score)))
        dimension_rows.append({
            "key": key,
            "label": DIMENSION_LABELS[key],
            "weight": weight,
            "score": final_scores[key],
            "deterministic_score": deterministic_score,
            "semantic_score": semantic_score,
            "explanation": semantic.rationale if semantic else (
                "Calculated from the selected role profile and extracted resume sections."
                if deterministic_score is not None
                else "No predefined profile exists; the deterministic ATS score is used for this dimension."
            ),
            "evidence": semantic.evidence if semantic else None,
        })

    role_match_score = round(sum(final_scores[key] * weight for key, weight in ROLE_MATCH_WEIGHTS.items()))
    if ai_result:
        ai_analysis = {
            "available": True,
            "message": None,
            **ai_result.model_dump(),
        }
        overall_assessment = ai_result.overall_assessment
    else:
        ai_analysis = {
            "available": False,
            "message": "AI analysis is temporarily unavailable. Basic ATS analysis is still available.",
            "overall_assessment": None,
            "strengths": [],
            "missing": [],
            "improvements": [],
            "deemphasize": [],
            "priority_actions": [],
            "dimension_assessments": [],
        }
        overall_assessment = (
            f"Deterministic role-profile analysis is available for {target_role}; "
            "semantic findings could not be generated."
        )

    report = {
        "target_role": target_role,
        "role_profile_id": role_profile.get("id"),
        "role_profile_is_custom": bool(role_profile.get("is_custom")),
        "overall_assessment": overall_assessment,
        "role_match_score": role_match_score,
        "score_weights": ROLE_MATCH_WEIGHTS,
        "score_dimensions": dimension_rows,
        "deterministic_analysis": ats_result,
        "deterministic_role_dimensions": deterministic_dimensions,
        "ai_analysis": ai_analysis,
    }
    return role_match_score, report
