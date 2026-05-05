from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from models.user import UserRole


class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool = True


class UserCreate(UserBase):
    auth0_user_id: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    auth0_user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserInfo(BaseModel):
    """User info from Auth0 token"""
    sub: str
    email: Optional[str] = None
    name: Optional[str] = None
    nickname: Optional[str] = None
    preferred_username: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None


class UserRoleResponse(BaseModel):
    """Role and app user id for the Auth0 user specified (must match the authenticated subject)."""

    model_config = ConfigDict(from_attributes=True)

    role: UserRole
    user_id: int 