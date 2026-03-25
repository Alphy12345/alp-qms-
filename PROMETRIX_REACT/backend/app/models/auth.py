"""
Authentication and User model.
Handles user accounts with bcrypt password hashing.
"""
from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base
import bcrypt


class User(Base):
    """User model for authentication."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def verify_password(self, plain_password: str) -> bool:
        """Verify a plain password against the stored hash."""
        # Truncate to 72 bytes (bcrypt limit)
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = self.password_hash.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    
    @staticmethod
    def hash_password(plain_password: str) -> str:
        """Hash a plain password."""
        # Truncate to 72 bytes (bcrypt limit)
        pwd_bytes = plain_password.encode('utf-8')[:72]
        # Generate salt and hash
        salt = bcrypt.gensalt(rounds=12)
        hash_bytes = bcrypt.hashpw(pwd_bytes, salt)
        return hash_bytes.decode('utf-8')


def create_default_admin_user(db_session):
    """
    Create the default system admin user if it doesn't exist.
    This is the fallback user for system access.
    """
    from sqlalchemy.orm import Session
    
    # Check if admin user already exists
    admin_user = db_session.query(User).filter(User.username == "system admin").first()
    
    if not admin_user:
        # Create default admin user
        admin = User(
            username="system admin",
            password_hash=User.hash_password("qms2026#"),
            role="admin"
        )
        db_session.add(admin)
        db_session.commit()
        print("✓ Default admin user created (username: 'system admin', password: 'qms2026#')")
        return True
    else:
        print("✓ Default admin user already exists")
        return False
