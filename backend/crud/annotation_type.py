from typing import List, Optional
from sqlalchemy.orm import Session
import uuid
from models.annotation_type import AnnotationType
from schemas.annotation_type import AnnotationTypeCreate, AnnotationTypeUpdate


class AnnotationTypeCRUD:
    """CRUD operations for AnnotationType."""
    
    def create(self, db: Session, obj_in: AnnotationTypeCreate) -> AnnotationType:
        """Create a new annotation type."""
        db_obj = AnnotationType(
            id=str(uuid.uuid4()),
            name=obj_in.name,
            uploader_id=obj_in.uploader_id,
            color=obj_in.color,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get(self, db: Session, type_id: str) -> Optional[AnnotationType]:
        """Get annotation type by ID."""
        return db.query(AnnotationType).filter(AnnotationType.id == type_id).first()
    
    def get_by_name(self, db: Session, name: str) -> Optional[AnnotationType]:
        """Get annotation type by name."""
        return db.query(AnnotationType).filter(AnnotationType.name == name).first()
    
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        include_hidden: bool = False,
    ) -> List[AnnotationType]:
        """Get all annotation types. By default excludes hidden (soft-deleted) types."""
        query = db.query(AnnotationType)
        if not include_hidden:
            query = query.filter(AnnotationType.is_hidden == False)
        return query.offset(skip).limit(limit).all()
    
    def update(self, db: Session, type_id: str, obj_in: AnnotationTypeUpdate) -> Optional[AnnotationType]:
        """Update an annotation type."""
        db_obj = self.get(db=db, type_id=type_id)
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, type_id: str) -> bool:
        """Hard delete an annotation type. Use soft_delete to avoid FK violations."""
        db_obj = self.get(db=db, type_id=type_id)
        if not db_obj:
            return False

        db.delete(db_obj)
        db.commit()
        return True

    def soft_delete(self, db: Session, type_id: str) -> bool:
        """Soft delete: mark annotation type as hidden. Type stays in DB for FK integrity."""
        db_obj = self.get(db=db, type_id=type_id)
        if not db_obj:
            return False

        db_obj.is_hidden = True
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return True
    
    def get_or_create(self, db: Session, name: str, uploader_id: Optional[str] = None) -> AnnotationType:
        """Get an annotation type by name or create it if it doesn't exist."""
        db_obj = self.get_by_name(db=db, name=name)
        if db_obj:
            return db_obj
        
        # Create new annotation type
        create_schema = AnnotationTypeCreate(name=name, uploader_id=uploader_id)
        return self.create(db=db, obj_in=create_schema)


annotation_type_crud = AnnotationTypeCRUD()

