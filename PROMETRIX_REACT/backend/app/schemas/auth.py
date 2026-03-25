"""
Authentication schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    """Schema for user login request."""
    username: str = Field(..., min_length=1, max_length=100, description="Username")
    password: str = Field(..., min_length=1, max_length=255, description="Password")


class UserRegister(BaseModel):
    """Schema for user registration request."""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    password: str = Field(..., min_length=4, max_length=255, description="Password")
    role: Optional[str] = Field(default="user", max_length=50, description="User role (admin/user)")


class UserResponse(BaseModel):
    """Schema for user response (excluding password)."""
    id: int
    username: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Schema for successful login response."""
    success: bool
    message: str
    user: UserResponse
    token: Optional[str] = None


class ErrorResponse(BaseModel):
    """Schema for error response."""
    success: bool = False
    message: str


class ValidateResponse(BaseModel):
    """Schema for token validation response."""
    valid: bool
    user: Optional[UserResponse] = None
    message: Optional[str] = None
