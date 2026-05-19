from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models.user import User, UserRole
from schemas.user import UserCreate, UserUpdate


class UserCRUD:
    def create(self, db: Session, obj_in: UserCreate) -> User:
        """Create a new user."""
        db_obj = User(
            auth0_user_id=obj_in.auth0_user_id,
            username=obj_in.username,
            email=obj_in.email,
            full_name=obj_in.full_name,
            role=obj_in.role,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    def get_by_auth0_id(self, db: Session, auth0_user_id: str) -> Optional[User]:
        """Get user by Auth0 user ID."""
        return db.query(User).filter(User.auth0_user_id == auth0_user_id).first()

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get user by username."""
        return db.query(User).filter(User.username == username).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email (case-insensitive)."""
        if not email:
            return None
        normalized = email.strip().lower()
        return (
            db.query(User)
            .filter(func.lower(User.email) == normalized)
            .first()
        )

    def upsert_manual_by_email(
        self,
        db: Session,
        *,
        email: str,
        username: str,
        full_name: str,
        role: UserRole,
    ) -> tuple[User, bool]:
        """
        Create or update a user keyed by email.
        On update: only role and is_active are changed (set active).
        Returns (user, created).
        """
        normalized_email = email.strip().lower()
        existing = self.get_by_email(db, normalized_email)

        if existing:
            updated = self.update(
                db,
                existing,
                UserUpdate(role=role, is_active=True),
            )
            return updated, False

        if self.is_username_taken(db, username):
            raise ValueError("Username already taken")

        auth0_user_id = f"manual|{normalized_email}"
        if self.is_auth0_id_taken(db, auth0_user_id):
            raise ValueError("A manual account for this email already exists")

        created_user = self.create(
            db,
            UserCreate(
                auth0_user_id=auth0_user_id,
                username=username.strip(),
                email=normalized_email,
                full_name=full_name.strip(),
                role=role,
                is_active=True,
            ),
        )
        return created_user, True

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        is_active: Optional[bool] = None,
        role: Optional[str] = None,
        exclude_role: Optional[str] = None,
    ) -> List[User]:
        """Get multiple users with optional filtering."""
        query = db.query(User)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        if role:
            role_enum = role if isinstance(role, UserRole) else UserRole(role)
            query = query.filter(User.role == role_enum)

        if exclude_role:
            exclude_enum = (
                exclude_role
                if isinstance(exclude_role, UserRole)
                else UserRole(exclude_role)
            )
            query = query.filter(User.role != exclude_enum)
        
        return query.offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: User, obj_in: UserUpdate) -> User:
        """Update user."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, user_id: int) -> Optional[User]:
        """Delete user."""
        obj = db.query(User).filter(User.id == user_id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj

    def search(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List[User]:
        """Search users by username, email, or full name."""
        search_filter = or_(
            User.username.contains(query),
            User.email.contains(query) if query else False,
            User.full_name.contains(query) if query else False
        )
        return db.query(User).filter(search_filter).offset(skip).limit(limit).all()

    def search_share_candidates(
        self,
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = 10,
        exclude_user_id: Optional[int] = None,
    ) -> List[User]:
        """Search active users with email addresses for sharing suggestions."""
        normalized_query = query.strip()
        search_filter = or_(
            User.username.ilike(f"%{normalized_query}%"),
            User.email.ilike(f"%{normalized_query}%"),
            User.full_name.ilike(f"%{normalized_query}%"),
        )
        db_query = (
            db.query(User)
            .filter(User.is_active == True)
            .filter(User.email.isnot(None))
            .filter(search_filter)
        )
        if exclude_user_id is not None:
            db_query = db_query.filter(User.id != exclude_user_id)
        return db_query.order_by(User.email.asc()).offset(skip).limit(limit).all()

    def is_username_taken(self, db: Session, username: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if username is already taken."""
        query = db.query(User).filter(User.username == username)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        return query.first() is not None

    def is_email_taken(self, db: Session, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if email is already taken."""
        if not email:
            return False
        query = db.query(User).filter(User.email == email)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        return query.first() is not None

    def is_auth0_id_taken(self, db: Session, auth0_user_id: str) -> bool:
        """Check if Auth0 user ID is already taken."""
        return db.query(User).filter(User.auth0_user_id == auth0_user_id).first() is not None

    def upsert_by_auth0_id(self, db: Session, obj_in: UserCreate) -> User:
        """Get or create user by Auth0 ID. Updates existing user with new details."""
        existing = self.get_by_auth0_id(db, obj_in.auth0_user_id)
        if existing:
            update_data = UserUpdate(
                username=obj_in.username,
                email=obj_in.email,
                full_name=obj_in.full_name,
                picture=obj_in.picture,
            )
            return self.update(db, existing, update_data)
        return self.create(db, obj_in)


user_crud = UserCRUD() 