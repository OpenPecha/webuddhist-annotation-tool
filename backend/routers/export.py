"""Export API routes. Thin layer: dependencies and controller delegation."""

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from deps import get_db
from auth import require_admin
from models.user import User

from controllers import export as export_controller

router = APIRouter()


@router.get("/stats")
def get_export_stats(
    from_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    filter_type: str = Query(
        "annotated", description="Filter type: 'reviewed' or 'annotated'"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get statistics for texts and annotations within a date range. Admin only."""
    return export_controller.get_export_stats(
        db, current_user, from_date, to_date, filter_type
    )


@router.get("/text/{text_id}")
def export_single_text(
    text_id: int = Path(..., ge=1, description="Text document ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Download one text and its annotations as JSON. Admin only."""
    return export_controller.export_single_text(db, current_user, text_id)


@router.get("/download")
def export_data(
    from_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    filter_type: str = Query(
        "annotated", description="Filter type: 'reviewed' or 'annotated'"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Export texts and annotations as a ZIP file. Admin only."""
    return export_controller.export_data(
        db, current_user, from_date, to_date, filter_type
    )
