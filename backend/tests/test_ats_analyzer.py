"""
Unit tests for Phase 3.2: Rule-Based ATS Analysis Engine.

Tests:
1. Strong student resume (Education, Skills, Projects, no Experience -> high score, no heavy penalty).
2. Minimal student resume.
3. Experienced resume.
4. Resume with no projects.
5. Resume with no skills.
6. Resume with missing contact info.
7. Resume with OCR warning / scanned metadata.
8. Resume with two-column layout metadata.
9. Empty / null / malformed resume data (must not crash!).
10. Resume with measurable achievements.
11. Resume with no measurable achievements.
"""

import pytest
from app.ai.ats_analyzer import RuleBasedATSAnalyzer, analyze_ats


@pytest.fixture
def analyzer():
    return RuleBasedATSAnalyzer()


def test_strong_student_resume(analyzer):
    """Student resume with Education, Skills, Projects, but no professional Experience."""
    data = {
        "personal_info": {
            "full_name": "Akilan SP",
            "email": "akilan@example.com",
            "phone": "+91 9876543210",
            "github": "https://github.com/akilan",
            "linkedin": "https://linkedin.com/in/akilan",
        },
        "summary": "Passionate Software Engineering student with strong background in Python and React.",
        "education": [
            {
                "degree": "M.Sc. Software Systems",
                "institution": "Coimbatore Institute of Technology",
                "score": "9.50",
            }
        ],
        "skills": ["Python", "FastAPI", "React.js", "MySQL", "Node.js", "Docker", "Git"],
        "projects": [
            {
                "name": "CAR POOLING SYSTEM",
                "technologies": ["React.js", "Node.js", "MySQL"],
                "description": "Engineered a web-based carpooling platform. Optimized shared-ride workflows to reduce costs by 30%.",
            },
            {
                "name": "INTERNSHIP PORTAL",
                "technologies": ["FastAPI", "Python", "Docker"],
                "description": "Built full-stack portal with role-based access control supporting 500+ users.",
            },
        ],
        "experience": [],
        "certifications": [{"name": "Python ML", "issuer": "Udemy"}],
    }

    res = analyzer.analyze(data)

    assert 0 <= res["ats_score"] <= 100
    assert res["section_score"] >= 80  # No heavy penalty for no work experience!
    assert res["keyword_score"] >= 70
    assert "Python" in res["detected_keywords"]
    assert "FastAPI" in res["detected_keywords"]
    assert "React.js" in res["detected_keywords"]
    assert res["missing_keywords"] == []  # Empty at this phase


def test_minimal_student_resume(analyzer):
    """Minimal student resume."""
    data = {
        "personal_info": {"full_name": "John Student", "email": "john@student.edu"},
        "education": [{"degree": "B.Tech Computer Science", "institution": "State University"}],
        "skills": ["Java", "C++"],
    }
    res = analyzer.analyze(data)
    assert 0 <= res["ats_score"] <= 100
    assert res["ats_score"] < 70
    assert len(res["issues"]) > 0


def test_experienced_resume(analyzer):
    """Resume with experience, skills, projects, and education."""
    data = {
        "personal_info": {"full_name": "Jane Developer", "email": "jane@tech.com", "phone": "1234567890"},
        "summary": "Senior Software Engineer with 5+ years of experience in cloud backend systems.",
        "education": [{"degree": "B.S. Computer Science", "institution": "Tech Univ"}],
        "skills": ["Python", "FastAPI", "Docker", "Kubernetes", "AWS", "PostgreSQL"],
        "experience": [
            {
                "job_title": "Senior Backend Developer",
                "company": "Cloud Corp",
                "description": "Architected microservices handling 10k requests/sec. Reduced latency by 40%.",
            }
        ],
        "projects": [
            {
                "name": "Distributed Cache",
                "technologies": ["Python", "Redis"],
                "description": "Built in-memory cache scaling to 50k ops/sec.",
            }
        ],
    }
    res = analyzer.analyze(data)
    assert res["ats_score"] >= 80
    assert res["keyword_score"] >= 80
    assert res["content_score"] >= 80


def test_no_projects(analyzer):
    """Resume with experience but no projects."""
    data = {
        "personal_info": {"full_name": "Alice Work", "email": "alice@work.com", "phone": "555-0199"},
        "education": [{"degree": "B.A. IT", "institution": "Univ"}],
        "skills": ["Python", "SQL"],
        "experience": [
            {"job_title": "Developer", "company": "Co", "description": "Developed internal web apps."}
        ],
        "projects": [],
    }
    res = analyzer.analyze(data)
    assert 0 <= res["ats_score"] <= 100
    # Absence of projects handled cleanly
    assert any("projects" in issue["message"].lower() or "experience" in issue["message"].lower() for issue in res["issues"]) or res["section_score"] >= 70


def test_no_skills(analyzer):
    """Resume with no skills listed."""
    data = {
        "personal_info": {"full_name": "No Skill", "email": "noskill@test.com", "phone": "555-0100"},
        "education": [{"degree": "Diploma", "institution": "Institute"}],
        "skills": [],
        "skills_raw": "",
    }
    res = analyzer.analyze(data)
    assert res["keyword_score"] <= 30
    assert any(i["type"] == "keyword" or "skills" in i["message"].lower() for i in res["issues"])


def test_missing_contact_info(analyzer):
    """Resume missing phone number and email."""
    data = {
        "personal_info": {"full_name": "Anonymous User"},
        "skills": ["Python"],
        "education": [{"degree": "B.Sc", "institution": "Univ"}],
    }
    res = analyzer.analyze(data)
    contact_issues = [i for i in res["issues"] if i["type"] == "contact"]
    assert len(contact_issues) >= 2
    assert any("email" in i["message"].lower() for i in contact_issues)
    assert any("phone" in i["message"].lower() for i in contact_issues)


def test_ocr_required_metadata(analyzer):
    """Scanned PDF requiring OCR."""
    data = {"personal_info": {}}
    meta = {"status": "ocr_required"}
    res = analyzer.analyze(data, parser_metadata=meta)
    assert res["formatting_score"] <= 50
    assert any(i["type"] == "formatting" and "scanned" in i["message"].lower() for i in res["issues"])


def test_two_column_layout_metadata(analyzer):
    """Two-column layout metadata check."""
    data = {
        "personal_info": {"full_name": "Two Col", "email": "tc@example.com", "phone": "123"},
        "skills": ["Python"],
        "education": [{"degree": "BS", "institution": "Univ"}],
        "raw_text": "Two Col tc@example.com 123 B.S. Computer Science State University " + "Experienced software developer with skills in Python and cloud backend platforms. " * 25,
    }
    # Mock blocks across 2 columns
    class MockBlock:
        def __init__(self, x0, x1):
            self.x0 = x0
            self.x1 = x1
    blocks = [MockBlock(50, 200) for _ in range(5)] + [MockBlock(300, 500) for _ in range(5)]
    meta = {"page_width": 595.0, "blocks": blocks}
    
    res = analyzer.analyze(data, parser_metadata=meta)
    assert any("columns" in i["message"].lower() for i in res["issues"])
    # Not a heavy arbitrary penalty: formatting score stays high
    assert res["formatting_score"] >= 80


def test_empty_malformed_resume_data(analyzer):
    """Empty or None resume data must NOT crash!"""
    res1 = analyzer.analyze({})
    assert 0 <= res1["ats_score"] <= 100
    assert isinstance(res1["issues"], list)

    res2 = analyze_ats(None, None)
    assert 0 <= res2["ats_score"] <= 100


def test_measurable_achievements_detection(analyzer):
    """Resume with measurable metrics vs without metrics."""
    data_with_metrics = {
        "personal_info": {"full_name": "Metric Test", "email": "m@test.com", "phone": "123"},
        "skills": ["Python"],
        "projects": [
            {
                "name": "Project A",
                "description": "Automated QA process cutting test execution time by 50% across 200+ test cases.",
            }
        ],
    }
    data_no_metrics = {
        "personal_info": {"full_name": "No Metric", "email": "nm@test.com", "phone": "123"},
        "skills": ["Python"],
        "projects": [
            {
                "name": "Project A",
                "description": "Worked on automated QA process for application.",
            }
        ],
    }

    res_with = analyzer.analyze(data_with_metrics)
    res_no = analyzer.analyze(data_no_metrics)

    assert res_with["content_score"] > res_no["content_score"]
    assert any("measurable" in i["message"].lower() for i in res_no["issues"])
