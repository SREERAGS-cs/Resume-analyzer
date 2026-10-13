from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserPasswordChange, UserProfileUpdate
from app.utils.security import hash_password, verify_password


def get_user_profile(user: User) -> User:
    return user


def update_user_profile(db: Session, user: User, update_data: UserProfileUpdate) -> User:
    data_dict = update_data.model_dump(exclude_unset=True)

    if "email" in data_dict and data_dict["email"] is not None:
        new_email = str(data_dict["email"]).strip().lower()
        if new_email != user.email.lower():
            conflict = db.query(User).filter(User.email == new_email, User.id != user.id).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email is already in use by another account.",
                )
            user.email = new_email

    if "full_name" in data_dict and data_dict["full_name"] is not None:
        user.full_name = data_dict["full_name"]

    profile_fields = [
        "phone",
        "location",
        "linkedin_url",
        "github_url",
        "portfolio_url",
        "education",
        "target_role",
        "bio",
    ]
    for field in profile_fields:
        if field in data_dict:
            setattr(user, field, data_dict[field])

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_user_password(db: Session, user: User, password_data: UserPasswordChange) -> dict:
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match.",
        )

    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if verify_password(password_data.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your current password.",
        )

    user.password_hash = hash_password(password_data.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password changed successfully."}
