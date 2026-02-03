"""인증 유틸리티 모듈

JWT 토큰 생성/검증 및 비밀번호 해싱/검증 함수를 제공합니다.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.models import User

# 비밀번호 해싱 컨텍스트 (Argon2 사용)
# Argon2는 bcrypt의 72바이트 제한이 없고 더 안전합니다
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

# OAuth2 Bearer 토큰 스킴
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교 검증합니다.

    Args:
        plain_password: 평문 비밀번호
        hashed_password: 해시된 비밀번호

    Returns:
        비밀번호 일치 여부
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호를 해싱합니다.

    Args:
        password: 평문 비밀번호

    Returns:
        해시된 비밀번호
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰을 생성합니다.

    Args:
        data: 토큰에 포함할 데이터 (일반적으로 {"sub": user_email})
        expires_delta: 토큰 만료 시간 (기본값: ACCESS_TOKEN_EXPIRE_MINUTES)

    Returns:
        JWT 토큰 문자열
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """JWT 액세스 토큰을 디코딩합니다.

    Args:
        token: JWT 토큰 문자열

    Returns:
        디코딩된 토큰 페이로드 또는 None (검증 실패 시)
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """이메일로 사용자를 조회합니다.

    Args:
        db: 데이터베이스 세션
        email: 사용자 이메일

    Returns:
        User 객체 또는 None
    """
    return db.query(User).filter(User.email == email).first()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """JWT 토큰에서 현재 사용자를 추출합니다.

    FastAPI 의존성 함수로 사용됩니다.

    Args:
        token: JWT Bearer 토큰
        db: 데이터베이스 세션

    Returns:
        현재 로그인한 User 객체

    Raises:
        HTTPException: 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
    """
    print(f"[AUTH] get_current_user called with token: {token[:20]}...")

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    print(f"[AUTH] Decoded payload: {payload}")

    if payload is None:
        print("[AUTH] ERROR: Payload is None - token decode failed")
        raise credentials_exception

    email: str = payload.get("sub")
    print(f"[AUTH] Extracted email: {email}")

    if email is None:
        print("[AUTH] ERROR: Email is None in payload")
        raise credentials_exception

    user = get_user_by_email(db, email=email)
    print(f"[AUTH] Found user: {user.username if user else 'None'}")

    if user is None:
        print("[AUTH] ERROR: User not found in database")
        raise credentials_exception

    print(f"[AUTH] SUCCESS: User authenticated - {user.username}")
    return user


# ============================================================
# 역할 기반 권한 검증 의존성 함수
# ============================================================

async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """현재 사용자가 Admin인지 확인합니다.

    FastAPI 의존성 함수로 사용됩니다.

    Args:
        current_user: 현재 로그인한 사용자

    Returns:
        Admin 권한이 있는 User 객체

    Raises:
        HTTPException: Admin 권한이 없는 경우 403 Forbidden
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다.",
        )
    return current_user


async def get_current_admin_or_member(
    current_user: User = Depends(get_current_user),
) -> User:
    """현재 사용자가 Admin 또는 Member인지 확인합니다.

    FastAPI 의존성 함수로 사용됩니다.

    Args:
        current_user: 현재 로그인한 사용자

    Returns:
        Admin 또는 Member 권한이 있는 User 객체

    Raises:
        HTTPException: Admin/Member 권한이 없는 경우 403 Forbidden
    """
    from app.models.user import UserRole

    if current_user.role not in [UserRole.admin, UserRole.member]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 또는 Member 권한이 필요합니다.",
        )
    return current_user


def require_admin(current_user: User) -> User:
    """Admin 권한 확인 유틸리티 함수.

    엔드포인트 내부에서 호출하여 권한을 검증합니다.

    Args:
        current_user: 현재 로그인한 사용자

    Returns:
        Admin 권한이 있는 User 객체

    Raises:
        HTTPException: Admin 권한이 없는 경우 403 Forbidden
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다.",
        )
    return current_user


def require_admin_or_member(current_user: User) -> User:
    """Admin 또는 Member 권한 확인 유틸리티 함수.

    엔드포인트 내부에서 호출하여 권한을 검증합니다.

    Args:
        current_user: 현재 로그인한 사용자

    Returns:
        Admin 또는 Member 권한이 있는 User 객체

    Raises:
        HTTPException: Admin/Member 권한이 없는 경우 403 Forbidden
    """
    from app.models.user import UserRole

    if current_user.role not in [UserRole.admin, UserRole.member]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 또는 Member 권한이 필요합니다.",
        )
    return current_user
