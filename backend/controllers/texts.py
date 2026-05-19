"""Text route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func

from crud.text import text_crud
from crud.annotation import annotation_crud
from crud.annotation_type import annotation_type_crud
from crud.annotation_list import annotation_list_crud
from crud.user_rejected_text import user_rejected_text_crud
from models.user import User
from models.text import VALID_STATUSES, INITIALIZED, ANNOTATED, REVIEWED, SKIPPED, PROGRESS
from models.user_rejected_text import UserRejectedText
from schemas.text import (
    TextCreate,
    TextUpdate,
    TaskSubmissionResponse,
    RecentActivityWithReviewCounts,
    TextPermissionUpsertRequest,
)
from schemas.annotation import AnnotationCreate
from schemas.combined import TextWithAnnotations
from schemas.user_rejected_text import RejectedTextWithDetails
from utils.tei_parser import parse_tei, TEIAnnotation
from utils.diplomatic_parser import extract_raw_text_section


def get_status_options() -> dict:
    """Return available text status options."""
    return {
        "status_options": VALID_STATUSES,
        "status_constants": {
            "INITIALIZED": INITIALIZED,
            "ANNOTATED": ANNOTATED,
            "REVIEWED": REVIEWED,
            "SKIPPED": SKIPPED,
            "PROGRESS": PROGRESS,
        },
    }


def read_texts(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    language: Optional[str] = None,
    reviewer_id: Optional[int] = None,
    uploaded_by: Optional[str] = None,
) -> List:
    """Get texts list with optional filtering."""
    if status is not None and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )

    return text_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        language=language,
        reviewer_id=reviewer_id,
        uploaded_by=uploaded_by,
    )


def create_text(db: Session, current_user: User, text_in: TextCreate):
    """Create new text. Admin only; texts are not auto-assigned."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create texts",
        )

    existing_text = text_crud.get_by_title(db=db, title=text_in.title)
    if existing_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text with title '{text_in.title}' already exists",
        )

    text_in.uploaded_by = current_user.id
    return text_crud.create(db=db, obj_in=text_in)


def _is_tei_xml(filename: str, content: str) -> bool:
    """Detect if content is TEI XML by filename or root element."""
    if filename and filename.lower().endswith(".xml"):
        return True
    content_stripped = content.strip()
    if content_stripped.startswith("<?xml") or content_stripped.startswith("<"):
        return "<TEI" in content_stripped[:200] or "<tei" in content_stripped[:200]
    return False


def upload_text_file(
    db: Session, current_user: User, annotation_type_id: Optional[str], language: str, file: UploadFile
):
    """Upload a text file and create a new text record. Admin only; not auto-assigned."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can upload text files",
        )

    is_xml = (
        file.content_type in ("text/xml", "application/xml")
        or (file.filename and file.filename.lower().endswith(".xml"))
    )
    is_text = file.content_type and file.content_type.startswith("text/")
    if not is_text and not is_xml:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only text files (.txt, .md) or TEI XML (.xml) are allowed",
        )

    if not is_xml and not annotation_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Annotation type is required for non-XML uploads",
        )

    try:
        raw_content = file.file.read().decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be valid UTF-8 encoded text",
        )

    filename = file.filename or ""
    tei_annotations: list[TEIAnnotation] = []
    tei_editorial_annotations: list[TEIAnnotation] = []
    diplomatic_text: Optional[str] = None
    primary_annotation_type_id: Optional[str] = None
    selected_type_name: Optional[str] = None

    current_time = datetime.now().strftime("%Y%m%d_%H%M%S")

    if _is_tei_xml(filename, raw_content):
        try:
            parsed = parse_tei(raw_content, filename)
            title = f"{parsed.title}_{current_time}"
            content = parsed.content
            tei_annotations = parsed.annotations  # POS from annotated layer
            tei_editorial_annotations = parsed.editorial_annotations  # add, unclear, hi, decoration
            source = parsed.source
            # Diplomatic text is not taken from XML; user adds it in the text workspace
            diplomatic_text = None
            pos_values = getattr(parsed, "pos_values", None) or set()
            editorial_labels = getattr(parsed, "editorial_labels", None) or set()
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid TEI XML: {e}",
            ) from e
        else:
            uploader_id = getattr(current_user, "auth0_user_id", None)
            pos_type_id: Optional[str] = None
            editorial_type_id: Optional[str] = None
            if pos_values:
                pos_type_id = annotation_list_crud.ensure_annotation_list_values(
                    db=db, type_name="pos", values=pos_values, created_by=uploader_id
                )
            if editorial_labels:
                editorial_type_id = annotation_list_crud.ensure_annotation_list_values(
                    db=db, type_name="tei_editorial", values=editorial_labels, created_by=uploader_id
                )
                selected_type_name = "tei_editorial"
            primary_annotation_type_id = pos_type_id or editorial_type_id
    else:
        base_title = filename.rsplit(".", 1)[0] if filename else "Uploaded Text"
        title = f"{base_title}_{current_time}"
        content = raw_content
        source = filename
        primary_annotation_type_id = annotation_type_id
        at = annotation_type_crud.get(db=db, type_id=annotation_type_id) if annotation_type_id else None
        if at:
            selected_type_name = at.name

    text_create = TextCreate(
        title=title,
        content=content,
        source=source,
        language=language,
        annotation_type_id=primary_annotation_type_id,
        uploaded_by=current_user.id,
        diplomatic_text=diplomatic_text,
    )

    try:
        created_text = text_crud.create(db=db, obj_in=text_create)
        # Resolve selected annotation type name for editorial annotations (non-XML path already set above)
        if _is_tei_xml(filename, raw_content) and not selected_type_name and tei_editorial_annotations:
            selected_type_name = "tei_editorial"
        if not selected_type_name and primary_annotation_type_id:
            at = annotation_type_crud.get(db=db, type_id=primary_annotation_type_id)
            if at:
                selected_type_name = at.name
        # Create POS annotations from TEI annotated layer (output_combined style) in one commit.
        pos_creates = [
            AnnotationCreate(
                text_id=created_text.id,
                annotation_type="pos",
                start_position=ann.start_position,
                end_position=ann.end_position,
                selected_text=ann.selected_text,
                label=ann.label,
                meta=ann.meta,
            )
            for ann in tei_annotations
        ]
        annotation_crud.create_many_in_one_commit(
            db=db,
            items=pos_creates,
            annotator_id=None,
            text_id=created_text.id,
            set_text_progress=False,
        )
        # Create editorial annotations (add, unclear, hi, decoration) with selected type in one commit.
        if tei_editorial_annotations and selected_type_name:
            editorial_creates = []
            for ann in tei_editorial_annotations:
                meta = ann.meta or {}
                if ann.label:
                    meta["tei_element"] = ann.label
                editorial_creates.append(
                    AnnotationCreate(
                        text_id=created_text.id,
                        annotation_type=selected_type_name,
                        start_position=ann.start_position,
                        end_position=ann.end_position,
                        selected_text=ann.selected_text,
                        label=ann.label,
                        meta=meta,
                    )
                )
            annotation_crud.create_many_in_one_commit(
                db=db,
                items=editorial_creates,
                annotator_id=None,
                text_id=created_text.id,
                set_text_progress=False,
            )
        # Attach annotation types for frontend filter selection (XML upload only)
        types_created: List[str] = []
        if tei_annotations:
            types_created.append("pos")
        if tei_editorial_annotations and selected_type_name:
            if selected_type_name not in types_created:
                types_created.append(selected_type_name)
        if types_created:
            setattr(created_text, "annotation_types_created", types_created)
        return created_text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}",
        )


def get_texts_for_annotation(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List:
    """Get texts available for annotation (initialized status)."""
    return text_crud.get_texts_for_annotation(
        db=db,
        skip=skip,
        limit=limit,
        user_id=current_user.id,
        user_role=current_user.role.value,
    )


def start_work(db: Session, current_user: User):
    """Resume work in progress only (does not auto-assign new texts)."""
    text = text_crud.start_work(
        db=db, user_id=current_user.id, user_role=current_user.role.value
    )
    if not text:
        if current_user.role.value == "annotator":
            detail = (
                "No task in progress. Use Assign me to claim an unassigned document."
            )
        else:
            detail = "No work in progress."
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return text


def assign_me(db: Session, current_user: User):
    """Claim a new unassigned document for the current annotator."""
    if current_user.role.value not in ("annotator", "admin", "reviewer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role.value}' cannot claim annotation tasks",
        )


    text = text_crud.assign_me(
        db=db, user_id=current_user.id, user_role=current_user.role.value
    )
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No unassigned documents available at this time.",
        )
    return text


def skip_text(db: Session, current_user: User):
    """Skip current text and release it for other annotators."""
    current = text_crud.get_work_in_progress(
        db=db, user_id=current_user.id, user_role=current_user.role.value
    )
    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No text in progress to skip.",
        )

    text_crud.skip_text(
        db=db, user_id=current_user.id, user_role=current_user.role.value
    )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Text skipped. Use Assign me on the dashboard to claim another document.",
    )


def get_my_rejected_texts(db: Session, current_user: User) -> List[RejectedTextWithDetails]:
    """Get all texts the current user has rejected/skipped."""
    rejected_texts = user_rejected_text_crud.get_user_rejected_texts(
        db=db, user_id=current_user.id
    )
    result = []
    for rejection in rejected_texts:
        text = text_crud.get(db=db, text_id=rejection.text_id)
        if text:
            result.append(
                RejectedTextWithDetails(
                    id=rejection.id,
                    text_id=text.id,
                    text_title=text.title,
                    text_language=text.language,
                    rejected_at=rejection.rejected_at,
                )
            )
    return result


def get_admin_text_statistics(db: Session, current_user: User) -> dict:
    """Get comprehensive text statistics for admins."""
    from models.user import User as UserModel, UserRole
    from models.text import REVIEWED_NEEDS_REVISION, Text

    stats = text_crud.get_stats(db)
    total_rejections = db.query(UserRejectedText).count()
    unique_rejected_texts = db.query(UserRejectedText.text_id).distinct().count()
    total_users = db.query(UserModel).filter(UserModel.is_active == True).count()
    heavily_rejected_texts = (
        db.query(UserRejectedText.text_id)
        .group_by(UserRejectedText.text_id)
        .having(func.count(UserRejectedText.user_id) >= max(1, total_users * 0.5))
        .count()
    )
    staff_roles = [UserRole.ADMIN, UserRole.ANNOTATOR, UserRole.REVIEWER]
    role_counts = {"admin": 0, "annotator": 0, "reviewer": 0}
    staff_work_totals = {
        "texts_annotated": 0,
        "reviews_completed": 0,
        "work_in_progress": 0,
        "uploaded_files": 0,
    }
    staff_details = []

    active_staff_users = (
        db.query(UserModel)
        .filter(UserModel.is_active == True, UserModel.role.in_(staff_roles))
        .all()
    )

    for staff_user in active_staff_users:
        role_value = (
            staff_user.role.value
            if hasattr(staff_user.role, "value")
            else str(staff_user.role)
        )
        role_counts[role_value] = role_counts.get(role_value, 0) + 1

        texts_annotated = (
            db.query(Text)
            .filter(
                Text.deleted_at.is_(None),
                Text.annotator_id == staff_user.id,
                Text.status.in_([ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION]),
            )
            .count()
        )
        reviews_completed = (
            db.query(Text)
            .filter(
                Text.deleted_at.is_(None),
                Text.reviewer_id == staff_user.id,
                Text.status == REVIEWED,
            )
            .count()
        )
        work_in_progress = (
            db.query(Text)
            .filter(
                Text.deleted_at.is_(None),
                Text.annotator_id == staff_user.id,
                Text.status == PROGRESS,
            )
            .count()
        )
        uploaded_files = (
            db.query(Text)
            .filter(
                Text.deleted_at.is_(None),
                Text.uploaded_by == staff_user.id,
            )
            .count()
        )

        staff_work_totals["texts_annotated"] += texts_annotated
        staff_work_totals["reviews_completed"] += reviews_completed
        staff_work_totals["work_in_progress"] += work_in_progress
        staff_work_totals["uploaded_files"] += uploaded_files

        staff_details.append(
            {
                "id": staff_user.id,
                "username": staff_user.username,
                "full_name": staff_user.full_name,
                "role": role_value,
                "texts_annotated": texts_annotated,
                "reviews_completed": reviews_completed,
                "work_in_progress": work_in_progress,
                "uploaded_files": uploaded_files,
            }
        )

    role_sort_order = {"admin": 0, "reviewer": 1, "annotator": 2}
    staff_details.sort(
        key=lambda item: (
            role_sort_order.get(item["role"], 99),
            (item.get("full_name") or item["username"]).lower(),
        )
    )
    completion_rate = round((stats["reviewed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0.0
    rejection_rate = (
        round((unique_rejected_texts / stats["total"]) * 100, 1)
        if stats["total"] > 0
        else 0.0
    )
    avg_rejections_per_text = (
        round(total_rejections / unique_rejected_texts, 1)
        if unique_rejected_texts > 0
        else 0.0
    )

    return {
        **stats,
        "total_rejections": total_rejections,
        "unique_rejected_texts": unique_rejected_texts,
        "heavily_rejected_texts": heavily_rejected_texts,
        "total_active_users": total_users,
        "total_staff_users": len(active_staff_users),
        "staff_role_counts": role_counts,
        "staff_work_totals": staff_work_totals,
        "staff_details": staff_details,
        "completion_rate": completion_rate,
        "rejection_rate": rejection_rate,
        "avg_rejections_per_text": avg_rejections_per_text,
        "available_for_new_users": stats["initialized"] - heavily_rejected_texts
        if stats["initialized"] > heavily_rejected_texts
        else 0,
    }


def cancel_work(db: Session, current_user: User, text_id: int) -> dict:
    """Cancel work on a text."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    text_crud.cancel_work(db=db, text_id=text_id, user_id=current_user.id)
    return {"message": "Work cancelled successfully"}


def revert_work(db: Session, current_user: User, text_id: int) -> dict:
    """Revert user work: remove all user annotations and make text available."""
    from crud.annotation import annotation_crud

    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revert work on texts you were assigned to",
        )
    if text.status not in (ANNOTATED, REVIEWED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only revert completed work. Current status: {text.status}",
        )
    deleted_count = annotation_crud.delete_user_annotations(
        db=db, text_id=text_id, annotator_id=current_user.id
    )
    return {"message": f"Work reverted successfully. Removed {deleted_count} annotations."}


def get_my_work_in_progress(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List:
    """Get all texts the current user can write to (owned, assigned, or shared-write)."""
    return text_crud.get_user_work_in_progress(
        db=db,
        user_id=current_user.id,
        user_role=current_user.role.value,
        skip=skip,
        limit=limit,
    )


def get_shared_texts(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List:
    """Get texts explicitly shared with the current user (read or write)."""
    return text_crud.get_shared_texts(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


def submit_task(db: Session, current_user: User, text_id: int) -> TaskSubmissionResponse:
    """Submit completed task and optionally get next task."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit tasks you are assigned to",
        )
    if text.status != PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text must be in progress status to submit. Current status: {text.status}",
        )

    submitted_task = text_crud.update_status(
        db=db, text_id=text_id, status=ANNOTATED
    )
    next_task = text_crud.start_work(
        db=db, user_id=current_user.id, user_role=current_user.role.value
    )

    if next_task:
        message = f"Task submitted successfully! Next task: '{next_task.title}'"
    else:
        message = "Task submitted successfully! No more tasks available at this time."

    return TaskSubmissionResponse(
        submitted_task=submitted_task,
        next_task=next_task,
        message=message,
    )


def update_task(db: Session, current_user: User, text_id: int):
    """Update a completed task (edit previously submitted work)."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks you were assigned to",
        )
    if text.status not in (ANNOTATED, REVIEWED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only update completed tasks. Current status: {text.status}",
        )
    return text_crud.update_status(
        db=db, text_id=text_id, status=ANNOTATED
    )


def get_texts_for_review(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List:
    """Get texts ready for review (reviewer only)."""
    return text_crud.get_texts_for_review(
        db=db, skip=skip, limit=limit, reviewer_id=current_user.id
    )


def get_text_stats(db: Session, current_user: User) -> dict:
    """Get text statistics."""
    return text_crud.get_stats(db=db)


def get_recent_activity(
    db: Session, current_user: User, limit: int = 10
) -> List[RecentActivityWithReviewCounts]:
    """Get recent activity with review counts."""
    return text_crud.get_recent_activity_with_review_counts(
        db=db,
        user_id=current_user.id,
        limit=limit,
        user_role=current_user.role.value,
    )


def get_user_stats(db: Session, current_user: User) -> dict:
    """Get statistics for the current user."""
    return text_crud.get_user_stats(db=db, user_id=current_user.id)


def search_texts(
    db: Session, current_user: User, q: str, skip: int = 0, limit: int = 100
) -> List:
    """Search texts by title or content."""
    return text_crud.search(db=db, query=q, skip=skip, limit=limit)


def read_text(db: Session, current_user: User, text_id: int):
    """Get text by ID."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    return text


def get_diplomatic_text(db: Session, current_user: User, text_id: int) -> dict:
    """Get diplomatic text for a text (from TEI div subtype=diplomatic)."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    return {"diplomatic_text": getattr(text, "diplomatic_text", None)}


def parse_diplomatic_file(file: UploadFile) -> dict:
    """Extract raw XML from <text> to </text> (inclusive) and return it. No parsing; save directly to DB."""
    filename = file.filename or ""
    if not (filename.lower().endswith(".xml") or file.content_type in ("text/xml", "application/xml")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be TEI XML (.xml)",
        )
    raw = file.file.read()
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded",
        )
    diplomatic_text = extract_raw_text_section(content)
    if diplomatic_text is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TEI document has no <text> section",
        )
    return {"diplomatic_text": diplomatic_text}


def read_text_with_annotations(
    db: Session, current_user: User, text_id: int
) -> TextWithAnnotations:
    """Get text with its annotations."""
    text = text_crud.get_with_annotations(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    text.current_user_permission = text_crud.get_effective_text_permission(
        db=db,
        user_id=current_user.id,
        text=text,
        role=current_user.role.value,
    )
    return text


def update_text(db: Session, current_user: User, text_id: int, text_in: TextUpdate):
    """Update text."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    return text_crud.update(db=db, db_obj=text, obj_in=text_in)


def update_text_status(
    db: Session, current_user: User, text_id: int, new_status: str
):
    """Update text status (reviewer only)."""
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    reviewer_id = current_user.id if new_status == REVIEWED else None
    return text_crud.update_status(
        db=db,
        text_id=text_id,
        status=new_status,
        reviewer_id=reviewer_id,
    )


def delete_text(db: Session, current_user: User, text_id: int) -> None:
    """Delete text (admin only - hard delete)."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    text_crud.delete(db=db, text_id=text_id)


def soft_delete_my_text(db: Session, current_user: User, text_id: int):
    """Soft delete a text that the current user uploaded (user only)."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete texts you uploaded",
        )
    text_crud.soft_delete(db=db, text_id=text_id)
    return {"message": "Text deleted successfully"}


def _ensure_share_manager(current_user: User, text) -> None:
    if current_user.role.value == "admin":
        return
    if text.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only text owner can manage sharing permissions",
        )


def upsert_text_permission(
    db: Session,
    current_user: User,
    text_id: int,
    permission_in: TextPermissionUpsertRequest,
):
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    _ensure_share_manager(current_user, text)
    if permission_in.grantee_user_id == text.uploaded_by:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner already has write permission",
        )
    return text_crud.upsert_permission(
        db=db,
        text_id=text_id,
        owner_user_id=current_user.id,
        grantee_user_id=permission_in.grantee_user_id,
        permission=permission_in.permission,
    )


def list_text_permissions(db: Session, current_user: User, text_id: int):
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    _ensure_share_manager(current_user, text)
    permissions = text_crud.list_permissions_for_text(db=db, text_id=text_id)
    if not permissions:
        # keep return shape stable for clients
        return []
    return permissions


def delete_text_permission(
    db: Session, current_user: User, text_id: int, grantee_user_id: int
):
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    _ensure_share_manager(current_user, text)
    removed = text_crud.remove_permission(
        db=db, text_id=text_id, grantee_user_id=grantee_user_id
    )
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission entry not found",
        )
    return {"message": "Permission removed"}
