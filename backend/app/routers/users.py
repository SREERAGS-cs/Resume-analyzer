from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User
from app.schemas.user import UserPasswordChange, UserProfileOut, UserProfileUpdate
from app.services import user_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/profile", response_model=UserProfileOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return user_service.get_user_profile(current_user)


@router.get("/me", response_model=UserProfileOut)
def get_me(current_user: User = Depends(get_current_user)):
    return user_service.get_user_profile(current_user)


@router.put("/profile", response_model=UserProfileOut)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.update_user_profile(db, current_user, profile_data)


@router.put("/me", response_model=UserProfileOut)
def update_me(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.update_user_profile(db, current_user, profile_data)


@router.put("/change-password")
def change_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.change_user_password(db, current_user, password_data)


@router.post("/change-password")
def change_password_post(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.change_user_password(db, current_user, password_data)
