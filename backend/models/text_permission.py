from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


TEXT_PERMISSION_READ = "read"
TEXT_PERMISSION_WRITE = "write"


class TextPermission(Base):
    __tablename__ = "text_permissions"
    __table_args__ = (
        UniqueConstraint("text_id", "grantee_user_id", name="uq_text_permissions_text_grantee"),
    )

    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey("texts.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    grantee_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(String, nullable=False, default=TEXT_PERMISSION_READ)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    text = relationship("Text", back_populates="permissions")
    owner = relationship("User", foreign_keys=[owner_user_id], back_populates="granted_text_permissions")
    grantee = relationship("User", foreign_keys=[grantee_user_id], back_populates="received_text_permissions")
