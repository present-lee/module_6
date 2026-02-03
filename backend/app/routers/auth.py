"""인증 API 라우터

회원가입, 로그인, 현재 사용자 조회 엔드포인트를 제공합니다.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.user import UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_user_by_email,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """회원가입 API

    새로운 사용자를 등록합니다.

    Args:
        user_data: 회원가입 정보 (username, email, password)
        db: 데이터베이스 세션

    Returns:
        생성된 사용자 정보

    Raises:
        HTTPException 400: 이메일 또는 사용자명이 이미 존재하는 경우
    """
    # 이메일 중복 검증
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )

    # 사용자명 중복 검증
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 사용자명입니다."
        )

    # 비밀번호 해싱 및 사용자 생성
    hashed_password = get_password_hash(user_data.password)

    # 첫 번째 사용자는 자동으로 admin으로 설정
    user_count = db.query(User).count()
    default_role = UserRole.admin if user_count == 0 else UserRole.member

    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=default_role
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """로그인 API

    이메일과 비밀번호로 로그인하고 JWT 토큰을 반환합니다.

    Args:
        user_data: 로그인 정보 (email, password)
        db: 데이터베이스 세션

    Returns:
        JWT 액세스 토큰

    Raises:
        HTTPException 401: 이메일 또는 비밀번호가 올바르지 않은 경우
    """
    # 사용자 조회
    user = get_user_by_email(db, user_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 비밀번호 검증
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # JWT 토큰 생성
    access_token = create_access_token(data={"sub": user.email})

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """현재 사용자 정보 조회 API

    JWT 토큰으로 인증된 현재 사용자의 정보를 반환합니다.

    Args:
        current_user: 인증된 현재 사용자 (JWT 토큰에서 추출)

    Returns:
        현재 사용자 정보
    """
    return current_user
