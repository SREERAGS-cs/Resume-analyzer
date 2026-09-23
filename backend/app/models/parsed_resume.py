from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.config.database import Base


class ParsedResume(Base):
    __tablename__ = "parsed_resumes"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(20), nullable=False, default="not_started")

    raw_text = Column(Text, nullable=True)

    header_block = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    skills_raw = Column(Text, nullable=True)
    education_raw = Column(Text, nullable=True)
    experience_raw = Column(Text, nullable=True)
    projects_raw = Column(Text, nullable=True)
    certifications_raw = Column(Text, nullable=True)
    achievements_raw = Column(Text, nullable=True)

    personal_info = Column(JSON, nullable=True)
    skills = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    experience = Column(JSON, nullable=True)
    projects = Column(JSON, nullable=True)
    certifications = Column(JSON, nullable=True)
    achievements = Column(JSON, nullable=True)
    other_sections = Column(JSON, nullable=True)          # {"languages": "...", "coursework": "..."}
    unrecognized_sections = Column(JSON, nullable=True)   # headers we couldn't classify

    parse_error = Column(Text, nullable=True)
    parsed_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resume = relationship("Resume", back_populates="parsed_data")