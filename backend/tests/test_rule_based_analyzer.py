from app.ai.rule_based_analyzer import analyze_resume

SCORE_FIELDS = [
    "overall_score", "content_score", "structure_score", "skills_score",
    "summary_score", "education_score", "experience_score",
    "projects_score", "certifications_score",
]


def _assert_valid_result(result):
    for field in SCORE_FIELDS:
        assert field in result
        assert 0 <= result[field] <= 100, f"{field} out of bounds: {result[field]}"
    assert isinstance(result["strengths"], list)
    assert isinstance(result["improvements"], list)
    assert isinstance(result["recommendations"], list)
    for rec in result["recommendations"]:
        assert set(rec.keys()) == {"title", "description", "priority"}
        assert rec["priority"] in ("high", "medium", "low")


COMPLETE_STUDENT_RESUME = {
    "personal_info": {
        "full_name": "Jane Doe", "email": "jane@example.com", "phone": "+1 555 000 0000",
        "location": "City, Country", "linkedin": "linkedin.com/in/janedoe", "github": "github.com/janedoe",
    },
    "summary": (
        "Final-year Computer Science student with strong foundations in data structures, algorithms, "
        "and full-stack development. Experienced in building scalable web applications using Python, "
        "FastAPI, and React, with a focus on clean architecture and practical problem solving."
    ),
    "skills": ["Python", "React", "FastAPI", "SQL", "Git", "Docker", "MongoDB", "TypeScript", "AWS"],
    "education": [{"degree": "B.Tech Computer Science", "institution": "ABC Institute of Technology", "start_date": "2022", "end_date": "2026"}],
    "experience": [{
        "company": "Tech Solutions", "job_title": "Software Engineering Intern",
        "description": "Developed and deployed internal tools used by 50 users, improving reporting accuracy by 20%.",
        "responsibilities": ["Built automated testing pipeline", "Reduced deployment time by 30%"],
    }],
    "projects": [{
        "name": "Resume Analyzer", "description": "Built an AI-powered resume analysis platform that improved review accuracy by 25%.",
        "technologies": ["Python", "FastAPI", "React"],
    }],
    "certifications": [{"name": "AWS Certified Developer", "issuer": "Amazon Web Services", "date": "2025"}],
}


def test_complete_student_resume():
    result = analyze_resume(COMPLETE_STUDENT_RESUME)
    _assert_valid_result(result)
    assert result["overall_score"] >= 70


def test_no_summary():
    data = {**COMPLETE_STUDENT_RESUME, "summary": ""}
    result = analyze_resume(data)
    _assert_valid_result(result)
    assert result["summary_score"] <= 40
    assert any("summary" in msg.lower() for msg in result["improvements"])


def test_no_projects():
    data = {**COMPLETE_STUDENT_RESUME, "projects": []}
    result = analyze_resume(data)
    _assert_valid_result(result)
    assert any("project" in msg.lower() for msg in result["improvements"])


def test_no_skills():
    data = {**COMPLETE_STUDENT_RESUME, "skills": []}
    result = analyze_resume(data)
    _assert_valid_result(result)
    assert result["skills_score"] <= 30
    assert any("skill" in msg.lower() for msg in result["improvements"])


def test_no_experience_not_harsh():
    data = {**COMPLETE_STUDENT_RESUME, "experience": []}
    result = analyze_resume(data)
    _assert_valid_result(result)
    assert result["experience_score"] >= 50  # not a harsh penalty for students
    assert any("internship" in msg.lower() or "experience" in msg.lower() for msg in result["improvements"])


def test_minimal_personal_information():
    data = {**COMPLETE_STUDENT_RESUME, "personal_info": {"full_name": "Jane Doe"}}
    result = analyze_resume(data)
    _assert_valid_result(result)
    assert len(result["improvements"]) > 0


def test_measurable_project_outcomes_scored_higher():
    with_metrics = {**COMPLETE_STUDENT_RESUME}
    without_metrics = {
        **COMPLETE_STUDENT_RESUME,
        "projects": [{"name": "Resume Analyzer", "description": "Built a resume analysis platform.", "technologies": ["Python"]}],
    }
    result_with = analyze_resume(with_metrics)
    result_without = analyze_resume(without_metrics)
    _assert_valid_result(result_with)
    _assert_valid_result(result_without)
    assert result_with["projects_score"] >= result_without["projects_score"]
    assert any("measurable" in msg.lower() for msg in result_without["improvements"])


def test_no_measurable_outcomes():
    data = {
        **COMPLETE_STUDENT_RESUME,
        "projects": [{"name": "Simple App", "description": "Made a simple app.", "technologies": ["Python"]}],
    }
    result = analyze_resume(data)
    _assert_valid_result(result)
    assert any("measurable" in msg.lower() for msg in result["improvements"])


def test_empty_and_null_sections_do_not_crash():
    data = {
        "personal_info": None, "summary": None, "skills": None,
        "education": None, "experience": None, "projects": None, "certifications": None,
    }
    result = analyze_resume(data)
    _assert_valid_result(result)


def test_overall_score_reflects_quality_difference():
    rich_result = analyze_resume(COMPLETE_STUDENT_RESUME)
    poor_result = analyze_resume({
        "personal_info": {}, "summary": "", "skills": [], "education": [],
        "experience": [], "projects": [], "certifications": [],
    })
    assert rich_result["overall_score"] > poor_result["overall_score"]