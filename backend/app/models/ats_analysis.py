from sqlalchemy import Column, Integer, JSON, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.config.database import Base


class ATSAnalysis(Base):
    """
    SQLAlchemy model for storing ATS (Applicant Tracking System) analysis results.
    A resume can have multiple ATS analysis records over time to track scoring history.
    """
    __tablename__ = "ats_analyses"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role = Column(String(120), nullable=True)
    role_match_score = Column(Integer, nullable=True)
    intelligence_report = Column(JSON, nullable=True)

    # Scores on a consistent 0-100 scale
    ats_score = Column(Integer, nullable=False)
    keyword_score = Column(Integer, nullable=True)
    section_score = Column(Integer, nullable=True)
    formatting_score = Column(Integer, nullable=True)
    content_score = Column(Integer, nullable=True)

    # Granular role-aware component scores (0-100)
    role_skills_score = Column(Integer, nullable=True)
    project_experience_score = Column(Integer, nullable=True)
    qualifications_keywords_score = Column(Integer, nullable=True)
    content_quality_score = Column(Integer, nullable=True)
    ats_parsing_score = Column(Integer, nullable=True)

    # MySQL-compatible JSON fields for structured results
    detected_keywords = Column(JSON, nullable=True)   # list[str]
    missing_keywords = Column(JSON, nullable=True)    # list[str]
    issues = Column(JSON, nullable=True)              # list[dict]
    recommendations = Column(JSON, nullable=True)     # list[dict]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resume = relationship("Resume", back_populates="ats_analyses")
