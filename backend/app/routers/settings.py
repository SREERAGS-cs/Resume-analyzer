from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.user_settings import (
    AccountDeleteRequest,
    UserSettingsOut,
    UserSettingsUpdate,
)
from app.services import settings_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=UserSettingsOut)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return settings_service.get_or_create_user_settings(db, current_user)


@router.put("", response_model=UserSettingsOut)
def update_settings(
    update_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return settings_service.update_user_settings(db, current_user, update_data)


@router.get("/export-data")
def export_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return settings_service.export_user_data(db, current_user)


@router.delete("/account")
def delete_account(
    delete_data: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return settings_service.delete_user_account(db, current_user, delete_data)
