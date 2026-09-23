from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.config.database import Base


class ActivityLog(Base):
    """
    Tracks user actions for the Recent Activity feed.
    action is a short machine-readable code (e.g. "resume_uploaded");
    the frontend maps it to a display label.
    """
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    detail = Column(String(255), nullable=True)  # e.g. the resume's display_name at the time
    created_at = Column(DateTime(timezone=True), server_default=func.now())