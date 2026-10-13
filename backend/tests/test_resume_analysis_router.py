from datetime import datetime, timezone
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
import app.models  # noqa: F401
from app.models.user import User
from app.models.resume import Resume
from app.models.parsed_resume import ParsedResume
from app.models.analysis import ResumeAnalysis
from app.routers import resume_analysis
from app.utils.security import create_access_token

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
api_app.include_router(resume_analysis.router)
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
        personal_info={
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "555-0199",
            "linkedin": "linkedin.com/in/janedoe",
            "github": "github.com/janedoe",
        },
        summary="Experienced Full Stack Developer with 4 years in React and Python.",
        skills=["Python", "FastAPI", "React", "PostgreSQL", "Docker", "Git", "REST APIs"],
        education=[{
            "degree": "B.S. in Computer Science",
            "institution": "Tech University",
            "start_date": "2018",
            "end_date": "2022",
        }],
        experience=[{
            "company": "Tech Innovators",
            "job_title": "Software Engineer",
            "description": "Architected microservices that improved API response time by 40%.",
            "responsibilities": ["Developed backend endpoints", "Optimized database queries"],
        }],
        projects=[{
            "name": "Resume IQ",
            "description": "Engineered an AI-powered resume analysis application serving 1,000 active users.",
            "technologies": ["Python", "FastAPI", "React"],
        }],
        certifications=[{
            "name": "AWS Certified Cloud Practitioner",
            "issuer": "Amazon Web Services",
            "date": "2023",
        }],
        verified_at=datetime.now(timezone.utc),
    )
    db.add(parsed1)
    db.commit()

    # Resume 2 belonging to User 1 (Not Parsed)
    resume2 = Resume(
        user_id=user1.id,
        original_filename="user1_unparsed.pdf",
        display_name="User 1 Unparsed",
        file_path="/tmp/user1_unparsed.pdf",
        file_type="pdf",
        file_size=1024,
    )
    db.add(resume2)
    db.commit()
    db.refresh(resume2)

    parsed2 = ParsedResume(
        resume_id=resume2.id,
        user_id=user1.id,
        status="not_started",
    )
    db.add(parsed2)
    db.commit()

    # Resume 3 belonging to User 2
    resume3 = Resume(
        user_id=user2.id,
        original_filename="user2_resume.pdf",
        display_name="User 2 Resume",
        file_path="/tmp/user2_resume.pdf",
        file_type="pdf",
        file_size=2048,
    )
    db.add(resume3)
    db.commit()
    db.refresh(resume3)

    parsed3 = ParsedResume(
        resume_id=resume3.id,
        user_id=user2.id,
        status="verified",
        personal_info={"full_name": "John Smith", "email": "john@example.com"},
        summary="Data Analyst",
        skills=["Python", "SQL"],
        verified_at=datetime.now(timezone.utc),
    )
    db.add(parsed3)
    db.commit()

    # Create auth tokens
    token1 = create_access_token({"sub": str(user1.id)})
    token2 = create_access_token({"sub": str(user2.id)})

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    yield {
        "user1": user1,
        "user2": user2,
        "resume1_id": resume1.id,
        "resume2_id": resume2.id,
        "resume3_id": resume3.id,
        "headers1": headers1,
        "headers2": headers2,
    }

    db.close()


def test_resume_analyze_success(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": data["resume1_id"]},
    )
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["resume_id"] == data["resume1_id"]
    assert "overall_score" in res_json
    assert 0 <= res_json["overall_score"] <= 100
    assert "content_score" in res_json
    assert "structure_score" in res_json
    assert "skills_score" in res_json
    assert isinstance(res_json["strengths"], list)
    assert isinstance(res_json["improvements"], list)
    assert isinstance(res_json["recommendations"], list)


def test_resume_analyze_unparsed_fails(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": data["resume2_id"]},
    )
    assert response.status_code == 400
    assert "hasn't been parsed yet" in response.json()["detail"]


def test_resume_analyze_forbidden_for_other_user(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": data["resume3_id"]},
    )
    assert response.status_code == 403


def test_resume_analyze_not_found(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": 99999},
    )
    assert response.status_code == 404


def test_resume_reanalysis_creates_new_row(test_users_and_resumes):
    data = test_users_and_resumes
    res1 = client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": data["resume1_id"]},
    )
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    res2 = client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": data["resume1_id"]},
    )
    assert res2.status_code == 201
    id2 = res2.json()["id"]

    assert id1 != id2

    history = client.get(
        f"/api/resume-analysis/{data['resume1_id']}/history",
        headers=data["headers1"],
    )
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 2


def test_get_latest_analysis_success(test_users_and_resumes):
    data = test_users_and_resumes
    client.post(
        "/api/resume-analysis/analyze",
        headers=data["headers1"],
        json={"resume_id": data["resume1_id"]},
    )
    response = client.get(
        f"/api/resume-analysis/{data['resume1_id']}",
        headers=data["headers1"],
    )
    assert response.status_code == 200
    assert response.json()["resume_id"] == data["resume1_id"]


def test_get_latest_analysis_not_found(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.get(
        f"/api/resume-analysis/{data['resume1_id']}",
        headers=data["headers1"],
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "No analysis found for this resume."


def test_get_latest_analysis_forbidden(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.get(
        f"/api/resume-analysis/{data['resume3_id']}",
        headers=data["headers1"],
    )
    assert response.status_code == 403


def test_unauthenticated_request_fails(test_users_and_resumes):
    data = test_users_and_resumes
    response = client.post(
        "/api/resume-analysis/analyze",
        json={"resume_id": data["resume1_id"]},
    )
    assert response.status_code == 401
