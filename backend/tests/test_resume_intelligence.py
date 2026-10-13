from app.ai.resume_intelligence.analyzer import (
    compose_intelligence_report,
    deterministic_role_dimensions,
    validate_ai_evidence,
)
from app.ai.resume_intelligence.role_profiles import get_role_profile
from app.ai.resume_intelligence.schemas import (
    ResumeIntelligenceAIResult,
    SemanticDimension,
    StrengthFinding,
)


def _sample_resume():
    return {
        "summary": "Backend developer building Python services and APIs.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "projects": [
            {
                "name": "Service Platform",
                "description": "Built FastAPI REST APIs with PostgreSQL persistence and Docker deployment.",
                "technologies": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            }
        ],
        "experience": [
            {
                "job_title": "Backend Developer",
                "description": "Implemented Python APIs and maintained PostgreSQL services.",
            }
        ],
    }


def test_role_dimensions_change_with_selected_profile():
    resume = _sample_resume()
    ats = {"keyword_score": 90, "content_score": 75, "section_score": 80}

    backend = deterministic_role_dimensions(resume, get_role_profile("Backend Developer"), ats)
    frontend = deterministic_role_dimensions(resume, get_role_profile("Frontend Developer"), ats)

    assert backend["role_skill_match"] > frontend["role_skill_match"]
    assert backend["project_relevance"] > frontend["project_relevance"]


def test_custom_role_does_not_receive_a_fabricated_profile():
    profile = get_role_profile("Computer Vision Engineer")

    assert profile["is_custom"] is True
    assert profile["name"] == "Computer Vision Engineer"
    assert all(not values for values in profile["categories"].values())


def test_unverifiable_strength_and_deemphasis_evidence_are_removed():
    result = ResumeIntelligenceAIResult(
        overall_assessment="The resume supports backend project work.",
        strengths=[
            StrengthFinding(
                title="FastAPI project",
                explanation="The project demonstrates API development.",
                evidence="Built FastAPI REST APIs with PostgreSQL persistence and Docker deployment.",
                role_relevance="Relevant to backend service development.",
            ),
            StrengthFinding(
                title="Kubernetes experience",
                explanation="The resume shows Kubernetes experience.",
                evidence="Led a Kubernetes migration.",
                role_relevance="Relevant to backend operations.",
            ),
        ],
        deemphasize=[
            {
                "item": "Kubernetes work",
                "reason": "It is less central to the selected role.",
                "suggestion": "Consider de-emphasizing if space is limited.",
                "evidence": "Led a Kubernetes migration.",
            }
        ],
    )

    checked = validate_ai_evidence(result, _sample_resume())

    assert [item.title for item in checked.strengths] == ["FastAPI project"]
    assert checked.deemphasize == []


def test_semantic_findings_reconcile_with_deterministic_score():
    ats = {"ats_score": 92, "content_score": 80, "section_score": 90}
    dimensions = {
        "role_skill_match": 80,
        "keyword_match": 90,
        "project_relevance": 75,
        "experience_relevance": 60,
        "resume_content_quality": 80,
        "resume_structure": 90,
    }
    semantic = ResumeIntelligenceAIResult(
        overall_assessment="Some role capabilities are not demonstrated.",
        dimension_assessments=[
            SemanticDimension(
                dimension=key,
                score=35,
                rationale="Key evidence is limited in the supplied resume.",
            )
            for key in dimensions
        ],
    )

    score, report = compose_intelligence_report(
        "Backend Developer",
        get_role_profile("Backend Developer"),
        ats,
        dimensions,
        semantic,
    )

    assert 0 <= score < sum(dimensions.values()) / len(dimensions)
    assert report["ai_analysis"]["available"] is True
    assert len(report["score_dimensions"]) == 6
