"""Users API routes. Thin layer: dependencies and controller delegation."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from deps import get_db
from auth import get_current_active_user, require_admin
from models.user import User, UserRole
from schemas.user import (
    AdminManualUserCreate,
    ManualUserUpsertResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserRoleResponse,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from controllers import users as users_controller

router = APIRouter(prefix="/users", tags=["Users"])
security = HTTPBearer()


@router.post("/", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(require_admin),
):
    """Create a new user."""
    return users_controller.create_user(db, user_in)


@router.post("/register", response_model=UserResponse)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """Register or sync user on login. Upserts by auth0_user_id; no auth token required."""
    return users_controller.register_user(db, user_in)

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info."""
    return users_controller.get_me(current_user)


@router.get(
    "/auth0/{auth0_user_id}/role",
    response_model=UserRoleResponse,
)
def read_user_role_by_auth0_id(
    auth0_user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Return app role and user id for the given Auth0 user id (must match the authenticated user)."""
    return users_controller.get_role_for_auth0_user(current_user, auth0_user_id)


@router.put("/me", response_model=UserResponse)
def update_users_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update current user info."""
    return users_controller.update_me(db, current_user, user_in)


@router.get("/debug/auth0", include_in_schema=False)
def debug_auth0_integration(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Debug Auth0 integration (Development only)."""
    return users_controller.debug_auth0_integration(credentials.credentials)


@router.post("/manual", response_model=ManualUserUpsertResponse)
def upsert_manual_user(
    user_in: AdminManualUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create staff user or update role/status by email (admin only)."""
    return users_controller.upsert_manual_user(db, current_user, user_in)


@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None),
    role: Optional[UserRole] = Query(None),
    exclude_role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get users list (Admin only)."""
    return users_controller.list_users(
        db,
        current_user,
        skip=skip,
        limit=limit,
        is_active=is_active,
        role=role,
        exclude_role=exclude_role,
    )


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get user by ID (Admin only)."""
    return users_controller.get_user(db, current_user, user_id)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user (Admin only)."""
    return users_controller.update_user(db, current_user, user_id, user_in)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete user (Admin only)."""
    users_controller.delete_user(db, current_user, user_id)


@router.get("/search/", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    text_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Search users for admin management or text sharing."""
    return users_controller.search_users(
        db, current_user, q, skip=skip, limit=limit, text_id=text_id
    )
