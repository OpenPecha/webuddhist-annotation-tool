"""User route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

import os
from typing import List, Optional

from fastapi import HTTPException, status

from auth import get_auth0_debug_info
from sqlalchemy.orm import Session

from crud.text import text_crud
from crud.user import user_crud
from models.user import User, UserRole
from schemas.user import UserCreate, UserUpdate, UserRoleResponse



def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new user."""
    return user_crud.create(db=db, obj_in=user_in)


def register_user(db: Session, user_in: UserCreate) -> User:
    """Register or sync user from Auth0 login. Upserts by auth0_user_id (no auth token required)."""
    return user_crud.upsert_by_auth0_id(db=db, obj_in=user_in)


def get_me(current_user: User) -> User:
    """Get current user info."""
    return current_user


def get_role_for_auth0_user(current_user: User, auth0_user_id: str) -> UserRoleResponse:
    """Return role and internal user id for the given Auth0 subject; caller must be that user."""
    if current_user.auth0_user_id != auth0_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only read your own role",
        )
    return UserRoleResponse(role=current_user.role, user_id=current_user.id)


def update_me(db: Session, current_user: User, user_in: UserUpdate) -> User:
    """Update current user info. Users cannot change role or is_active."""
    if user_in.role is not None:
        user_in.role = None
    if user_in.is_active is not None:
        user_in.is_active = None

    if user_in.username and user_crud.is_username_taken(db, user_in.username, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    if user_in.email and user_crud.is_email_taken(db, user_in.email, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already taken",
        )

    return user_crud.update(db=db, db_obj=current_user, obj_in=user_in)


def list_users(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    role: Optional[UserRole] = None,
) -> List[User]:
    """Get users list (admin only)."""
    return user_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        role=role,
    )


def get_user(db: Session, current_user: User, user_id: int) -> User:
    """Get user by ID (admin only)."""
    user = user_crud.get(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def update_user(
    db: Session, current_user: User, user_id: int, user_in: UserUpdate
) -> User:
    """Update user (admin only)."""
    user = user_crud.get(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_in.username and user_crud.is_username_taken(db, user_in.username, user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    if user_in.email and user_crud.is_email_taken(db, user_in.email, user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already taken",
        )

    return user_crud.update(db=db, db_obj=user, obj_in=user_in)


def delete_user(db: Session, current_user: User, user_id: int) -> None:
    """Delete user (admin only). Cannot delete self."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    user = user_crud.get(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user_crud.delete(db=db, user_id=user_id)


def search_users(
    db: Session,
    current_user: User,
    q: str,
    skip: int = 0,
    limit: int = 100,
    text_id: Optional[int] = None,
) -> List[User]:
    """Search users for admin management or text sharing."""
    if current_user.role == UserRole.ADMIN:
        if text_id is None:
            return user_crud.search(db=db, query=q, skip=skip, limit=limit)

        text = text_crud.get(db=db, text_id=text_id)
        if not text:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Text not found",
            )
        return user_crud.search_share_candidates(
            db=db,
            query=q,
            skip=skip,
            limit=limit,
            exclude_user_id=text.uploaded_by,
        )

    if text_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the text owner or an admin can search users for sharing",
        )
    return user_crud.search_share_candidates(
        db=db,
        query=q,
        skip=skip,
        limit=limit,
        exclude_user_id=text.uploaded_by,
    )


def debug_auth0_integration(access_token: str) -> dict:
    """Return Auth0 debug info (development only)."""
    if os.getenv("DEBUG", "false").lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not available in production",
        )
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )
    debug_info = get_auth0_debug_info(access_token)
    return {
        "message": "Auth0 Debug Information",
        "debug_info": debug_info,
        "note": "This endpoint is only available in development mode",
    }
