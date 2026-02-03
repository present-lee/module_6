"""사용자 관련 API 엔드포인트

담당자 선택 등을 위한 사용자 목록 조회 API를 제공합니다.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.user import UserResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """모든 사용자 목록을 반환합니다.

    인증이 필요하며, hashed_password를 제외한 사용자 정보를 반환합니다.

    Returns:
        list[UserResponse]: 사용자 목록 (id, username, email, role, created_at)
    """
    users = db.query(User).all()
    return users
