from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class AnnotationListBase(BaseModel):
    """Base schema for annotation list."""
    title: str
    type: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class AnnotationListCreate(AnnotationListBase):
    """Schema for creating an annotation list item."""
    parent_id: Optional[str] = None
    type_id: Optional[str] = None


class AnnotationListUpdate(BaseModel):
    """Schema for updating an annotation list item."""
    title: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class AnnotationListResponse(AnnotationListBase):
    """Schema for annotation list response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    type_id: Optional[str] = None
    parent_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Custom validation to populate type from annotation_type relationship."""
        if hasattr(obj, 'annotation_type') and obj.annotation_type:
            # Create a dict with all attributes plus the type from relationship
            data = {
                'id': obj.id,
                'type_id': obj.type_id,
                'title': obj.title,
                'type': obj.annotation_type.name,
                'level': obj.level,
                'description': obj.description,
                'meta': obj.meta,
                'parent_id': obj.parent_id,
                'created_by': obj.created_by,
                'created_at': obj.created_at,
                'updated_at': obj.updated_at
            }
            return super().model_validate(data, **kwargs)
        return super().model_validate(obj, **kwargs)


class CategoryInput(BaseModel):
    """Schema for category in hierarchical JSON input."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    level: Optional[int] = None
    parent: Optional[str] = None
    mnemonic: Optional[str] = None
    examples: Optional[List[Any]] = None
    notes: Optional[str] = None
    subcategories: Optional[List['CategoryInput']] = None
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


class HierarchicalJSONInput(BaseModel):
    """Schema for hierarchical JSON input."""
    version: Optional[str] = None
    title: str
    description: Optional[str] = None
    copyright: Optional[str] = None
    categories: List[CategoryInput]
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


class AnnotationListBulkCreateRequest(BaseModel):
    """Schema for bulk create request."""
    data: HierarchicalJSONInput = Field(..., description="Hierarchical JSON data")


class AnnotationListBulkCreateResponse(BaseModel):
    """Schema for bulk create response."""
    success: bool
    message: str
    total_records_created: int
    record_ids: List[str]
    root_type: str


class CategoryOutput(BaseModel):
    """Schema for category in hierarchical JSON output."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    level: Optional[int] = None
    parent: Optional[str] = None
    mnemonic: Optional[str] = None
    examples: Optional[List[Any]] = None
    notes: Optional[str] = None
    subcategories: Optional[List['CategoryOutput']] = None
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


class HierarchicalJSONOutput(BaseModel):
    """Schema for hierarchical JSON output."""
    version: Optional[str] = None
    title: str
    description: Optional[str] = None
    copyright: Optional[str] = None
    categories: List[CategoryOutput]
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


# Update forward references for recursive models
CategoryInput.model_rebuild()
CategoryOutput.model_rebuild()

