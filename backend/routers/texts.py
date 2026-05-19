"""Texts API routes. Thin layer: dependencies and controller delegation."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from deps import get_db
from auth import get_current_active_user, require_admin, require_reviewer
from models.user import User
from schemas.text import (
    AdminTextStatistics,
    TextCreate,
    TextUpdate,
    TextResponse,
    TextListResponse,
    TaskSubmissionResponse,
    RecentActivityWithReviewCounts,
    TextPermissionUpsertRequest,
    TextPermissionResponse,
)
from schemas.combined import TextWithAnnotations
from schemas.user_rejected_text import RejectedTextWithDetails

from controllers import texts as texts_controller

router = APIRouter(prefix="/texts", tags=["Texts"])


@router.get("/status-options")
def get_status_options(
    current_user: User = Depends(get_current_active_user),
):
    """Get available text status options."""
    return texts_controller.get_status_options()


@router.get("/", response_model=List[TextListResponse])
def read_texts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    reviewer_id: Optional[int] = Query(None),
    uploaded_by: Optional[str] = Query(None, regex="^(system|user)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get texts list with optional filtering."""
    return texts_controller.read_texts(
        db,
        current_user,
        skip=skip,
        limit=limit,
        status=status,
        language=language,
        reviewer_id=reviewer_id,
        uploaded_by=uploaded_by,
    )


@router.post("/", response_model=TextResponse, status_code=201)
def create_text(
    text_in: TextCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create new text (admin only)."""
    return texts_controller.create_text(db, current_user, text_in)


@router.post("/upload-file", response_model=TextResponse, status_code=201)
def upload_text_file(
    language: str = Form(...),
    file: UploadFile = File(...),
    annotation_type_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload a text file (admin only). Document stays unassigned until an annotator claims it."""
    return texts_controller.upload_text_file(
        db, current_user, annotation_type_id, language, file
    )


@router.post("/parse-diplomatic")
def parse_diplomatic_tei_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Parse a TEI XML file with the diplomatic-only parser; returns extracted diplomatic text. Does not use the full text upload parser."""
    return texts_controller.parse_diplomatic_file(file)


@router.get("/for-annotation", response_model=List[TextResponse])
def get_texts_for_annotation(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get texts available for annotation (initialized status)."""
    return texts_controller.get_texts_for_annotation(
        db, current_user, skip=skip, limit=limit
    )


@router.post("/start-work", response_model=TextResponse)
def start_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Resume work in progress (does not auto-assign a new document)."""
    return texts_controller.start_work(db, current_user)


@router.post("/assign-me", response_model=TextResponse)
def assign_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Claim a new unassigned document (blocked if a task is already in progress)."""
    return texts_controller.assign_me(db, current_user)


@router.post("/skip-text", response_model=TextResponse)
def skip_text(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Skip current text and get next available text."""
    return texts_controller.skip_text(db, current_user)


@router.get("/my-rejected-texts", response_model=List[RejectedTextWithDetails])
def get_my_rejected_texts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all texts that the current user has rejected/skipped."""
    return texts_controller.get_my_rejected_texts(db, current_user)


@router.get("/admin/text-statistics", response_model=AdminTextStatistics)
def get_admin_text_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get comprehensive text statistics for admins."""
    return texts_controller.get_admin_text_statistics(db, current_user)


@router.post("/{text_id}/cancel-work")
def cancel_work(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel work on a text."""
    return texts_controller.cancel_work(db, current_user, text_id)


@router.post("/{text_id}/revert-work")
def revert_work(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revert user work - remove all user annotations and make text available."""
    return texts_controller.revert_work(db, current_user, text_id)


@router.get("/my-work-in-progress", response_model=List[TextResponse])
def get_my_work_in_progress(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get texts that the current user can write to."""
    return texts_controller.get_my_work_in_progress(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/shared-with-me", response_model=List[TextListResponse])
def get_shared_texts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get texts explicitly shared with the current user."""
    return texts_controller.get_shared_texts(
        db, current_user, skip=skip, limit=limit
    )


@router.post("/{text_id}/submit-task", response_model=TaskSubmissionResponse)
def submit_task(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Submit completed task - mark text as annotated and get next task if available."""
    return texts_controller.submit_task(db, current_user, text_id)


@router.post("/{text_id}/update-task", response_model=TextResponse)
def update_task(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a completed task - allows editing previously submitted work."""
    return texts_controller.update_task(db, current_user, text_id)


@router.get("/for-review", response_model=List[TextResponse])
def get_texts_for_review(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Get texts ready for review (annotated status) - Reviewer only."""
    return texts_controller.get_texts_for_review(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/stats")
def get_text_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get text statistics."""
    return texts_controller.get_text_stats(db, current_user)


@router.get("/recent-activity", response_model=List[RecentActivityWithReviewCounts])
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get recent texts annotated or reviewed by the current user with review counts."""
    return texts_controller.get_recent_activity(db, current_user, limit=limit)


@router.get("/user-stats")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get statistics for the current user."""
    return texts_controller.get_user_stats(db, current_user)


@router.get("/search/", response_model=List[TextResponse])
def search_texts(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Search texts by title or content."""
    return texts_controller.search_texts(db, current_user, q, skip=skip, limit=limit)


@router.get("/{text_id}", response_model=TextResponse)
def read_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get text by ID."""
    return texts_controller.read_text(db, current_user, text_id)


@router.get("/{text_id}/with-annotations", response_model=TextWithAnnotations)
def read_text_with_annotations(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get text with its annotations."""
    return texts_controller.read_text_with_annotations(db, current_user, text_id)


@router.get("/{text_id}/diplomatic")
def get_diplomatic_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get diplomatic transcription text for this document (from TEI upload)."""
    return texts_controller.get_diplomatic_text(db, current_user, text_id)


@router.put("/{text_id}", response_model=TextResponse)
def update_text(
    text_id: int,
    text_in: TextUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update text."""
    return texts_controller.update_text(db, current_user, text_id, text_in)


@router.put("/{text_id}/status", response_model=TextResponse)
def update_text_status(
    text_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Update text status - Reviewer only."""
    return texts_controller.update_text_status(
        db, current_user, text_id, new_status
    )


@router.delete("/{text_id}", status_code=204)
def delete_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete text - Admin only (hard delete)."""
    texts_controller.delete_text(db, current_user, text_id)


@router.delete("/{text_id}/my-text", status_code=200)
def soft_delete_my_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Soft delete a text that the current user uploaded. Only uploader can delete."""
    return texts_controller.soft_delete_my_text(db, current_user, text_id)


@router.get("/{text_id}/permissions", response_model=List[TextPermissionResponse])
def list_text_permissions(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List shared permissions for a text (owner/admin only)."""
    return texts_controller.list_text_permissions(db, current_user, text_id)


@router.post("/{text_id}/permissions", response_model=TextPermissionResponse)
def upsert_text_permission(
    text_id: int,
    permission_in: TextPermissionUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Grant or update shared read/write permission for a text (owner/admin only)."""
    return texts_controller.upsert_text_permission(db, current_user, text_id, permission_in)


@router.delete("/{text_id}/permissions/{grantee_user_id}", status_code=200)
def delete_text_permission(
    text_id: int,
    grantee_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revoke shared permission for a user on a text (owner/admin only)."""
    return texts_controller.delete_text_permission(
        db, current_user, text_id, grantee_user_id
    )
