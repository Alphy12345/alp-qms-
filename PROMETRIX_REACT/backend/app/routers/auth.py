"""
Authentication router for login, register, and user management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.auth import User, create_default_admin_user
from app.schemas.auth import (
    UserLogin,
    UserRegister,
    UserResponse,
    LoginResponse,
    ErrorResponse,
    ValidateResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user with username and password.
    Returns user data on success.
    """
    # Find user by username
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user:
        return LoginResponse(
            success=False,
            message="Invalid username or password",
            user=None,
            token=None
        )
    
    # Verify password
    if not user.verify_password(credentials.password):
        return LoginResponse(
            success=False,
            message="Invalid username or password",
            user=None,
            token=None
        )
    
    # Successful login
    return LoginResponse(
        success=True,
        message="Login successful",
        user=UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            created_at=user.created_at
        ),
        token=f"user_{user.id}_{user.role}"  # Simple token for demo (use JWT in production)
    )


@router.post("/register", response_model=LoginResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    Only admins should be able to register new users in production.
    """
    print(f"DEBUG: Register called with username: {user_data.username}")
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    print(f"DEBUG: Checked existing user: {existing_user}")
    
    if existing_user:
        return LoginResponse(
            success=False,
            message="Username already exists",
            user=None,
            token=None
        )
    
    # Create new user
    print("DEBUG: Hashing password...")
    password_hash = User.hash_password(user_data.password)
    print(f"DEBUG: Password hashed: {password_hash[:20]}...")
    
    new_user = User(
        username=user_data.username,
        password_hash=password_hash,
        role=user_data.role or "user"
    )
    print("DEBUG: Created user object")
    
    db.add(new_user)
    print("DEBUG: Added to session")
    db.commit()
    print("DEBUG: Committed")
    db.refresh(new_user)
    print(f"DEBUG: Refreshed, user id: {new_user.id}")
    
    return LoginResponse(
        success=True,
        message="User registered successfully",
        user=UserResponse(
            id=new_user.id,
            username=new_user.username,
            role=new_user.role,
            created_at=new_user.created_at
        ),
        token=f"user_{new_user.id}_{new_user.role}"
    )


@router.get("/me", response_model=UserResponse)
def get_current_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get current user info by user ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        created_at=user.created_at
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """
    List all users (admin only in production).
    """
    users = db.query(User).all()
    
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            role=u.role,
            created_at=u.created_at
        ) for u in users
    ]


@router.post("/init-default-admin")
def init_default_admin(db: Session = Depends(get_db)):
    """
    Initialize the default admin user.
    Can be called on startup to ensure admin exists.
    """
    created = create_default_admin_user(db)
    
    return {
        "success": True,
        "message": "Default admin user created" if created else "Default admin user already exists",
        "default_credentials": {
            "username": "system admin",
            "password": "qms2026#",
            "role": "admin"
        }
    }
