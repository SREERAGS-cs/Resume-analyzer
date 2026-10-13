from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
import app.models  # noqa: F401
from app.models.parsed_resume import ParsedResume
from app.models.resume import Resume
from app.models.user import User
from app.routers import job_matching
from app.services.job_matching_service import _build_analysis_result
from app.utils.security import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


api_app = FastAPI()
api_app.include_router(job_matching.router)
api_app.dependency_overrides[get_db] = override_get_db
client = TestClient(api_app)


def setup_db():
    Base.metadata.create_all(bind=engine)


def teardown_db():
    Base.metadata.drop_all(bind=engine)


def build_user_and_resume(user_name="User One", email=None):
    teardown_db()
    setup_db()
    unique_email = email or f"{user_name.lower().replace(' ', '')}@example.com"
    db = TestingSessionLocal()
    user = User(full_name=user_name, email=unique_email, password_hash="hashed")
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id

    resume = Resume(
        user_id=user_id,
        original_filename="resume.pdf",
        display_name="Resume",
        file_path="/tmp/resume.pdf",
        file_type="pdf",
        file_size=1024,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    resume_id = resume.id

    parsed = ParsedResume(
        resume_id=resume_id,
        user_id=user_id,
        status="verified",
        raw_text="Python FastAPI React PostgreSQL AWS",
        header_block="Jane Doe\n jane@example.com",
        personal_info={"full_name": "Jane Doe", "email": "jane@example.com"},
        summary="Python engineer with API and database experience.",
        skills=["Python", "FastAPI", "React", "PostgreSQL", "AWS"],
        skills_raw="Python, FastAPI, React, PostgreSQL, AWS",
        education=[],
        experience=[],
        projects=[],
        certifications=[],
        achievements=[],
        other_sections={},
        unrecognized_sections={},
    )
    db.add(parsed)
    db.commit()
    db.close()

    return {
        "user_id": user_id,
        "resume_id": resume_id,
        "headers": {"Authorization": f"Bearer {create_access_token({'sub': str(user_id)})}"},
    }


def test_job_matching_analyze_success_and_score_range():
    data = build_user_and_resume()
    response = client.post(
        "/api/job-matching/analyze",
        json={
            "resume_id": data["resume_id"],
            "job_title": "Backend Engineer",
            "job_description": "We need a Python engineer with FastAPI, PostgreSQL, and cloud deployment experience. Build APIs and data pipelines.",
        },
        headers=data["headers"],
    )
    assert response.status_code == 201
    body = response.json()
    assert 0 <= body["overall_score"] <= 100
    assert body["score_level"] in {"LOW", "MEDIUM", "HIGH"}
    assert body["matched_skills"]
    teardown_db()


def test_job_matching_requires_verified_resume():
    teardown_db(); setup_db()
    db = TestingSessionLocal()
    user = User(full_name="A", email="verified@example.com", password_hash="hash")
    db.add(user); db.commit(); db.refresh(user); user_id = user.id
    resume = Resume(user_id=user_id, original_filename="r.pdf", display_name="R", file_path="/tmp/r.pdf", file_type="pdf", file_size=1)
    db.add(resume); db.commit(); db.refresh(resume); resume_id = resume.id
    db.add(ParsedResume(resume_id=resume_id, user_id=user_id, status="needs_review", raw_text="Python", header_block="Python", personal_info={}, summary="Python", skills=["Python"], skills_raw="Python", education=[], experience=[], projects=[], certifications=[], achievements=[], other_sections={}, unrecognized_sections={}))
    db.commit(); db.close()
    headers = {"Authorization": f"Bearer {create_access_token({'sub': str(user_id)})}"}
    response = client.post(
        "/api/job-matching/analyze",
        json={"resume_id": resume_id, "job_description": "Need Python engineer."},
        headers=headers,
    )
    assert response.status_code == 400
    assert "Please review and confirm your parsed resume" in response.json()["detail"]
    teardown_db()


def test_job_matching_rejects_blank_job_description():
    data = build_user_and_resume()
    response = client.post(
        "/api/job-matching/analyze",
        json={"resume_id": data["resume_id"], "job_description": "   "},
        headers=data["headers"],
    )
    assert response.status_code == 422
    teardown_db()


def test_job_matching_rejects_generic_jd_words_and_keeps_score_below_hundred():
    data = build_user_and_resume()
    db = TestingSessionLocal()
    resume = db.query(Resume).filter(Resume.id == data["resume_id"]).first()
    result = _build_analysis_result(
        resume,
        "AI Engineer",
        "We are looking for a Python engineer with FastAPI and SQL experience. Strong ability to analyze data and work with teams. Prefer machine learning and retrieval augmented generation experience.",
    )
    db.close()
    assert "accelerated" not in result["missing_requirements"]
    assert "ability" not in result["missing_requirements"]
    assert result["overall_score"] < 100
    teardown_db()


def test_job_matching_forbidden_for_other_user():
    data = build_user_and_resume("Owner", "owner@example.com")
    db = TestingSessionLocal(); other_user = User(full_name="Other", email="other@example.com", password_hash="hash"); db.add(other_user); db.commit(); db.refresh(other_user); other_user_id = other_user.id; db.close()
    headers = {"Authorization": f"Bearer {create_access_token({'sub': str(other_user_id)})}"}
    response = client.post(
        "/api/job-matching/analyze",
        json={"resume_id": data["resume_id"], "job_description": "Need Python engineer."},
        headers=headers,
    )
    assert response.status_code == 403
    teardown_db()


def test_job_matching_returns_latest_result_for_owned_resume():
    data = build_user_and_resume("User One", "latest@example.com")
    first = client.post(
        "/api/job-matching/analyze",
        json={"resume_id": data["resume_id"], "job_description": "Need Python engineer with FastAPI."},
        headers=data["headers"],
    )
    second = client.post(
        "/api/job-matching/analyze",
        json={"resume_id": data["resume_id"], "job_description": "Need React and Python engineer."},
        headers=data["headers"],
    )
    assert first.status_code == 201 and second.status_code == 201
    latest = client.get(f"/api/job-matching/{data['resume_id']}", headers=data["headers"])
    assert latest.status_code == 200
    assert latest.json()["job_description"] == "Need React and Python engineer."
    teardown_db()
