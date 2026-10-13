from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.config.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    original_filename = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    version = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="resumes")
    parsed_data = relationship("ParsedResume", back_populates="resume", uselist=False, cascade="all, delete-orphan")
    analysis_records = relationship("ResumeAnalysis", back_populates="resume", cascade="all, delete-orphan", order_by="ResumeAnalysis.created_at.desc()")
    ats_analyses = relationship("ATSAnalysis", back_populates="resume", cascade="all, delete-orphan", order_by="ATSAnalysis.created_at.desc()")
    job_matching_analyses = relationship("JobMatchingAnalysis", back_populates="resume", cascade="all, delete-orphan", order_by="JobMatchingAnalysis.created_at.desc()")

    @property
    def parsing_status(self) -> str:
        return self.parsed_data.status if self.parsed_data else "not_started"