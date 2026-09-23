from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.config.database import Base


class ResumeDraft(Base):
    __tablename__ = "resume_drafts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False, default="Untitled Resume")
    template_id = Column(String(50), nullable=False, default="professional")
    font_family_id = Column(String(30), nullable=True)
    font_size_id = Column(String(30), nullable=True)

    personal_information = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    experience = Column(JSON, nullable=True)
    projects = Column(JSON, nullable=True)
    certifications = Column(JSON, nullable=True)
    achievements = Column(JSON, nullable=True)
    additional_sections = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())