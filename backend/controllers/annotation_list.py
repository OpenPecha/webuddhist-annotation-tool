"""Annotation list route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from crud.annotation_list import annotation_list_crud
from models.user import User
from schemas.annotation_list import (
    AnnotationListCreate,
    AnnotationListUpdate,
    HierarchicalJSONInput,
    AnnotationListBulkCreateResponse,
)


async def upload_annotation_list_file(
    db: Session, current_user: User, file_content: bytes, filename: str
) -> AnnotationListBulkCreateResponse:
    """Upload a JSON file with hierarchical annotation list (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload annotation lists",
        )

    import json

    try:
        json_data = json.loads(file_content)
        hierarchical_data = HierarchicalJSONInput(**json_data)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON file: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create annotation list: {str(e)}",
        )

    root_type = hierarchical_data.title
    root_metadata = {}
    if hierarchical_data.version:
        root_metadata["version"] = hierarchical_data.version
    if hierarchical_data.copyright:
        root_metadata["copyright"] = hierarchical_data.copyright
    if hierarchical_data.description:
        root_metadata["root_description"] = hierarchical_data.description

    try:
        created_ids = annotation_list_crud.create_hierarchical(
            db=db,
            categories=hierarchical_data.categories,
            root_type=root_type,
            created_by=current_user.auth0_user_id,
            root_metadata=root_metadata if root_metadata else None,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create annotation list",
        )

    return AnnotationListBulkCreateResponse(
        success=True,
        message=f"Successfully created {len(created_ids)} annotation list records from file '{filename}'",
        total_records_created=len(created_ids),
        record_ids=created_ids,
        root_type=root_type,
    )


def get_annotation_lists_by_type_flat(
    db: Session, current_user: User, type_value: str
) -> List:
    """Get all annotation lists by type as flat list."""
    items = annotation_list_crud.get_by_type(db=db, type_value=type_value)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation lists found with type '{type_value}'",
        )
    return items


def get_annotation_lists_by_type_hierarchical(
    db: Session, current_user: User, type_id: str
):
    """Get annotation lists by type in hierarchical format."""
    from crud.annotation_type import annotation_type_crud

    at = annotation_type_crud.get(db=db, type_id=type_id)
    if not at or at.is_hidden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation lists found with type '{type_id}'",
        )
    items = annotation_list_crud.get_by_type_id(db=db, type_id=type_id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation lists found with type '{type_id}'",
        )
    return annotation_list_crud.reconstruct_hierarchy(items)


def delete_annotation_lists_by_type(
    db: Session, current_user: User, type_id: str
) -> dict:
    """Delete all annotation lists of a specific type (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete annotation lists",
        )
    deleted_count = annotation_list_crud.delete_by_type(db=db, type_id=type_id)
    return {
        "success": True,
        "message": f"Deleted {deleted_count} annotation list records",
        "deleted_count": deleted_count,
    }


def create_annotation_list_item(
    db: Session, current_user: User, item_in: AnnotationListCreate
):
    """Create a new annotation list item (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create annotation list items",
        )

    from crud.annotation_type import annotation_type_crud

    if item_in.type_id:
        annotation_type = annotation_type_crud.get(db=db, type_id=item_in.type_id)
        if not annotation_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Annotation type with id '{item_in.type_id}' not found",
            )
    elif item_in.type:
        annotation_type = annotation_type_crud.get_or_create(
            db=db,
            name=item_in.type,
            uploader_id=current_user.auth0_user_id,
        )
        item_in.type_id = annotation_type.id

    return annotation_list_crud.create(
        db=db, obj_in=item_in, created_by=current_user.auth0_user_id
    )


def update_annotation_list_item(
    db: Session, current_user: User, item_id: str, item_in: AnnotationListUpdate
):
    """Update an annotation list item (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update annotation list items",
        )
    item = annotation_list_crud.get(db=db, list_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation list item with id '{item_id}' not found",
        )
    try:
        return annotation_list_crud.update(
            db=db, db_obj=item, obj_in=item_in
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


def delete_annotation_list_item(
    db: Session, current_user: User, item_id: str
) -> dict:
    """Delete an annotation list item (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete annotation list items",
        )
    item = annotation_list_crud.get(db=db, list_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation list item with id '{item_id}' not found",
        )
    children = annotation_list_crud.get_children(db=db, parent_id=item_id)
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item with {len(children)} child item(s). Delete children first.",
        )
    success = annotation_list_crud.delete(db=db, list_id=item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete annotation list item",
        )
    return {"success": True, "message": f"Deleted annotation list item '{item_id}'"}


def get_annotation_list_item(db: Session, current_user: User, item_id: str):
    """Get an annotation list item by ID."""
    item = annotation_list_crud.get(db=db, list_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation list item with id '{item_id}' not found",
        )
    return item
