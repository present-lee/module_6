"""카테고리 API 라우터"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, User
from app.models.user import UserRole
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryReorder,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


def require_admin_or_member(current_user: User) -> User:
    """Admin 또는 Member 권한 확인"""
    if current_user.role not in [UserRole.admin, UserRole.member]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 또는 Member 권한이 필요합니다.",
        )
    return current_user


def require_admin(current_user: User) -> User:
    """Admin 권한 확인"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다.",
        )
    return current_user


@router.get("/", response_model=list[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """모든 카테고리 목록 반환 (order 기준 정렬)"""
    categories = db.query(Category).order_by(Category.order).all()
    return categories


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """새 카테고리 생성 (Admin/Member만)"""
    require_admin_or_member(current_user)

    # 이름 중복 확인
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 카테고리 이름입니다.",
        )

    category = Category(**category_data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/reorder", response_model=list[CategoryResponse])
async def reorder_categories(
    reorder_data: CategoryReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """여러 카테고리의 순서를 한번에 변경 (Admin/Member만)"""
    require_admin_or_member(current_user)

    updated_categories = []
    for item in reorder_data.items:
        category = db.query(Category).filter(Category.id == item.id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"카테고리 ID {item.id}를 찾을 수 없습니다.",
            )
        category.order = item.order
        updated_categories.append(category)

    db.commit()

    # 업데이트된 카테고리들 새로고침 및 정렬된 전체 목록 반환
    for cat in updated_categories:
        db.refresh(cat)

    all_categories = db.query(Category).order_by(Category.order).all()
    return all_categories


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 카테고리 조회"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="카테고리를 찾을 수 없습니다.",
        )
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """카테고리 수정 (Admin/Member만)"""
    require_admin_or_member(current_user)

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="카테고리를 찾을 수 없습니다.",
        )

    # 이름 변경 시 중복 확인
    if category_data.name is not None and category_data.name != category.name:
        existing = db.query(Category).filter(Category.name == category_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 존재하는 카테고리 이름입니다.",
            )

    # 제공된 필드만 업데이트
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """카테고리 삭제 (Admin만, 해당 카테고리에 일감이 있으면 에러)"""
    require_admin(current_user)

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="카테고리를 찾을 수 없습니다.",
        )

    # 해당 카테고리에 속한 태스크가 있는지 확인
    if category.tasks and len(category.tasks) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"카테고리에 {len(category.tasks)}개의 일감이 있어 삭제할 수 없습니다. 먼저 일감을 이동하거나 삭제해주세요.",
        )

    db.delete(category)
    db.commit()
    return None
