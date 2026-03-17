from pydantic import BaseModel, ConfigDict, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class AnnotationBase(BaseModel):
    annotation_type: str
    start_position: int
    end_position: int
    selected_text: Optional[str] = None
    label: Optional[str] = None
    name: Optional[str] = None  # Custom name for the annotation (especially for headers)
    level: Optional[str] = None  # Importance level: minor, major, critical
    meta: Optional[Dict[str, Any]] = None
    confidence: int = 100

    @validator('start_position', 'end_position')
    def validate_positions(cls, v):
        if v < 0:
            raise ValueError('Position must be non-negative')
        return v

    @validator('end_position')
    def validate_end_position(cls, v, values):
        if 'start_position' in values and v < values['start_position']:
            raise ValueError('End position must be greater than or equal to start position')
        return v

    @validator('confidence')
    def validate_confidence(cls, v):
        if not 0 <= v <= 100:
            raise ValueError('Confidence must be between 0 and 100')
        return v

    @validator('level', pre=True)
    def validate_level(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        if isinstance(v, str):
            # Convert string to lowercase to match enum values
            v = v.lower()
            # Validate against enum values
            valid_values = ["minor", "major", "critical"]
            if v not in valid_values:
                raise ValueError(f'Level must be one of: {", ".join(valid_values)}')
            return v
        return v


class AnnotationCreate(AnnotationBase):
    text_id: int


class AnnotationUpdate(BaseModel):
    annotation_type: Optional[str] = None
    start_position: Optional[int] = None
    end_position: Optional[int] = None
    selected_text: Optional[str] = None
    label: Optional[str] = None
    name: Optional[str] = None  # Custom name for the annotation
    level: Optional[str] = None  # Importance level: minor, major, critical
    meta: Optional[Dict[str, Any]] = None
    confidence: Optional[int] = None

    @validator('start_position', 'end_position', pre=True)
    def validate_positions_update(cls, v):
        if v is not None and v < 0:
            raise ValueError('Position must be non-negative')
        return v

    @validator('confidence', pre=True)
    def validate_confidence_update(cls, v):
        if v is not None and not 0 <= v <= 100:
            raise ValueError('Confidence must be between 0 and 100')
        return v

    @validator('level', pre=True)
    def validate_level_update(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        if isinstance(v, str):
            # Convert string to lowercase to match enum values
            v = v.lower()
            # Validate against enum values
            valid_values = ["minor", "major", "critical"]
            if v not in valid_values:
                raise ValueError(f'Level must be one of: {", ".join(valid_values)}')
            return v
        return v


class ValidatePositionsRequest(BaseModel):
    """Request body for POST /annotations/validate-positions."""
    text_id: int
    start_position: int
    end_position: int


class SpanPosition(BaseModel):
    """A single span (start, end) for bulk operations."""
    start_position: int
    end_position: int


class BulkCreateAnnotationsRequest(BaseModel):
    """Request body for POST /annotations/bulk-create (apply to all)."""
    text_id: int
    annotation_type: str
    label: Optional[str] = None
    name: Optional[str] = None
    level: Optional[str] = None
    selected_text: str
    spans: List[SpanPosition]

    @validator("spans")
    def validate_spans_not_empty(cls, v):
        if not v:
            raise ValueError("At least one span is required")
        return v


class BulkDeleteByCriteriaRequest(BaseModel):
    """Request body for POST /annotations/bulk-delete (delete from all)."""
    text_id: int
    annotation_type: str
    label: Optional[str] = None
    selected_text: str


class AnnotationResponse(AnnotationBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    text_id: int
    annotator_id: Optional[int] = None  # Can be null for system annotations
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_agreed: Optional[bool] = False  # Whether annotation has been agreed upon by a reviewer