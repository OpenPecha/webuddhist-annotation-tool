"""Annotation lists API routes. Thin layer: dependencies and controller delegation."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from deps import get_db
from auth import get_current_active_user
from models.user import User
from schemas.annotation_list import (
    AnnotationListResponse,
    AnnotationListCreate,
    AnnotationListUpdate,
    HierarchicalJSONOutput,
    AnnotationListBulkCreateResponse,
)

from controllers import annotation_list as annotation_list_controller

router = APIRouter(prefix="/annotation-lists", tags=["Annotation Lists"])


@router.get("/", response_model=List[AnnotationListResponse])
def get_annotation_lists(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: Optional[str] = Query(None),
    created_by: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get annotation lists with optional type and creator filtering."""
    return annotation_list_controller.get_annotation_lists(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        type_filter=type,
        created_by=created_by,
    )


@router.post("/upload", response_model=AnnotationListBulkCreateResponse, status_code=201)
async def upload_annotation_list_file(
    file: UploadFile = File(..., description="JSON file with hierarchical annotation list"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a JSON file with hierarchical annotation list. Admin only."""
    content = await file.read()
    return await annotation_list_controller.upload_annotation_list_file(
        db, current_user, content, file.filename or "unknown"
    )


@router.get("/type/{type_value}/flat", response_model=List[AnnotationListResponse])
def get_annotation_lists_by_type_flat(
    type_value: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all annotation lists by type as flat list."""
    return annotation_list_controller.get_annotation_lists_by_type_flat(
        db, current_user, type_value
    )


@router.get("/type/{type_id}", response_model=HierarchicalJSONOutput)
def get_annotation_lists_by_type_hierarchical(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get annotation lists by type in original hierarchical format."""
    return annotation_list_controller.get_annotation_lists_by_type_hierarchical(
        db, current_user, type_id
    )


@router.delete("/type/{type_id}")
def delete_annotation_lists_by_type(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete all annotation lists of a specific type. Admin only."""
    return annotation_list_controller.delete_annotation_lists_by_type(
        db, current_user, type_id
    )


@router.post("/", response_model=AnnotationListResponse, status_code=201)
def create_annotation_list_item(
    item_in: AnnotationListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new annotation list item. Admin only."""
    return annotation_list_controller.create_annotation_list_item(
        db, current_user, item_in
    )


@router.put("/{item_id}", response_model=AnnotationListResponse)
def update_annotation_list_item(
    item_id: str,
    item_in: AnnotationListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an annotation list item. Admin only."""
    return annotation_list_controller.update_annotation_list_item(
        db, current_user, item_id, item_in
    )


@router.delete("/{item_id}")
def delete_annotation_list_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an annotation list item. Admin only."""
    return annotation_list_controller.delete_annotation_list_item(
        db, current_user, item_id
    )


@router.get("/{item_id}", response_model=AnnotationListResponse)
def get_annotation_list_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get an annotation list item by ID."""
    return annotation_list_controller.get_annotation_list_item(
        db, current_user, item_id
    )
