"""Annotations API routes. Thin layer: dependencies and controller delegation."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from deps import get_db
from auth import get_current_active_user
from models.user import User
from schemas.annotation import (
    AnnotationCreate,
    AnnotationUpdate,
    AnnotationResponse,
    ValidatePositionsRequest,
    BulkCreateAnnotationsRequest,
    BulkDeleteByCriteriaRequest,
)

from controllers import annotations as annotations_controller

router = APIRouter(prefix="/annotations", tags=["Annotations"])


@router.get("/", response_model=List[AnnotationResponse])
def read_annotations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    text_id: Optional[int] = Query(None),
    annotator_id: Optional[int] = Query(None),
    annotation_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get annotations list with optional filtering."""
    return annotations_controller.read_annotations(
        db,
        current_user,
        skip=skip,
        limit=limit,
        text_id=text_id,
        annotator_id=annotator_id,
        annotation_type=annotation_type,
    )


@router.post("/", response_model=AnnotationResponse, status_code=201)
def create_annotation(
    annotation_in: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create new annotation."""
    return annotations_controller.create_annotation(
        db, current_user, annotation_in
    )


@router.get("/my-annotations", response_model=List[AnnotationResponse])
def read_my_annotations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's annotations."""
    return annotations_controller.read_my_annotations(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/text/{text_id}", response_model=List[AnnotationResponse])
def read_annotations_by_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all annotations for a specific text."""
    return annotations_controller.read_annotations_by_text(
        db, current_user, text_id
    )


@router.get("/type/{annotation_type}", response_model=List[AnnotationResponse])
def read_annotations_by_type(
    annotation_type: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get annotations by type."""
    return annotations_controller.read_annotations_by_type(
        db, current_user, annotation_type, skip=skip, limit=limit
    )


@router.get("/stats")
def get_annotation_stats(
    text_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get annotation statistics."""
    return annotations_controller.get_annotation_stats(
        db, current_user, text_id=text_id
    )


@router.get("/{annotation_id}", response_model=AnnotationResponse)
def read_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get annotation by ID."""
    return annotations_controller.read_annotation(
        db, current_user, annotation_id
    )


@router.put("/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation_in: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update annotation."""
    return annotations_controller.update_annotation(
        db, current_user, annotation_id, annotation_in
    )


@router.delete("/{annotation_id}", status_code=204)
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete annotation."""
    annotations_controller.delete_annotation(db, current_user, annotation_id)


@router.delete("/text/{text_id}/my-annotations")
def delete_my_annotations_for_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete all of the current user's annotations for a specific text."""
    return annotations_controller.delete_my_annotations_for_text(
        db, current_user, text_id
    )


@router.post("/validate-positions")
def validate_annotation_positions(
    body: ValidatePositionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Validate annotation positions before creating/updating."""
    return annotations_controller.validate_annotation_positions(
        db,
        current_user,
        body.text_id,
        body.start_position,
        body.end_position,
    )


@router.post("/bulk-create")
def bulk_create_annotations(
    body: BulkCreateAnnotationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create annotations at all given spans in one request (apply to all)."""
    return annotations_controller.bulk_create_annotations(db, current_user, body)


@router.post("/bulk-delete")
def bulk_delete_annotations(
    body: BulkDeleteByCriteriaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete all annotations matching type/label/selected_text for the text (delete from all)."""
    return annotations_controller.bulk_delete_annotations(db, current_user, body)
