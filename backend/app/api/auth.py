"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.auth.security import create_access_token, verify_password, get_password_hash
from app.auth.dependencies import get_current_active_user
from app.schemas.auth import UserLogin, UserRegister, Token
from app.schemas.user import UserResponse
from app.models.user import User, Role, UserRole


router = APIRouter()


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """User login"""
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Update last login
    from sqlalchemy.sql import func
    user.last_login = func.now()
    db.commit()

    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email, "role": user.role.name},
        expires_delta=timedelta(minutes=30)
    )

    return Token(access_token=access_token, token_type="bearer", expires_in=1800)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register new user (admin only in production)"""
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate role
    role = db.query(Role).filter(Role.name == user_data.role.upper()).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Create user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role_id=role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user


@router.post("/logout")
async def logout():
    """Logout (client-side token removal)"""
    return {"message": "Logged out successfully"}