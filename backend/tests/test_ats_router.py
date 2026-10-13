"""
Integration & Unit tests for Phase 3.3: FastAPI ATS Integration.

Tests:
1. Valid authenticated user + own resume -> POST /api/ats/analyze returns 201.
2. Re-analysis creates a new database row (no overwrite).
3. Invalid resume_id -> 404 Not Found.
4. Resume belonging to another user -> 403 Forbidden.
5. Resume without parsed/verified data -> 400 Bad Request.
6. GET /api/ats/{resume_id} returns latest ATS analysis.
7. GET /api/ats/{resume_id} when no analysis exists -> 404 Not Found.
8. GET /api/ats/{resume_id} for another user's resume -> 403 Forbidden.
9. GET /api/ats/{resume_id}/history returns history ordered newest to oldest.
10. GET /api/ats/result/{analysis_id} returns specific analysis.
11. GET /api/ats/result/{analysis_id} for another user's analysis -> 403 Forbidden.
12. Unauthenticated access -> 401 Unauthorized.
"""

from datetime import datetime, timezone
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.database import Base, get_db
import app.models  # noqa: F401
from app.models.user import User
from app.models.resume import Resume
from app.models.parsed_resume import ParsedResume
from app.models.ats_analysis import ATSAnalysis
from app.routers import ats
from app.utils.security import create_access_token
from app.ai.resume_intelligence.schemas import ResumeIntelligenceAIResult, SemanticDimension
from app.services import resume_intelligence_service


from sqlalchemy.pool import StaticPool

# Setup in-memory SQLite database for testing with shared connection pool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


api_app = FastAPI()
api_app.include_router(ats.router)
api_app.dependency_overrides[get_db] = override_get_db
client = TestClient(api_app)


@pytest.fixture
def test_users_and_resumes():
    db = TestingSessionLocal()

    # User 1 (Owner)
    user1 = User(full_name="User One", email="user1@example.com", password_hash="hashed_pwd1")
    db.add(user1)
    db.commit()
    db.refresh(user1)

    # User 2 (Attacker/Other user)
    user2 = User(full_name="User Two", email="user2@example.com", password_hash="hashed_pwd2")
    db.add(user2)
    db.commit()
    db.refresh(user2)

    # Resume 1 belonging to User 1 (Parsed & Verified)
    resume1 = Resume(
        user_id=user1.id,
        original_filename="user1_resume.pdf",
        display_name="User 1 Resume",
        file_path="/tmp/user1_resume.pdf",
        file_type="pdf",
        file_size=2048,
    )
    db.add(resume1)
    db.commit()
    db.refresh(resume1)

    parsed1 = ParsedResume(
        resume_id=resume1.id,
        user_id=user1.id,
        status="verified",
        raw_text="AKILAN SP\nEmail: akilansp2407@gmail.com\nPhone: +91 8122089700\nSkills: Python, FastAPI, MySQL, React.js\nEducation: M.Sc. Software Systems\nProjects: Built a car pooling web app using Python and React.",
        header_block="AKILAN SP\nakilansp2407@gmail.com | +91 8122089700",
        personal_info={"full_name": "AKILAN SP", "email": "akilansp2407@gmail.com", "phone": "+91 8122089700"},
        summary="Passionate software engineer experienced in web development and Python.",
        skills=["Python", "FastAPI", "MySQL", "React.js"],
        skills_raw="Python, FastAPI, MySQL, React.js",
        education=[{"degree": "M.Sc. Software Systems", "institution": "PSG Tech"}],
        projects=[{"name": "Car Pooling System", "description": "Automated car pooling app built using Python and React.js."}],
    )
    db.add(parsed1)

    # Resume 2 belonging to User 1 (Unparsed/Not Started)
    resume_unparsed = Resume(
        user_id=user1.id,
        original_filename="unparsed.pdf",
        display_name="Unparsed Resume",
        file_path="/tmp/unparsed.pdf",
        file_type="pdf",
        file_size=1024,
    )
    db.add(resume_unparsed)
    db.commit()

    # Tokens
    token1 = create_access_token({"sub": str(user1.id)})
    headers1 = {"Authorization": f"Bearer {token1}"}

    token2 = create_access_token({"sub": str(user2.id)})
    headers2 = {"Authorization": f"Bearer {token2}"}

    r1_id = resume1.id
    r_unparsed_id = resume_unparsed.id
    u1_id = user1.id
    u2_id = user2.id

    db.close()

    return {
        "user1_id": u1_id,
        "user2_id": u2_id,
        "resume1_id": r1_id,
        "resume_unparsed_id": r_unparsed_id,
        "headers1": headers1,
        "headers2": headers2,
    }


def test_ats_analyze_success(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers1"],
    )
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["resume_id"] == data["resume1_id"]
    assert "ats_score" in res_json
    assert res_json["ats_score"] >= 0 and res_json["ats_score"] <= 100
    assert "detected_keywords" in res_json
    assert "Python" in res_json["detected_keywords"]
    assert res_json["target_role"] is None


def test_ats_analyze_persists_target_role(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"], "target_role": "  Backend Developer  "},
        headers=data["headers1"],
    )

    assert response.status_code == 201
    assert response.json()["target_role"] == "Backend Developer"

    history_response = client.get(
        f"/api/ats/{data['resume1_id']}/history",
        headers=data["headers1"],
    )
    assert history_response.status_code == 200
    assert history_response.json()[0]["target_role"] == "Backend Developer"


def test_ats_analyze_rejects_blank_target_role(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"], "target_role": "   "},
        headers=data["headers1"],
    )

    assert response.status_code == 422


def test_resume_intelligence_endpoint_stores_structured_report(test_users_and_resumes, monkeypatch):
    data = test_users_and_resumes
    dimension_keys = (
        "role_skill_match", "keyword_match", "project_relevance",
        "experience_relevance", "resume_content_quality", "resume_structure",
    )

    def fake_semantic_analysis(resume_context, role_profile):
        return ResumeIntelligenceAIResult(
            overall_assessment="The resume shows relevant Python API work.",
            dimension_assessments=[
                SemanticDimension(
                    dimension=key,
                    score=70,
                    rationale="The supplied resume evidence provides a partial match.",
                )
                for key in dimension_keys
            ],
        )

    monkeypatch.setattr(resume_intelligence_service, "analyze_resume_semantics", fake_semantic_analysis)
    response = client.post(
        "/api/ats/intelligence",
        json={"resume_id": data["resume1_id"], "target_role": "Backend Developer"},
        headers=data["headers1"],
    )

    assert response.status_code == 201
    result = response.json()
    assert result["target_role"] == "Backend Developer"
    assert 0 <= result["role_match_score"] <= 100
    assert result["intelligence_report"]["ai_analysis"]["available"] is True
    assert len(result["intelligence_report"]["score_dimensions"]) == 6

    latest = client.get(f"/api/ats/intelligence/{data['resume1_id']}", headers=data["headers1"])
    assert latest.status_code == 200
    assert latest.json()["intelligence_report"]["target_role"] == "Backend Developer"


def test_resume_intelligence_keeps_deterministic_fallback_on_gemini_failure(test_users_and_resumes, monkeypatch):
    data = test_users_and_resumes

    def fail_semantic_analysis(resume_context, role_profile):
        raise RuntimeError("Gemini unavailable")

    monkeypatch.setattr(resume_intelligence_service, "analyze_resume_semantics", fail_semantic_analysis)
    response = client.post(
        "/api/ats/intelligence",
        json={"resume_id": data["resume1_id"], "target_role": "Backend Developer"},
        headers=data["headers1"],
    )

    assert response.status_code == 201
    result = response.json()
    assert result["ats_score"] >= 0
    assert result["role_match_score"] >= 0
    assert result["intelligence_report"]["ai_analysis"]["available"] is False
    assert "Basic ATS analysis is still available" in result["intelligence_report"]["ai_analysis"]["message"]


def test_resume_intelligence_requires_verified_resume(test_users_and_resumes):
    data = test_users_and_resumes
    db = TestingSessionLocal()
    review_resume = Resume(
        user_id=data["user1_id"],
        original_filename="review_resume.pdf",
        display_name="Needs Review",
        file_path="/tmp/review_resume.pdf",
        file_type="pdf",
        file_size=1024,
    )
    db.add(review_resume)
    db.commit()
    db.refresh(review_resume)

    db.add(
        ParsedResume(
            resume_id=review_resume.id,
            user_id=data["user1_id"],
            status="needs_review",
            raw_text="Name\nEmail: sample@example.com\nSkills: Python",
            header_block="Name\nsample@example.com",
            personal_info={"full_name": "Name", "email": "sample@example.com"},
            summary="A software engineer.",
            skills=["Python"],
            skills_raw="Python",
            education=[],
            experience=[],
            projects=[],
            certifications=[],
            achievements=[],
            other_sections={},
            unrecognized_sections={},
        )
    )
    review_resume_id = review_resume.id
    db.commit()
    db.close()

    response = client.post(
        "/api/ats/intelligence",
        json={"resume_id": review_resume_id, "target_role": "Backend Developer"},
        headers=data["headers1"],
    )

    assert response.status_code == 400
    assert "Please review and confirm your parsed resume before running ATS analysis." in response.json()["detail"]


def test_ats_reanalysis_creates_new_row(test_users_and_resumes):
    data = test_users_and_resumes
    res1 = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers1"],
    )
    res2 = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers1"],
    )

    assert res1.status_code == 201
    assert res2.status_code == 201

    id1 = res1.json()["id"]
    id2 = res2.json()["id"]

    assert id1 != id2

    # Check history endpoint to confirm 2 rows exist
    history_res = client.get(
        f"/api/ats/{data['resume1_id']}/history",
        headers=data["headers1"],
    )
    assert history_res.status_code == 200
    assert len(history_res.json()) == 2


def test_ats_analyze_invalid_resume_id(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/ats/analyze",
        json={"resume_id": 999999},
        headers=data["headers1"],
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Resume not found."


def test_ats_analyze_unauthorized_user(test_users_and_resumes):
    data = test_users_and_resumes
    # User 2 tries to analyze User 1's resume
    response = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers2"],
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this resume."


def test_ats_analyze_missing_parsed_data(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume_unparsed_id"]},
        headers=data["headers1"],
    )
    assert response.status_code == 400
    assert "Please review and confirm your parsed resume before running ATS analysis." in response.json()["detail"]


def test_get_latest_ats_analysis_success(test_users_and_resumes):
    data = test_users_and_resumes
    # Trigger analysis first
    client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers1"],
    )

    response = client.get(
        f"/api/ats/{data['resume1_id']}",
        headers=data["headers1"],
    )
    assert response.status_code == 200
    assert response.json()["resume_id"] == data["resume1_id"]


def test_get_latest_ats_analysis_not_found(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.get(
        f"/api/ats/{data['resume1_id']}",
        headers=data["headers1"],
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "No ATS analysis found for this resume."


def test_get_latest_ats_analysis_forbidden(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.get(
        f"/api/ats/{data['resume1_id']}",
        headers=data["headers2"],
    )
    assert response.status_code == 403


def test_get_ats_result_by_id_success(test_users_and_resumes):
    data = test_users_and_resumes
    post_res = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers1"],
    )
    analysis_id = post_res.json()["id"]

    response = client.get(
        f"/api/ats/result/{analysis_id}",
        headers=data["headers1"],
    )
    assert response.status_code == 200
    assert response.json()["id"] == analysis_id


def test_get_ats_result_by_id_forbidden(test_users_and_resumes):
    data = test_users_and_resumes
    post_res = client.post(
        "/api/ats/analyze",
        json={"resume_id": data["resume1_id"]},
        headers=data["headers1"],
    )
    analysis_id = post_res.json()["id"]

    # User 2 attempts to view User 1's ATS analysis by analysis_id
    response = client.get(
        f"/api/ats/result/{analysis_id}",
        headers=data["headers2"],
    )
    assert response.status_code == 403


def test_unauthenticated_access():
    response = client.post("/api/ats/analyze", json={"resume_id": 1})
    assert response.status_code in (401, 403)
