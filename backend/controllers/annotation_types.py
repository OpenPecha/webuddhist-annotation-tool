"""Annotation type route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from crud.annotation_type import annotation_type_crud
from models.user import User
from schemas.annotation_type import (
    AnnotationTypeCreate,
    AnnotationTypeUpdate,
)


def create_annotation_type(
    db: Session, current_user: User, annotation_type_in: AnnotationTypeCreate
):
    """Create a new annotation type (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create annotation types",
        )
    existing = annotation_type_crud.get_by_name(db=db, name=annotation_type_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Annotation type with name '{annotation_type_in.name}' already exists",
        )
    annotation_type_in.uploader_id = current_user.auth0_user_id
    return annotation_type_crud.create(db=db, obj_in=annotation_type_in)


def get_all_annotation_types(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List:
    """Get all annotation types with pagination."""
    return annotation_type_crud.get_all(db=db, skip=skip, limit=limit)


def get_annotation_type(db: Session, current_user: User, type_id: str):
    """Get a specific annotation type by ID."""
    annotation_type = annotation_type_crud.get(db=db, type_id=type_id)
    if not annotation_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with id '{type_id}' not found",
        )
    return annotation_type


def get_annotation_type_by_name(db: Session, current_user: User, name: str):
    """Get a specific annotation type by name."""
    annotation_type = annotation_type_crud.get_by_name(db=db, name=name)
    if not annotation_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with name '{name}' not found",
        )
    return annotation_type


def update_annotation_type(
    db: Session,
    current_user: User,
    type_id: str,
    annotation_type_in: AnnotationTypeUpdate,
):
    """Update an annotation type (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update annotation types",
        )
    if annotation_type_in.name:
        existing = annotation_type_crud.get_by_name(
            db=db, name=annotation_type_in.name
        )
        if existing and existing.id != type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Annotation type with name '{annotation_type_in.name}' already exists",
            )
    updated = annotation_type_crud.update(
        db=db, type_id=type_id, obj_in=annotation_type_in
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with id '{type_id}' not found",
        )
    return updated


def delete_annotation_type(
    db: Session, current_user: User, type_id: str
) -> dict:
    """Soft-delete an annotation type (admin only). Hides from annotators/reviewers."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete annotation types",
        )
    success = annotation_type_crud.soft_delete(db=db, type_id=type_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with id '{type_id}' not found",
        )
    return {"success": True, "message": "Annotation type deleted successfully"}
