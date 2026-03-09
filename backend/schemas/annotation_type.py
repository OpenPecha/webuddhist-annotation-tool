from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AnnotationTypeBase(BaseModel):
    """Base schema for annotation type."""
    name: str
    color: Optional[str] = None


class AnnotationTypeCreate(AnnotationTypeBase):
    """Schema for creating an annotation type."""
    uploader_id: Optional[str] = None  # Auth0 user ID of the uploader


class AnnotationTypeUpdate(BaseModel):
    """Schema for updating an annotation type."""
    name: Optional[str] = None
    color: Optional[str] = None


class AnnotationTypeResponse(AnnotationTypeBase):
    """Schema for annotation type response."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    uploader_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

