"""Annotation route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from crud.annotation import annotation_crud
from crud.annotation_type import annotation_type_crud
from crud.text import text_crud
from models.user import User
from schemas.annotation import (
    AnnotationCreate,
    AnnotationUpdate,
    BulkCreateAnnotationsRequest,
    BulkDeleteByCriteriaRequest,
)

# Position-only annotation types (line-break, page-break): ensure type exists in DB on first add
POSITION_ANNOTATION_TYPES = ("line-break", "page-break")


def read_annotations(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    text_id: Optional[int] = None,
    annotator_id: Optional[int] = None,
    annotation_type: Optional[str] = None,
) -> List:
    """Get annotations list with optional filtering."""
    return annotation_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        text_id=text_id,
        annotator_id=annotator_id,
        annotation_type=annotation_type,
    )


def create_annotation(
    db: Session, current_user: User, annotation_in: AnnotationCreate
):
    """Create new annotation. Annotator or user who uploaded the text."""
    if current_user.role.value not in ("admin", "annotator"):
        if current_user.role.value == "user":
            text = text_crud.get(db=db, text_id=annotation_in.text_id)
            if not text:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Text not found",
                )
            if text.uploaded_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only annotate texts you uploaded",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role.value}' is not allowed to create annotations",
            )

    # Ensure line-break/page-break annotation types exist in DB (create on first add)
    if annotation_in.annotation_type in POSITION_ANNOTATION_TYPES:
        annotation_type_crud.get_or_create(
            db=db,
            name=annotation_in.annotation_type,
            uploader_id=getattr(current_user, "auth0_user_id", None),
        )

    validation_result = annotation_crud.validate_annotation_positions(
        db=db,
        text_id=annotation_in.text_id,
        start_pos=annotation_in.start_position,
        end_pos=annotation_in.end_position,
    )
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["error"],
        )
    if annotation_in.selected_text is None or annotation_in.selected_text == "":
        annotation_in.selected_text = validation_result["selected_text"]

    return annotation_crud.create(
        db=db, obj_in=annotation_in, annotator_id=current_user.id
    )


def read_my_annotations(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List:
    """Get current user's annotations."""
    return annotation_crud.get_by_annotator(
        db=db, annotator_id=current_user.id, skip=skip, limit=limit
    )


def read_annotations_by_text(db: Session, current_user: User, text_id: int) -> List:
    """Get all annotations for a specific text."""
    return annotation_crud.get_by_text(db=db, text_id=text_id)


def read_annotations_by_type(
    db: Session,
    current_user: User,
    annotation_type: str,
    skip: int = 0,
    limit: int = 100,
) -> List:
    """Get annotations by type."""
    return annotation_crud.get_by_type(
        db=db,
        annotation_type=annotation_type,
        skip=skip,
        limit=limit,
    )


def get_annotation_stats(
    db: Session, current_user: User, text_id: Optional[int] = None
) -> dict:
    """Get annotation statistics."""
    return annotation_crud.get_annotation_stats(db=db, text_id=text_id)


def read_annotation(db: Session, current_user: User, annotation_id: int):
    """Get annotation by ID."""
    annotation = annotation_crud.get(db=db, annotation_id=annotation_id)
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found",
        )
    return annotation


def update_annotation(
    db: Session,
    current_user: User,
    annotation_id: int,
    annotation_in: AnnotationUpdate,
):
    """Update annotation."""
    annotation = annotation_crud.get(db=db, annotation_id=annotation_id)
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found",
        )

    if annotation.annotator_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if annotation_crud.is_annotation_agreed(db=db, annotation_id=annotation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify annotation that has been agreed upon by a reviewer",
        )

    if (
        annotation_in.start_position is not None
        or annotation_in.end_position is not None
    ):
        start_pos = annotation_in.start_position or annotation.start_position
        end_pos = annotation_in.end_position or annotation.end_position
        validation_result = annotation_crud.validate_annotation_positions(
            db=db,
            text_id=annotation.text_id,
            start_pos=start_pos,
            end_pos=end_pos,
            exclude_annotation_id=annotation_id,
        )
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation_result["error"],
            )
        if not annotation_in.selected_text:
            annotation_in.selected_text = validation_result["selected_text"]

    return annotation_crud.update(db=db, db_obj=annotation, obj_in=annotation_in)


def delete_annotation(db: Session, current_user: User, annotation_id: int) -> None:
    """Delete annotation."""
    annotation = annotation_crud.get(db=db, annotation_id=annotation_id)
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found",
        )
    if annotation.annotator_id and annotation.annotator_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if annotation_crud.is_annotation_agreed(db=db, annotation_id=annotation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete annotation that has been agreed upon by a reviewer",
        )
    annotation_crud.delete(db=db, annotation_id=annotation_id)


def delete_my_annotations_for_text(
    db: Session, current_user: User, text_id: int
) -> dict:
    """Delete all of the current user's annotations for a specific text."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    deleted_count = annotation_crud.delete_user_annotations(
        db=db, text_id=text_id, annotator_id=current_user.id
    )
    return {
        "message": f"Successfully deleted {deleted_count} annotation(s)",
        "deleted_count": deleted_count,
    }


def validate_annotation_positions(
    db: Session, current_user: User, text_id: int, start_position: int, end_position: int
) -> dict:
    """Validate annotation positions before creating/updating."""
    return annotation_crud.validate_annotation_positions(
        db=db,
        text_id=text_id,
        start_pos=start_position,
        end_pos=end_position,
    )


def bulk_create_annotations(
    db: Session, current_user: User, body: BulkCreateAnnotationsRequest
) -> dict:
    """Create annotations at all given spans in one request (apply to all). Same permission as create_annotation."""
    if current_user.role.value not in ("admin", "annotator"):
        if current_user.role.value == "user":
            text = text_crud.get(db=db, text_id=body.text_id)
            if not text:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Text not found",
                )
            if text.uploaded_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only annotate texts you uploaded",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role.value}' is not allowed to create annotations",
            )

    spans_tuples = [(s.start_position, s.end_position) for s in body.spans]
    created = annotation_crud.create_many(
        db=db,
        text_id=body.text_id,
        annotation_type=body.annotation_type,
        label=body.label,
        name=body.name,
        level=body.level,
        selected_text=body.selected_text,
        spans=spans_tuples,
        annotator_id=current_user.id,
    )
    return {"created_count": len(created)}


def bulk_delete_annotations(
    db: Session, current_user: User, body: BulkDeleteByCriteriaRequest
) -> dict:
    """Delete all annotations matching criteria (non-agreed, current user's only)."""
    text = text_crud.get(db=db, text_id=body.text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if current_user.role.value not in ("admin", "annotator"):
        if current_user.role.value == "user" and text.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    deleted_count = annotation_crud.delete_by_criteria(
        db=db,
        text_id=body.text_id,
        annotation_type=body.annotation_type,
        label=body.label,
        selected_text=body.selected_text,
        annotator_id=current_user.id,
    )
    return {"deleted_count": deleted_count}
