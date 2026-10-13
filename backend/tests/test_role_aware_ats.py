"""
Phase 6 Regression Tests for Role-Aware ATS Scoring System.

Covers:
1. An SDE resume evaluated for an SDE role.
2. The same SDE resume evaluated for Mobile Developer (materially lower score).
3. A resume with genuine mobile-development projects and skills.
4. A resume with strong generic keywords but no relevant role evidence.
5. A role-relevant resume with formatting problems.
6. A well-formatted but role-irrelevant resume.
7. A document whose formatting cannot be reliably inspected.
8. Resume or role changes that must not reuse stale results.
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.database import Base
from app.models.user import User
from app.models.resume import Resume
from app.models.parsed_resume import ParsedResume
from app.models.ats_analysis import ATSAnalysis
from app.ai.ats_analyzer import RuleBasedATSAnalyzer, analyze_ats
from app.repositories import ats_repository
from app.services import ats_service


# ---------------------------------------------------------------------------
# Test Fixtures & Sample Resumes
# ---------------------------------------------------------------------------

@pytest.fixture
def analyzer():
    return RuleBasedATSAnalyzer()


@pytest.fixture
def sde_resume_data():
    """Realistic SDE-oriented candidate with Python, Django, MySQL, REST API."""
    return {
        "personal_info": {
            "full_name": "Hariharan Vijayan",
            "email": "hariharan@example.com",
            "phone": "+91 9876543210",
        },
        "summary": "Software Development Engineer with experience building scalable backend microservices, REST APIs, and database-driven architectures.",
        "education": [
            {
                "degree": "B.Tech Computer Science and Engineering",
                "institution": "Anna University",
                "year": "2024",
            }
        ],
        "skills": ["Python", "C++", "Java", "Django", "FastAPI", "MySQL", "PostgreSQL", "Docker", "Git", "REST API"],
        "projects": [
            {
                "name": "Stock Portfolio Management System",
                "technologies": ["Django", "Python", "MySQL", "REST API"],
                "description": "Engineered real-time portfolio tracking platform handling 10,000+ price ticks. Optimized relational queries reducing latency by 35%.",
            },
            {
                "name": "Student Attendance Portal",
                "technologies": ["FastAPI", "PostgreSQL", "Docker"],
                "description": "Architected role-based attendance system supporting 500+ daily active users with 99.9% uptime.",
            },
        ],
        "experience": [],
        "certifications": [{"name": "AWS Certified Cloud Practitioner", "issuer": "AWS"}],
    }


@pytest.fixture
def mobile_developer_resume_data():
    """Candidate with genuine Mobile Developer skills, tools, and projects."""
    return {
        "personal_info": {
            "full_name": "Arun Kumar",
            "email": "arun.mobile@example.com",
            "phone": "+91 9876543211",
        },
        "summary": "Mobile Application Developer specializing in cross-platform Flutter and native Android/iOS development with offline-first synchronization.",
        "education": [
            {
                "degree": "B.E. Information Technology",
                "institution": "PSG College of Technology",
            }
        ],
        "skills": ["Kotlin", "Swift", "Flutter", "Dart", "Android Studio", "Xcode", "Firebase", "SQLite", "Git", "Fastlane"],
        "projects": [
            {
                "name": "PulseFit Mobile Health Tracker",
                "technologies": ["Flutter", "Dart", "Firebase", "SQLite"],
                "description": "Developed cross-platform mobile fitness app deployed to Google Play Store with 5,000+ active installs. Implemented offline-first synchronization and device sensor monitoring.",
            },
            {
                "name": "Campus RideShare iOS App",
                "technologies": ["Swift", "SwiftUI", "Xcode", "REST API"],
                "description": "Engineered native iOS ridesharing application with device-aware interface and crash-free session rate of 99.8%.",
            },
        ],
        "experience": [
            {
                "job_title": "Mobile Developer Intern",
                "company": "AppCraft Studios",
                "description": "Built responsive mobile interfaces and integrated device location services using Kotlin and Android Studio.",
            }
        ],
        "certifications": [{"name": "Associate Android Developer", "issuer": "Google"}],
    }


@pytest.fixture
def generic_keyword_resume_data():
    """Candidate with 15+ generic tech keywords but zero role-specific data science evidence."""
    return {
        "personal_info": {
            "full_name": "Generic Tech Candidate",
            "email": "generic@example.com",
            "phone": "+91 9876543299",
        },
        "summary": "Technical professional with broad exposure across common software tools and methodologies.",
        "education": [{"degree": "B.Sc Computer Science", "institution": "State University"}],
        "skills": [
            "Git", "GitHub", "SQL", "Linux", "Ubuntu", "Agile", "Jira", "HTML",
            "CSS", "JavaScript", "Bash", "REST API", "JSON", "C", "Python",
        ],
        "projects": [
            {
                "name": "General Utility Script Library",
                "technologies": ["Python", "Bash", "Git"],
                "description": "Maintained collection of automated scripts for file renaming and folder backups.",
            }
        ],
        "experience": [],
    }


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Test Cases 1 & 2: SDE evaluated for SDE vs SDE evaluated for Mobile Developer
# ---------------------------------------------------------------------------

def test_1_sde_resume_for_sde_role(analyzer, sde_resume_data):
    """1. An SDE resume evaluated for a Software Developer role receives a high role-aware score."""
    res = analyzer.analyze(sde_resume_data, target_role="Software Developer")

    assert 0 <= res["ats_score"] <= 100
    assert res["ats_score"] >= 80, f"Expected high score for SDE in SDE role, got {res['ats_score']}"
    assert res["role_skills_score"] >= 75
    assert res["project_experience_score"] >= 75
    assert res["qualifications_keywords_score"] >= 75
    assert len(res["matched_requirements"]) > 0


def test_2_sde_resume_for_mobile_developer_role(analyzer, sde_resume_data):
    """
    2. The same SDE resume evaluated for Mobile Developer scores materially lower.
    Fixes the 98/100 bug when SDE resume is analyzed for Mobile Developer!
    """
    sde_res = analyzer.analyze(sde_resume_data, target_role="Software Developer")
    mobile_res = analyzer.analyze(sde_resume_data, target_role="Mobile Developer")

    # Mobile score must be materially lower than SDE score
    score_diff = sde_res["ats_score"] - mobile_res["ats_score"]
    assert score_diff >= 35, f"Expected score difference >= 35, got SDE={sde_res['ats_score']} vs Mobile={mobile_res['ats_score']} (diff={score_diff})"
    assert mobile_res["ats_score"] <= 48, f"SDE resume should score <= 48 for Mobile Developer, got {mobile_res['ats_score']}"

    # Missing essential role requirements must be heavily penalized
    assert mobile_res["role_skills_score"] <= 20
    assert mobile_res["project_experience_score"] <= 25

    # Mobile-specific missing requirements must be explicitly listed
    missing_str = " ".join(mobile_res["missing_requirements"]).lower()
    assert any(term in missing_str for term in ["android", "flutter", "react native", "swiftui", "mobile"]), (
        f"Missing requirements should mention mobile frameworks, got: {mobile_res['missing_requirements']}"
    )

    # Must contain high-severity finding for missing essential role requirements
    role_issues = [i for i in mobile_res["issues"] if i.get("type") in ("role_relevance", "project_relevance")]
    assert len(role_issues) >= 1
    assert any(i.get("severity") == "high" for i in role_issues)


# ---------------------------------------------------------------------------
# Test Case 3: Genuine Mobile Developer evaluated for Mobile Developer
# ---------------------------------------------------------------------------

def test_3_genuine_mobile_developer_scores_high(analyzer, mobile_developer_resume_data):
    """3. A resume with genuine mobile projects and skills scores highly for Mobile Developer."""
    res = analyzer.analyze(mobile_developer_resume_data, target_role="Mobile Developer")

    assert res["ats_score"] >= 80, f"Genuine mobile developer should score >= 80, got {res['ats_score']}"
    assert res["role_skills_score"] >= 80
    assert res["project_experience_score"] >= 80
    assert res["qualifications_keywords_score"] >= 80

    matched = " ".join(res["matched_requirements"]).lower()
    assert any(kw in matched for kw in ["flutter", "kotlin", "swift", "android"]), (
        f"Expected matched mobile requirements, got {res['matched_requirements']}"
    )


# ---------------------------------------------------------------------------
# Test Case 4: High generic keywords cannot compensate for role irrelevance
# ---------------------------------------------------------------------------

def test_4_generic_keywords_cannot_compensate_for_role_irrelevance(analyzer, generic_keyword_resume_data):
    """
    4. A resume with strong generic keywords (Git, SQL, Linux, Jira, Bash, Python)
    evaluated for Data Scientist must NOT receive a passing score.
    """
    res = analyzer.analyze(generic_keyword_resume_data, target_role="Data Scientist")

    assert res["ats_score"] <= 45, f"Generic resume should not exceed 45 for Data Scientist, got {res['ats_score']}"
    assert res["role_skills_score"] <= 25
    assert res["project_experience_score"] <= 20
    assert res["qualifications_keywords_score"] <= 25

    # Check that generic keywords are not mistaken for data science qualifications
    missing = " ".join(res["missing_requirements"]).lower()
    assert any(term in missing for term in ["model", "statistical", "experiment", "pandas", "scikit-learn"])


# ---------------------------------------------------------------------------
# Test Case 5: Role-relevant resume with formatting problems
# ---------------------------------------------------------------------------

def test_5_role_relevant_resume_with_formatting_problems(analyzer, mobile_developer_resume_data):
    """
    5. A role-relevant resume with severe formatting issues (scanned / OCR required)
    reflects formatting degradation in the primary score and returns structured findings.
    """
    meta_with_ocr = {"status": "ocr_required"}
    res = analyzer.analyze(
        mobile_developer_resume_data,
        target_role="Mobile Developer",
        parser_metadata=meta_with_ocr,
    )

    assert res["formatting_score"] <= 50
    assert res["ats_parsing_score"] <= 50

    # Ensure structured formatting finding exists conforming to Phase 3
    formatting_issues = [i for i in res["issues"] if i.get("section") == "ATS Parsing & Extractability"]
    assert len(formatting_issues) >= 1
    issue = formatting_issues[0]
    assert issue.get("severity") == "high"
    assert issue.get("element") == "OCR & Machine Readability"
    assert "recommendation" in issue
    assert "inspection_method" in issue


# ---------------------------------------------------------------------------
# Test Case 6: Well-formatted but role-irrelevant resume
# ---------------------------------------------------------------------------

def test_6_well_formatted_but_role_irrelevant_resume(analyzer, sde_resume_data):
    """
    6. A well-formatted resume cannot score high if it is completely role-irrelevant.
    Tests that formatting weight (15%) + ATS parsing weight (5%) cannot override 55% role irrelevance.
    """
    # Even with high formatting (85) and parsing (85), irrelevant SDE targeting Mobile Developer stays low
    res = analyzer.analyze(sde_resume_data, target_role="Mobile Developer")
    assert res["formatting_score"] >= 80
    assert res["ats_parsing_score"] >= 80
    assert res["ats_score"] <= 48, f"Score should remain low despite clean formatting, got {res['ats_score']}"


# ---------------------------------------------------------------------------
# Test Case 7: Document whose formatting cannot be reliably inspected
# ---------------------------------------------------------------------------

def test_7_unverified_document_layout_inspection(analyzer, sde_resume_data):
    """
    7. When original file is absent, inspection is marked unverified rather than fabricating issues.
    """
    res = analyzer.analyze(
        sde_resume_data,
        target_role="Software Developer",
        file_path="/non/existent/path/dummy.pdf",
    )

    assert res["ats_score"] >= 75
    # Verify unverified flag / finding
    unverified_issues = [
        i for i in res["issues"]
        if i.get("inspection_method") == "unverified" or "unverified" in str(i).lower()
    ]
    assert len(unverified_issues) >= 1
    finding = unverified_issues[0]
    assert finding.get("severity") in ("low", "medium")
    assert "not accessible" in finding.get("message", "").lower() or "unverified" in str(finding).lower()


# ---------------------------------------------------------------------------
# Test Case 8: Resume or role changes that must not reuse stale results
# ---------------------------------------------------------------------------

def test_8_role_changes_prevent_stale_results(test_db, sde_resume_data):
    """
    8. Verifies database persistence and role filtering:
    - Running for SDE stores SDE score (~85)
    - Running for Mobile Developer stores Mobile score (~38)
    - Querying by target_role returns the matching run, preventing stale results.
    """
    # Create test user and resume
    user = User(email="test@user.com", full_name="Test User", password_hash="pw")
    test_db.add(user)
    test_db.commit()

    resume = Resume(
        user_id=user.id,
        display_name="test.pdf",
        original_filename="test.pdf",
        file_path="uploads/test.pdf",
        file_type="pdf",
        file_size=1024,
    )
    test_db.add(resume)
    test_db.commit()

    analyzer = RuleBasedATSAnalyzer()

    # Run 1: SDE evaluated for Software Developer
    res_sde = analyzer.analyze(sde_resume_data, target_role="Software Developer")
    rec_sde = ats_repository.create_ats_analysis(
        test_db,
        resume.id,
        res_sde,
        target_role="Software Developer",
        role_match_score=res_sde["ats_score"],
    )

    # Run 2: Same resume evaluated for Mobile Developer
    res_mobile = analyzer.analyze(sde_resume_data, target_role="Mobile Developer")
    rec_mobile = ats_repository.create_ats_analysis(
        test_db,
        resume.id,
        res_mobile,
        target_role="Mobile Developer",
        role_match_score=res_mobile["ats_score"],
    )

    # Fetch latest specifically for Software Developer
    latest_sde = ats_repository.get_latest_ats_analysis(test_db, resume.id, target_role="Software Developer")
    assert latest_sde is not None
    assert latest_sde.target_role == "Software Developer"
    assert latest_sde.ats_score == res_sde["ats_score"]
    assert latest_sde.ats_score >= 80

    # Fetch latest specifically for Mobile Developer
    latest_mobile = ats_repository.get_latest_ats_analysis(test_db, resume.id, target_role="Mobile Developer")
    assert latest_mobile is not None
    assert latest_mobile.target_role == "Mobile Developer"
    assert latest_mobile.ats_score == res_mobile["ats_score"]
    assert latest_mobile.ats_score <= 48

    # Ensure SDE and Mobile runs are distinct in history
    history_sde = ats_repository.get_ats_analysis_history(test_db, resume.id, target_role="Software Developer")
    assert len(history_sde) == 1
    assert history_sde[0].target_role == "Software Developer"

    history_mobile = ats_repository.get_ats_analysis_history(test_db, resume.id, target_role="Mobile Developer")
    assert len(history_mobile) == 1
    assert history_mobile[0].target_role == "Mobile Developer"
