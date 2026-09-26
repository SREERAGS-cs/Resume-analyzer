from sqlalchemy import Column, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.config.database import Base


class ResumeAnalysis(Base):
    """
    One row per analysis run. A resume can have many analysis records —
    re-analyzing creates a new row rather than overwriting the previous
    result, so score history/trends remain available.
    """
    __tablename__ = "resume_analyses"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)

    # All scores are 0-100 for consistency; the frontend converts to a
    # 10-point display scale where needed, the database never mixes scales.
    overall_score = Column(Integer, nullable=False)
    content_score = Column(Integer, nullable=True)
    structure_score = Column(Integer, nullable=True)
    skills_score = Column(Integer, nullable=True)
    summary_score = Column(Integer, nullable=True)
    education_score = Column(Integer, nullable=True)
    experience_score = Column(Integer, nullable=True)
    projects_score = Column(Integer, nullable=True)
    certifications_score = Column(Integer, nullable=True)

    strengths = Column(JSON, nullable=True)       # list[str]
    improvements = Column(JSON, nullable=True)    # list[str]
    recommendations = Column(JSON, nullable=True) # list[{"title": str, "description": str}]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resume = relationship("Resume", back_populates="analysis_records")