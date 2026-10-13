from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.config.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # General preferences
    theme = Column(String(20), default="system", nullable=False)
    target_role = Column(String(150), nullable=True)
    job_location = Column(String(150), nullable=True)
    work_mode = Column(String(50), default="Any", nullable=False)
    opportunity_type = Column(String(50), default="Full-time", nullable=False)

    # Notification preferences
    email_job_alerts = Column(Boolean, default=True, nullable=False)
    email_analysis_alerts = Column(Boolean, default=True, nullable=False)
    email_security_alerts = Column(Boolean, default=True, nullable=False)
    in_app_notifications = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="settings")
