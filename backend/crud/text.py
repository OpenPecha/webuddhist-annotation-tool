from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import func, and_, exists, select, or_
from models.text import Text, INITIALIZED, ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION, SKIPPED, PROGRESS, VALID_STATUSES
from models.text_permission import TextPermission, TEXT_PERMISSION_READ, TEXT_PERMISSION_WRITE
from models.annotation import Annotation
from schemas.text import TextCreate, TextListResponse, TextUpdate


class TextCRUD:
    def upsert_permission(
        self,
        db: Session,
        text_id: int,
        owner_user_id: int,
        grantee_user_id: int,
        permission: str,
    ) -> TextPermission:
        existing = (
            db.query(TextPermission)
            .filter(
                TextPermission.text_id == text_id,
                TextPermission.grantee_user_id == grantee_user_id,
            )
            .first()
        )
        if existing:
            existing.permission = permission
            existing.owner_user_id = owner_user_id
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

        db_obj = TextPermission(
            text_id=text_id,
            owner_user_id=owner_user_id,
            grantee_user_id=grantee_user_id,
            permission=permission,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_permission(self, db: Session, text_id: int, grantee_user_id: int) -> bool:
        db_obj = (
            db.query(TextPermission)
            .filter(
                TextPermission.text_id == text_id,
                TextPermission.grantee_user_id == grantee_user_id,
            )
            .first()
        )
        if not db_obj:
            return False
        db.delete(db_obj)
        db.commit()
        return True

    def list_permissions_for_text(self, db: Session, text_id: int) -> List[TextPermission]:
        return (
            db.query(TextPermission)
            .options(joinedload(TextPermission.grantee))
            .filter(TextPermission.text_id == text_id)
            .all()
        )

    def get_effective_text_permission(self, db: Session, user_id: int, text: Text, role: str) -> str:
        if role == "admin":
            return TEXT_PERMISSION_WRITE
        if text.uploaded_by == user_id:
            return TEXT_PERMISSION_WRITE

        shared = (
            db.query(TextPermission)
            .filter(
                TextPermission.text_id == text.id,
                TextPermission.grantee_user_id == user_id,
            )
            .first()
        )
        if shared:
            return shared.permission
        return TEXT_PERMISSION_READ

    def can_write_text(self, db: Session, user_id: int, text: Text, role: str) -> bool:
        return self.get_effective_text_permission(db, user_id, text, role) == TEXT_PERMISSION_WRITE

    def create(self, db: Session, obj_in: TextCreate) -> Text:
        """Create a new text."""
        db_obj = Text(
            title=obj_in.title,
            content=obj_in.content,
            translation=obj_in.translation,
            diplomatic_text=obj_in.diplomatic_text,
            source=obj_in.source,
            language=obj_in.language,
            uploaded_by=obj_in.uploaded_by,
            annotation_type_id=obj_in.annotation_type_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def _not_deleted(self, query):
        """Filter out soft-deleted texts."""
        return query.filter(Text.deleted_at.is_(None))

    def get(self, db: Session, text_id: int) -> Optional[Text]:
        """Get text by ID with user relationships."""
        return self._not_deleted(db.query(Text)).options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader)
        ).filter(Text.id == text_id).first()

    def get_with_annotations(self, db: Session, text_id: int) -> Optional[Text]:
        """Get text with its annotations."""
        return self._not_deleted(db.query(Text)).options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader)
        ).filter(Text.id == text_id).first()

    def get_by_title(self, db: Session, title: str) -> Optional[Text]:
        """Get text by title."""
        return self._not_deleted(db.query(Text)).filter(Text.title == title).first()

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None,
        language: Optional[str] = None,
        reviewer_id: Optional[int] = None,
        uploaded_by: Optional[str] = None
    ) -> List[TextListResponse]:
        """Get multiple texts with optional filtering and user relationships.
        Excludes content and translation fields for better performance."""
        query = self._not_deleted(db.query(Text)).options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader),
            defer(Text.content),
            defer(Text.translation)
        )
        
        if status:
            query = query.filter(Text.status == status)
        
        if language:
            query = query.filter(Text.language == language)
            
        if reviewer_id:
            query = query.filter(Text.reviewer_id == reviewer_id)
        
        if uploaded_by is not None:
            if uploaded_by == "system":
                # Filter for system texts (uploaded_by is null)
                query = query.filter(Text.uploaded_by.is_(None))
            elif uploaded_by == "user":
                # Filter for user-uploaded texts (uploaded_by is not null)
                query = query.filter(Text.uploaded_by.isnot(None))
        
        return query.offset(skip).limit(limit).all()

    def get_texts_with_annotation_count(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[dict]:
        """Get texts with annotation count."""
        query = db.query(
            Text,
            func.count(Annotation.id).label('annotations_count')
        ).outerjoin(Annotation).group_by(Text.id)
        
        if status:
            query = query.filter(Text.status == status)
        
        results = query.offset(skip).limit(limit).all()
        
        return [
            {
                "text": text,
                "annotations_count": count
            }
            for text, count in results
        ]

    def update(self, db: Session, db_obj: Text, obj_in: TextUpdate) -> Text:
        """Update text."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in obj_data.items():
            # Validate status if being updated
            if field == 'status' and value is not None:
                if value not in VALID_STATUSES:
                    raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_status(self, db: Session, text_id: int, status: str, reviewer_id: Optional[int] = None) -> Optional[Text]:
        """Update text status."""
        db_obj = self._not_deleted(db.query(Text)).filter(Text.id == text_id).first()
        if db_obj:
            db_obj.status = status
            if reviewer_id:
                db_obj.reviewer_id = reviewer_id
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, text_id: int) -> Optional[Text]:
        """Hard delete text (admin only - removes record)."""
        obj = db.query(Text).filter(Text.id == text_id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj

    def soft_delete(self, db: Session, text_id: int) -> Optional[Text]:
        """Soft delete text - set deleted_at timestamp."""
        obj = db.query(Text).filter(Text.id == text_id).first()
        if obj:
            obj.deleted_at = datetime.now(timezone.utc)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def search(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List[Text]:
        """Search texts by title or content."""
        search_filter = Text.title.contains(query) | Text.content.contains(query)
        return self._not_deleted(db.query(Text)).filter(search_filter).offset(skip).limit(limit).all()

    def get_by_status(self, db: Session, status: str, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts by status."""
        return self._not_deleted(db.query(Text)).filter(Text.status == status).offset(skip).limit(limit).all()

    def get_texts_for_annotation(self, db: Session, skip: int = 0, limit: int = 100, user_id: int = None, user_role: str = None) -> List[Text]:
        """Get texts available for annotation (initialized status or needs revision)."""
        from models.text import REVIEWED_NEEDS_REVISION
        query = self._not_deleted(db.query(Text)).options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader)
        ).filter(
            Text.status.in_([INITIALIZED, REVIEWED_NEEDS_REVISION])
        )
        
        # Role-based filtering
        if user_role == "user":
            # USER role: only show texts they uploaded
            query = query.filter(Text.uploaded_by == user_id)
        elif user_role == "annotator":
            # ANNOTATOR role: only show texts not uploaded by any user (system texts)
            query = query.filter(Text.uploaded_by.is_(None))
        # ADMIN role: no additional filtering (can see all texts)
        
        return query.offset(skip).limit(limit).all()

    def get_texts_for_review(self, db: Session, skip: int = 0, limit: int = 100, reviewer_id: Optional[int] = None) -> List[Text]:
        """Get texts ready for review (annotated status), excluding texts annotated by the current reviewer and user-uploaded texts."""
        query = self._not_deleted(db.query(Text)).options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader)
        ).filter(Text.status == ANNOTATED)
        
        # Only include system texts (exclude user-uploaded texts)
        query = query.filter(Text.uploaded_by.is_(None))
        
        # Exclude texts annotated by the current reviewer to prevent self-review
        if reviewer_id:
            query = query.filter(Text.annotator_id != reviewer_id)
        
        return query.offset(skip).limit(limit).all()

    def get_stats(self, db: Session) -> dict:
        """Get text statistics."""
        base = self._not_deleted(db.query(Text))
        total = base.count()
        initialized = base.filter(Text.status == INITIALIZED).count()
        annotated = base.filter(Text.status == ANNOTATED).count()
        reviewed = base.filter(Text.status == REVIEWED).count()
        reviewed_needs_revision = base.filter(Text.status == REVIEWED_NEEDS_REVISION).count()
        skipped = base.filter(Text.status == SKIPPED).count()
        progress = base.filter(Text.status == PROGRESS).count()
        
        return {
            "total": total,
            "initialized": initialized,
            "annotated": annotated,
            "reviewed": reviewed,
            "reviewed_needs_revision": reviewed_needs_revision,
            "skipped": skipped,
            "progress": progress
        }

    def get_work_in_progress(self, db: Session, user_id: int, user_role: str = None) -> Optional[Text]:
        """Get text that user is currently working on (progress status)."""
        if user_role == "annotator":
            # For annotators, return text where source is not 'Bulk Upload'
            return self._not_deleted(db.query(Text)).filter(
                Text.annotator_id == user_id,
                Text.status == PROGRESS,
                Text.source == 'Bulk Upload'
            ).first()
        elif user_role == "user":
            return self._not_deleted(db.query(Text)).filter(
                Text.annotator_id == user_id,
                Text.status == PROGRESS,
                Text.source != 'Bulk Upload'
            ).first()
        else:
            return None

    def get_unassigned_text(self, db: Session) -> Optional[Text]:
        """Get an unassigned text with initialized status."""
        return self._not_deleted(db.query(Text)).filter(
            Text.status == INITIALIZED,
            Text.annotator_id.is_(None)
        ).first()

    def get_unassigned_text_for_user(self, db: Session, user_id: int, user_role: str = None) -> Optional[Text]:
        """Get an unassigned text with initialized status that user hasn't rejected."""
        from models.user_rejected_text import UserRejectedText
        
        # Get text IDs that user has rejected
        rejected_text_ids = (select(UserRejectedText.text_id).where(UserRejectedText.user_id == user_id))
        
        # Base query for available texts
        query = self._not_deleted(db.query(Text)).filter(
            Text.status == INITIALIZED,
            Text.annotator_id.is_(None),
            ~Text.id.in_(rejected_text_ids)
        )
        
        # Role-based filtering
        if user_role == "user":
            # USER role: only show texts they uploaded
            query = query.filter(Text.uploaded_by == user_id)
        elif user_role == "annotator":
            # ANNOTATOR role: only show texts not uploaded by any user (system texts)
            query = query.filter(Text.uploaded_by.is_(None))
        # ADMIN role: no additional filtering (can see all texts)
        
        return query.first()

    def assign_text_to_user(self, db: Session, text_id: int, user_id: int) -> Optional[Text]:
        """Assign a text to a user and set status to progress."""
        text = self._not_deleted(db.query(Text)).filter(Text.id == text_id).first()
        if text:
            text.annotator_id = user_id
            text.status = PROGRESS
            db.add(text)
            db.commit()
            db.refresh(text)
        return text

    def start_work(self, db: Session, user_id: int, user_role: str = None) -> Optional[Text]:
        """Start work for a user - find work in progress or assign new text."""
        # First, check if user has work in progress
        work_in_progress = self.get_work_in_progress(db, user_id, user_role)
        
        if work_in_progress:
            return work_in_progress
        
        if user_role == "user":
            return None
        
        # If no work in progress, find an unassigned text (excluding rejected ones)
        unassigned_text = self.get_unassigned_text_for_user(db, user_id, user_role)
        if unassigned_text:
            return self.assign_text_to_user(db, unassigned_text.id, user_id)
        
        # No texts available
        return None

    def get_recent_activity(self, db: Session, user_id: int, limit: int = 10, user_role: str = None) -> List[Text]:
        """Get recent texts annotated or reviewed by the user."""
        # Get texts where user was annotator or reviewer, ordered by updated_at desc
        query = self._not_deleted(db.query(Text)).filter(
            (Text.annotator_id == user_id) | (Text.reviewer_id == user_id)
        ).filter(
            Text.status.in_([ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION])  # Only completed work
        )
        
        # Role-based filtering by source
        if user_role == "user":
            # For all other roles (admin, annotator, reviewer), filter only texts where source is "bulk"
            query = query.filter(Text.source != "Bulk Upload")
        # USER role: no source filtering (show all texts)
        
        recent_texts = query.order_by(
            Text.updated_at.desc()
        ).limit(limit).all()
        
        return recent_texts

    def get_recent_activity_with_review_counts(self, db: Session, user_id: int, limit: int = 10, user_role: str = None) -> List[dict]:
        """Get recent texts annotated or reviewed by the user with annotation review counts."""
        from models.annotation import Annotation
        from models.annotation_review import AnnotationReview
        
        # Get recent texts
        recent_texts = self.get_recent_activity(db, user_id, limit, user_role)
        
        result = []
        for text in recent_texts:
            # Get all annotations for this text
            annotations = db.query(Annotation).filter(Annotation.text_id == text.id).all()
            
            # Count total annotations
            total_annotations = len(annotations)
            
            # Count accepted and rejected annotations
            accepted_count = 0
            rejected_count = 0
            
            for annotation in annotations:
                reviews = db.query(AnnotationReview).filter(
                    AnnotationReview.annotation_id == annotation.id
                ).all()
                
                # For each annotation, check if there are reviews
                if reviews:
                    # Count agree vs disagree decisions
                    for review in reviews:
                        if review.decision == "agree":
                            accepted_count += 1
                        elif review.decision == "disagree":
                            rejected_count += 1
            
            # Calculate if all annotations are accepted (no rejections and all have reviews)
            all_accepted = (total_annotations > 0 and 
                           rejected_count == 0 and 
                           accepted_count == total_annotations)
            
            result.append({
                "text": text,
                "total_annotations": total_annotations,
                "accepted_count": accepted_count,
                "rejected_count": rejected_count,
                "all_accepted": all_accepted
            })
        
        return result

    def get_user_stats(self, db: Session, user_id: int) -> dict:
        """Get statistics for a specific user."""
        # Count texts annotated by user (where user is annotator and status is annotated/reviewed/reviewed_needs_revision)
        texts_annotated = self._not_deleted(db.query(Text)).filter(
            Text.annotator_id == user_id,
            Text.status.in_([ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION])
        ).count()
        
        # Count texts reviewed by user (where user is reviewer and status is reviewed)
        reviews_completed = self._not_deleted(db.query(Text)).filter(
            Text.reviewer_id == user_id,
            Text.status == REVIEWED
        ).count()
        
        # Count total annotations created by user
        from models.annotation import Annotation
        total_annotations = db.query(Annotation).filter(
            Annotation.annotator_id == user_id
        ).count()
        
        # Calculate accuracy rate (for now, simple calculation based on reviewed texts)
        # This could be enhanced with more sophisticated metrics
        total_user_texts = self._not_deleted(db.query(Text)).filter(
            Text.annotator_id == user_id,
            Text.status.in_([ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION])
        ).count()
        
        if total_user_texts > 0:
            reviewed_by_others = self._not_deleted(db.query(Text)).filter(
                Text.annotator_id == user_id,
                Text.status == REVIEWED,
                Text.reviewer_id.isnot(None),
                Text.reviewer_id != user_id
            ).count()
            accuracy_rate = (reviewed_by_others / total_user_texts) * 100
        else:
            accuracy_rate = 0
        
        return {
            "texts_annotated": texts_annotated,
            "reviews_completed": reviews_completed,
            "total_annotations": total_annotations,
            "accuracy_rate": round(accuracy_rate, 1)
        }

    def skip_text(self, db: Session, user_id: int, user_role: str = None) -> Optional[Text]:
        """Skip current text by adding it to rejected list and get next available text."""
        from crud.user_rejected_text import user_rejected_text_crud
        
        # Find the current text in progress for the user
        current_text = self.get_work_in_progress(db, user_id)
        if not current_text:
            return None
        
        # Add current text to user's rejected list
        user_rejected_text_crud.create(db, user_id, current_text.id)
        
        # Reset the current text to make it available for others
        current_text.annotator_id = None
        current_text.status = INITIALIZED
        db.add(current_text)
        db.commit()
        
        # Find and assign the next available text (excluding rejected ones)
        next_text = self.get_unassigned_text_for_user(db, user_id, user_role)
        if next_text:
            return self.assign_text_to_user(db, next_text.id, user_id)
        
        return None

    def cancel_work(self, db: Session, user_id: int, text_id: int) -> bool:
        """Cancel current work on a text - make it available for others."""
        text = self._not_deleted(db.query(Text)).filter(
            Text.id == text_id,
            Text.annotator_id == user_id,
            Text.status == PROGRESS
        ).first()
        
        if not text:
            return False
        
        # Reset text to make it available for others
        text.annotator_id = None
        text.status = INITIALIZED
        db.add(text)
        db.commit()
        
        return True

    def get_user_work_in_progress(
        self,
        db: Session,
        user_id: int,
        user_role: str = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Text]:
        """Get all texts where current user has effective write permission."""
        base_query = self._not_deleted(db.query(Text)).options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader),
        )

        writable_shared = (
            db.query(TextPermission.text_id)
            .filter(
                TextPermission.grantee_user_id == user_id,
                TextPermission.permission == TEXT_PERMISSION_WRITE,
            )
            .subquery()
        )
        query = base_query.filter(
            or_(
                Text.uploaded_by == user_id,
                Text.id.in_(select(writable_shared.c.text_id)),
            )
        )

        return query.order_by(Text.updated_at.desc().nullslast(), Text.created_at.desc()).offset(skip).limit(limit).all()

    def get_shared_texts(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Text]:
        """Get texts explicitly shared with the current user."""
        rows = (
            self._not_deleted(
                db.query(Text, TextPermission.permission)
                .join(TextPermission, TextPermission.text_id == Text.id)
            )
            .options(
                joinedload(Text.annotator),
                joinedload(Text.reviewer),
                joinedload(Text.uploader),
                defer(Text.content),
                defer(Text.translation),
            )
            .filter(TextPermission.grantee_user_id == user_id)
            .order_by(Text.updated_at.desc().nullslast(), Text.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        shared_texts: List[Text] = []
        for text, permission in rows:
            setattr(text, "current_user_permission", permission)
            shared_texts.append(text)
        return shared_texts

    def get_texts_by_annotator_with_reviews(
        self, db: Session, annotator_id: int, skip: int = 0, limit: int = 100
    ) -> List[Text]:
        """Get texts annotated by a specific user that have been reviewed."""
        from models.text import REVIEWED, REVIEWED_NEEDS_REVISION
        
        return self._not_deleted(db.query(Text)).filter(
            Text.annotator_id == annotator_id,
            Text.status.in_([REVIEWED, REVIEWED_NEEDS_REVISION])
        ).offset(skip).limit(limit).all()

    def get_texts_by_annotator_and_status(
        self, db: Session, annotator_id: int, status: str, skip: int = 0, limit: int = 100
    ) -> List[Text]:
        """Get texts by annotator and specific status."""
        return self._not_deleted(db.query(Text)).filter(
            Text.annotator_id == annotator_id,
            Text.status == status
        ).offset(skip).limit(limit).all()

    def get_texts_by_date_range(
        self, db: Session, start_date: datetime, end_date: datetime
    ) -> List[Text]:
        """Get texts created within a date range."""
        # Add one day to end_date to include the entire end date
        end_date_inclusive = datetime.combine(end_date.date(), datetime.max.time())
        start_date_inclusive = datetime.combine(start_date.date(), datetime.min.time())
        
        return self._not_deleted(db.query(Text)).filter(
            and_(
                Text.created_at >= start_date_inclusive,
                Text.created_at <= end_date_inclusive
            )
        ).all()

    def get_texts_by_date_range_and_filter(
        self, db: Session, start_date: datetime, end_date: datetime, filter_type: str
    ) -> List[Text]:
        """Get texts within a date range filtered by type (reviewed or annotated)."""
        # Add one day to end_date to include the entire end date
        end_date_inclusive = datetime.combine(end_date.date(), datetime.max.time())
        start_date_inclusive = datetime.combine(start_date.date(), datetime.min.time())
        base_query = self._not_deleted(db.query(Text)).filter(
            and_(
                Text.created_at >= start_date_inclusive,
                Text.created_at <= end_date_inclusive,
                
            )
        )
        
        if filter_type == "reviewed":
            # Filter for texts that have been reviewed
            return base_query.filter(
                Text.status.in_([REVIEWED, REVIEWED_NEEDS_REVISION])
            ).all()
        elif filter_type == "annotated":
            # Filter for texts that have annotations using EXISTS
            # This is more robust than JOIN and handles edge cases better
            return base_query.filter(
                exists().where(Annotation.text_id == Text.id)
            ).all()
        else:
            # Default: return all texts in date range
            return base_query.all()


text_crud = TextCRUD() 