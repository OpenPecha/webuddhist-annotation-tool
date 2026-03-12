from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.annotation import Annotation
from models.text import Text, INITIALIZED, ANNOTATED, PROGRESS
from models.annotation_review import AnnotationReview
from schemas.annotation import AnnotationCreate, AnnotationUpdate


class AnnotationCRUD:
    def create(self, db: Session, obj_in: AnnotationCreate, annotator_id: int) -> Annotation:
        """Create a new annotation."""
        from models.text import Text, PROGRESS, INITIALIZED
        
        db_obj = Annotation(
            text_id=obj_in.text_id,
            annotator_id=annotator_id,
            annotation_type=obj_in.annotation_type,
            start_position=obj_in.start_position,
            end_position=obj_in.end_position,
            selected_text=obj_in.selected_text,
            label=obj_in.label,
            name=obj_in.name,
            level=obj_in.level,
            meta=obj_in.meta,
            confidence=obj_in.confidence,
        )
        db.add(db_obj)
        
        # Update text status to progress if it was initialized  
        text = db.query(Text).filter(Text.id == obj_in.text_id).first()
        if text and text.status == INITIALIZED:
            text.status = PROGRESS
            db.add(text)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_bulk(self, db: Session, obj_in: AnnotationCreate, annotator_id: Optional[int]) -> Annotation:
        """Create a new annotation without changing text status (for bulk upload)."""
        db_obj = Annotation(
            text_id=obj_in.text_id,
            annotator_id=annotator_id,  # Can be None for system annotations
            annotation_type=obj_in.annotation_type,
            start_position=obj_in.start_position,
            end_position=obj_in.end_position,
            selected_text=obj_in.selected_text,
            label=obj_in.label,
            name=obj_in.name,
            level=obj_in.level,
            meta=obj_in.meta,
            confidence=obj_in.confidence,
        )
        db.add(db_obj)
        # Note: No text status update for bulk operations
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, annotation_id: int) -> Optional[Annotation]:
        """Get annotation by ID."""
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if annotation:
            # Add is_agreed status
            annotation.is_agreed = self.is_annotation_agreed(db, annotation_id)
        return annotation

    def is_annotation_agreed(self, db: Session, annotation_id: int) -> bool:
        """Check if an annotation has been agreed upon by any reviewer."""
        agreed_review = db.query(AnnotationReview).filter(
            AnnotationReview.annotation_id == annotation_id,
            AnnotationReview.decision == "agree"
        ).first()
        return agreed_review is not None

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        text_id: Optional[int] = None,
        annotator_id: Optional[int] = None,
        annotation_type: Optional[str] = None
    ) -> List[Annotation]:
        """Get multiple annotations with optional filtering."""
        query = db.query(Annotation)
        
        if text_id:
            query = query.filter(Annotation.text_id == text_id)
        
        if annotator_id:
            query = query.filter(Annotation.annotator_id == annotator_id)
            
        if annotation_type:
            query = query.filter(Annotation.annotation_type == annotation_type)
        
        annotations = query.offset(skip).limit(limit).all()
        
        # Add is_agreed status for each annotation
        for annotation in annotations:
            annotation.is_agreed = self.is_annotation_agreed(db, annotation.id)
        
        return annotations

    def get_by_text(self, db: Session, text_id: int) -> List[Annotation]:
        """Get all annotations for a specific text."""
        annotations = db.query(Annotation).filter(Annotation.text_id == text_id).all()
        
        # Add is_agreed status for each annotation
        for annotation in annotations:
            annotation.is_agreed = self.is_annotation_agreed(db, annotation.id)
        
        return annotations

    def get_by_annotator(self, db: Session, annotator_id: int, skip: int = 0, limit: int = 100) -> List[Annotation]:
        """Get annotations by a specific annotator."""
        annotations = db.query(Annotation).filter(
            Annotation.annotator_id == annotator_id
        ).offset(skip).limit(limit).all()
        
        # Add is_agreed status for each annotation
        for annotation in annotations:
            annotation.is_agreed = self.is_annotation_agreed(db, annotation.id)
        
        return annotations

    def get_by_type(self, db: Session, annotation_type: str, skip: int = 0, limit: int = 100) -> List[Annotation]:
        """Get annotations by type."""
        annotations = db.query(Annotation).filter(
            Annotation.annotation_type == annotation_type
        ).offset(skip).limit(limit).all()
        
        # Add is_agreed status for each annotation
        for annotation in annotations:
            annotation.is_agreed = self.is_annotation_agreed(db, annotation.id)
        
        return annotations

    def update(self, db: Session, db_obj: Annotation, obj_in: AnnotationUpdate) -> Annotation:
        """Update annotation."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, annotation_id: int) -> Optional[Annotation]:
        """Delete annotation."""
        obj = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if obj:
            text_id = obj.text_id
            db.delete(obj)
            
            # Check if text should be reverted to initialized status
            remaining_annotations = db.query(Annotation).filter(
                Annotation.text_id == text_id
            ).count()
            
            if remaining_annotations == 0:
                text = db.query(Text).filter(Text.id == text_id).first()
                if text and text.status == ANNOTATED:
                    text.status = INITIALIZED
                    db.add(text)
            
            db.commit()
        return obj

    def delete_user_annotations(self, db: Session, text_id: int, annotator_id: int) -> int:
        """Delete all annotations by a specific user for a specific text."""
        from models.text import Text, INITIALIZED
        # Get all user annotations for this text
        user_annotations = db.query(Annotation).filter(
            Annotation.text_id == text_id,
            Annotation.annotator_id == annotator_id
        ).all()
        
        # Delete all user annotations (except agreed ones)
        deleted_count = 0
        for annotation in user_annotations:
            # Check if annotation has been agreed upon by any reviewer
            if self.is_annotation_agreed(db=db, annotation_id=annotation.id):
                continue  # Skip deletion of agreed annotations
            db.delete(annotation)
            deleted_count += 1
        
        # Check if we should revert text status
        remaining_annotations = db.query(Annotation).filter(
            Annotation.text_id == text_id
        ).count() - deleted_count
        if remaining_annotations == 0:
            text = db.query(Text).filter(Text.id == text_id).first()
            if text:
                text.status = INITIALIZED
                text.annotator_id = None  # Remove annotator assignment
                db.add(text)
        
        db.commit()
        return deleted_count

    def get_overlapping_annotations(
        self, 
        db: Session, 
        text_id: int, 
        start_pos: int, 
        end_pos: int,
        exclude_annotation_id: Optional[int] = None
    ) -> List[Annotation]:
        """Get annotations that overlap with given position range."""
        query = db.query(Annotation).filter(
            Annotation.text_id == text_id,
            Annotation.start_position < end_pos,
            Annotation.end_position > start_pos
        )
        
        if exclude_annotation_id:
            query = query.filter(Annotation.id != exclude_annotation_id)
        
        return query.all()

    def validate_annotation_positions(
        self, 
        db: Session, 
        text_id: int, 
        start_pos: int, 
        end_pos: int,
        exclude_annotation_id: Optional[int] = None
    ) -> dict:
        """Validate annotation positions and return validation result."""
        # Check if text exists
        text = db.query(Text).filter(Text.id == text_id).first()
        if not text:
            return {"valid": False, "error": "Text not found"}
        
        # Check if positions are within text bounds
        text_length = len(text.content)
        if start_pos < 0 or end_pos < 0:
            return {"valid": False, "error": "Positions cannot be negative"}
        # Allow position at end of text (start_pos == end_pos == text_length) for line-break/page-break
        if start_pos > text_length:
            return {"valid": False, "error": f"Start position ({start_pos}) exceeds text length ({text_length})"}
        if end_pos > text_length:
            return {"valid": False, "error": f"End position ({end_pos}) exceeds text length ({text_length})"}
        
        if start_pos > end_pos:
            return {"valid": False, "error": "Start position must be less than or equal to end position"}
        
        # Extract the selected text (empty when start_pos == end_pos, e.g. line-break/page-break)
        selected_text = text.content[start_pos:end_pos] if start_pos < end_pos else ""
        
        # Note: Overlapping annotations are now allowed
        # overlapping = self.get_overlapping_annotations(
        #     db, text_id, start_pos, end_pos, exclude_annotation_id
        # )
        # 
        # if overlapping:
        #     return {
        #         "valid": False, 
        #         "error": f"Annotation overlaps with existing annotation(s): {[ann.id for ann in overlapping]}"
        #     }
        
        return {
            "valid": True, 
            "selected_text": selected_text
        }

    def get_annotation_stats(self, db: Session, text_id: Optional[int] = None) -> dict:
        """Get annotation statistics."""
        query = db.query(Annotation)
        
        if text_id:
            query = query.filter(Annotation.text_id == text_id)
        
        total_annotations = query.count()
        
        # Get count by annotation type
        type_counts = db.query(
            Annotation.annotation_type,
            func.count(Annotation.id).label('count')
        )
        
        if text_id:
            type_counts = type_counts.filter(Annotation.text_id == text_id)
        
        type_counts = type_counts.group_by(Annotation.annotation_type).all()
        
        return {
            "total_annotations": total_annotations,
            "by_type": {item.annotation_type: item.count for item in type_counts}
        }


annotation_crud = AnnotationCRUD() 