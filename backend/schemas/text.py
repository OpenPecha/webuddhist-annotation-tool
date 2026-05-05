from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional, Literal
from datetime import datetime
from models.text import VALID_STATUSES


class UserBasic(BaseModel):
    """Basic user information for embedding in text responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None


class TextBase(BaseModel):
    title: str
    content: str
    translation: Optional[str] = None
    diplomatic_text: Optional[str] = None
    source: Optional[str] = None
    language: str = "en"

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()

    @validator('language')
    def validate_language(cls, v):
        # Basic language validation - could be extended
        if len(v) < 2:
            raise ValueError('Language code must be at least 2 characters')
        return v


class TextCreate(TextBase):
    uploaded_by: Optional[int] = None
    annotation_type_id: Optional[str] = None


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    translation: Optional[str] = None
    diplomatic_text: Optional[str] = None
    source: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    reviewer_id: Optional[int] = None
    uploaded_by: Optional[int] = None

    @validator('status')
    def validate_status(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class TextResponse(TextBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    status: str
    annotation_types_created: Optional[list] = None  # For upload: types created (e.g. ["pos", "tei_editorial"])
    content: Optional[str] = ""  # Optional for list views
    translation: Optional[str] = None
    diplomatic_text: Optional[str] = None
    annotator_id: Optional[int] = None
    annotation_type_id: Optional[str] = None
    reviewer_id: Optional[int] = None
    uploaded_by: Optional[int] = None
    current_user_permission: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Optional: Include annotations count
    annotations_count: Optional[int] = None
    
    # Nested user information
    annotator: Optional[UserBasic] = None
    reviewer: Optional[UserBasic] = None
    uploader: Optional[UserBasic] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class TextListResponse(BaseModel):
    """Response schema for text lists - excludes content and translation for performance."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    source: Optional[str] = None
    language: str = "en"
    status: str
    annotator_id: Optional[int] = None
    annotation_type_id: Optional[str] = None
    reviewer_id: Optional[int] = None
    uploaded_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Optional: Include annotations count
    annotations_count: Optional[int] = None
    
    # Nested user information
    annotator: Optional[UserBasic] = None
    reviewer: Optional[UserBasic] = None
    uploader: Optional[UserBasic] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class TaskSubmissionResponse(BaseModel):
    """Response for task submission - includes submitted task and next task if available"""
    submitted_task: TextResponse
    next_task: Optional[TextResponse] = None
    message: str


class RecentActivityWithReviewCounts(BaseModel):
    """Response for recent activity with annotation review counts"""
    text: TextResponse
    total_annotations: int
    accepted_count: int
    rejected_count: int
    all_accepted: bool 


class TextPermissionUpsertRequest(BaseModel):
    grantee_user_id: int = Field(..., gt=0)
    permission: Literal["read", "write"]


class TextPermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text_id: int
    owner_user_id: int
    grantee_user_id: int
    permission: Literal["read", "write"]
    created_at: datetime
    updated_at: Optional[datetime] = None
    grantee: Optional[UserBasic] = None