from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    ANNOTATOR = "annotator"
    REVIEWER = "reviewer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    auth0_user_id = Column(String, unique=True, index=True, nullable=False)  # Auth0 user ID
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)  # Optional since Auth0 might not provide it
    full_name = Column(String, nullable=True)
    picture = Column(String, nullable=True)  # Auth0 picture URL
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    annotations = relationship("Annotation", back_populates="annotator")
    reviewed_texts = relationship("Text", back_populates="reviewer", foreign_keys="[Text.reviewer_id]")
    annotated_texts = relationship("Text", back_populates="annotator", foreign_keys="[Text.annotator_id]")
    uploaded_texts = relationship("Text", back_populates="uploader", foreign_keys="[Text.uploaded_by]")
    rejected_texts = relationship("UserRejectedText", back_populates="user", cascade="all, delete-orphan")
    annotation_reviews = relationship("AnnotationReview", back_populates="reviewer", cascade="all, delete-orphan")
    
