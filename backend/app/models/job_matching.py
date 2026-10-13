from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.config.database import Base


class JobMatchingAnalysis(Base):
    __tablename__ = "job_matching_analyses"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    job_title = Column(String(255), nullable=True)
    job_description = Column(Text, nullable=False)
    overall_score = Column(Integer, nullable=False)
    score_level = Column(String(20), nullable=False)

    matched_skills = Column(JSON, nullable=True)
    partial_matches = Column(JSON, nullable=True)
    missing_requirements = Column(JSON, nullable=True)
    responsibility_match = Column(JSON, nullable=True)

    strengths = Column(JSON, nullable=True)
    improvements = Column(JSON, nullable=True)
    deemphasize = Column(JSON, nullable=True)
    priority_actions = Column(JSON, nullable=True)
    overall_assessment = Column(Text, nullable=True)

    analysis_report = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resume = relationship("Resume", back_populates="job_matching_analyses")
