"""
Unit tests for Phase 3.1: ATS Analysis Database Model + Pydantic Schemas.

Checks:
1. Imports of model and schemas.
2. SQLAlchemy model ATSAnalysis instantiation and field definitions.
3. 1-to-Many relationship between Resume and ATSAnalysis (multiple records per resume).
4. Cascade delete behavior.
5. Pydantic schemas validation (0-100 score bounds, JSON structure, ORM compatibility).
"""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.database import Base
from app.models.user import User
from app.models.resume import Resume
from app.models.ats_analysis import ATSAnalysis
from app.schemas.ats_analysis import (
    ATSAnalysisBase,
    ATSAnalysisCreate,
    ATSAnalysisResponse,
    ATSIssueItem,
    ATSRecommendationItem,
)


@pytest.fixture
def db_session():
    """In-memory SQLite database session mimicking SQLite/MySQL schema creation."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_ats_analysis_model_creation(db_session):
    """Test creating user, resume, and multiple ATSAnalysis records on one resume."""
    user = User(full_name="ATS Tester", email="ats_test@example.com", password_hash="hashed_pwd")
    db_session.add(user)
    db_session.commit()

    resume = Resume(
        user_id=user.id,
        original_filename="ats_test.pdf",
        display_name="ATS Test Resume",
        file_path="/tmp/ats_test.pdf",
        file_type="pdf",
        file_size=1024,
    )
    db_session.add(resume)
    db_session.commit()

    # Create 1st ATS analysis record
    ats1 = ATSAnalysis(
        resume_id=resume.id,
        ats_score=85,
        keyword_score=80,
        section_score=90,
        formatting_score=88,
        content_score=82,
        detected_keywords=["Python", "FastAPI", "MySQL"],
        missing_keywords=["Docker", "REST API"],
        issues=[
            {"type": "keyword", "severity": "medium", "message": "Some keywords missing"}
        ],
        recommendations=[
            {"category": "keywords", "message": "Add Docker to skills"}
        ],
    )
    db_session.add(ats1)

    # Create 2nd ATS analysis record for the SAME resume (1-to-many check)
    ats2 = ATSAnalysis(
        resume_id=resume.id,
        ats_score=92,
        keyword_score=90,
        section_score=95,
        formatting_score=90,
        content_score=93,
        detected_keywords=["Python", "FastAPI", "MySQL", "Docker"],
        missing_keywords=["REST API"],
        issues=[],
        recommendations=[],
    )
    db_session.add(ats2)
    db_session.commit()

    # Query resume and inspect ats_analyses relationship
    db_session.refresh(resume)
    assert len(resume.ats_analyses) == 2
    scores = {rec.ats_score for rec in resume.ats_analyses}
    assert scores == {85, 92}


def test_ats_analysis_cascade_delete(db_session):
    """Test that deleting a resume cascades and deletes all associated ATSAnalysis records."""
    user = User(full_name="Cascade User", email="cascade@example.com", password_hash="pwd")
    db_session.add(user)
    db_session.commit()

    resume = Resume(
        user_id=user.id,
        original_filename="cascade.pdf",
        display_name="Cascade Resume",
        file_path="/tmp/cascade.pdf",
        file_type="pdf",
        file_size=500,
    )
    db_session.add(resume)
    db_session.commit()

    ats = ATSAnalysis(
        resume_id=resume.id,
        ats_score=75,
        detected_keywords=["Python"],
    )
    db_session.add(ats)
    db_session.commit()

    assert db_session.query(ATSAnalysis).count() == 1

    db_session.delete(resume)
    db_session.commit()

    assert db_session.query(ATSAnalysis).count() == 0


def test_pydantic_schemas_valid():
    """Test valid Pydantic schema serialization/deserialization."""
    create_data = {
        "resume_id": 1,
        "ats_score": 88,
        "keyword_score": 85,
        "section_score": 90,
        "formatting_score": 85,
        "content_score": 92,
        "detected_keywords": ["Python", "FastAPI"],
        "missing_keywords": ["Docker"],
        "issues": [
            {"type": "keyword", "severity": "low", "message": "Minor keyword gap"}
        ],
        "recommendations": [
            {"category": "keywords", "message": "Add Docker"}
        ],
    }
    schema_create = ATSAnalysisCreate(**create_data)
    assert schema_create.ats_score == 88
    assert len(schema_create.issues) == 1
    assert schema_create.issues[0].severity == "low"

    # Response schema ORM compatibility test
    now = datetime.now(timezone.utc)
    response_data = {
        "id": 10,
        "resume_id": 1,
        "created_at": now,
        "updated_at": now,
        **schema_create.model_dump(),
    }
    response_schema = ATSAnalysisResponse(**response_data)
    assert response_schema.id == 10
    assert response_schema.ats_score == 88


def test_pydantic_score_validation():
    """Test that score fields enforce 0-100 validation constraints."""
    with pytest.raises(ValidationError):
        ATSAnalysisBase(ats_score=105)

    with pytest.raises(ValidationError):
        ATSAnalysisBase(ats_score=-5)

    with pytest.raises(ValidationError):
        ATSAnalysisBase(ats_score=80, keyword_score=150)
