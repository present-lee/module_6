"""사용자 관련 API 엔드포인트

담당자 선택 등을 위한 사용자 목록 조회 API를 제공합니다.
Admin 전용 사용자 관리 기능도 포함합니다.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.user import UserResponse, UserRoleUpdate
from app.auth import (
    get_current_user,
    get_current_admin_user,
)

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


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 사용자 정보를 반환합니다.

    Args:
        user_id: 조회할 사용자 ID

    Returns:
        UserResponse: 사용자 정보

    Raises:
        HTTPException: 사용자를 찾을 수 없는 경우 404
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다.",
        )
    return user


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """사용자 역할을 변경합니다. (Admin 전용)

    Args:
        user_id: 변경할 사용자 ID
        role_data: 새로운 역할 정보

    Returns:
        UserResponse: 업데이트된 사용자 정보

    Raises:
        HTTPException: 사용자를 찾을 수 없거나 자기 자신의 역할 변경 시도 시
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자신의 역할은 변경할 수 없습니다.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다.",
        )

    user.role = role_data.role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """사용자를 삭제합니다. (Admin 전용)

    Args:
        user_id: 삭제할 사용자 ID

    Raises:
        HTTPException: 사용자를 찾을 수 없거나 자기 자신 삭제 시도 시
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자신의 계정은 삭제할 수 없습니다.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다.",
        )

    db.delete(user)
    db.commit()
    return None
