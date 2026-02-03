"""일감(Task) API 라우터"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import Task, User, Category
from app.models.user import UserRole
from app.models.task import TaskPriority
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskMove,
)
from app.auth import (
    get_current_user,
    get_current_admin_or_member,
    require_admin_or_member,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_task_with_relations(db: Session, task_id: int) -> Task | None:
    """관계를 포함하여 일감 조회"""
    return (
        db.query(Task)
        .options(
            joinedload(Task.category),
            joinedload(Task.assignee),
            joinedload(Task.creator),
        )
        .filter(Task.id == task_id)
        .first()
    )


def get_next_order(db: Session, category_id: int) -> int:
    """해당 카테고리에서 다음 순서 값을 계산"""
    max_order = (
        db.query(func.max(Task.order))
        .filter(Task.category_id == category_id)
        .scalar()
    )
    return (max_order or 0) + 1


@router.get("/", response_model=list[TaskResponse])
async def get_tasks(
    category_id: int | None = Query(default=None, description="카테고리 ID로 필터"),
    assigned_to: int | None = Query(default=None, description="담당자 ID로 필터"),
    priority: TaskPriority | None = Query(default=None, description="우선순위로 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일감 목록 반환 (선택적 필터링, category 내에서 order 기준 정렬)"""
    query = (
        db.query(Task)
        .options(
            joinedload(Task.category),
            joinedload(Task.assignee),
            joinedload(Task.creator),
        )
    )

    # 필터 적용
    if category_id is not None:
        query = query.filter(Task.category_id == category_id)
    if assigned_to is not None:
        query = query.filter(Task.assigned_to == assigned_to)
    if priority is not None:
        query = query.filter(Task.priority == priority)

    # category_id와 order로 정렬
    tasks = query.order_by(Task.category_id, Task.order).all()
    return tasks


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """새 일감 생성 (Admin/Member만)"""
    require_admin_or_member(current_user)

    # 카테고리 존재 확인
    category = db.query(Category).filter(Category.id == task_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="카테고리를 찾을 수 없습니다.",
        )

    # 담당자 존재 확인 (설정된 경우)
    if task_data.assigned_to is not None:
        assignee = db.query(User).filter(User.id == task_data.assigned_to).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="담당자를 찾을 수 없습니다.",
            )

    # 일감 데이터 준비
    task_dict = task_data.model_dump()

    # order가 None이면 해당 카테고리의 마지막 순서로 설정
    if task_dict.get("order") is None:
        task_dict["order"] = get_next_order(db, task_data.category_id)

    # created_by는 현재 사용자로 자동 설정
    task_dict["created_by"] = current_user.id

    task = Task(**task_dict)
    db.add(task)
    db.commit()
    db.refresh(task)

    # 관계 포함하여 반환
    return get_task_with_relations(db, task.id)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일감 상세 조회 (관계 포함)"""
    task = get_task_with_relations(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="일감을 찾을 수 없습니다.",
        )
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일감 수정 (Admin/Member만)"""
    require_admin_or_member(current_user)

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="일감을 찾을 수 없습니다.",
        )

    # 카테고리 변경 시 존재 확인
    if task_data.category_id is not None:
        category = db.query(Category).filter(Category.id == task_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="카테고리를 찾을 수 없습니다.",
            )

    # 담당자 변경 시 존재 확인
    if task_data.assigned_to is not None:
        assignee = db.query(User).filter(User.id == task_data.assigned_to).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="담당자를 찾을 수 없습니다.",
            )

    # 제공된 필드만 업데이트
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    # 관계 포함하여 반환
    return get_task_with_relations(db, task.id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일감 삭제 (Admin/Member/본인만)"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="일감을 찾을 수 없습니다.",
        )

    # 권한 확인: Admin, Member, 또는 본인(생성자)만 삭제 가능
    is_creator = task.created_by == current_user.id
    is_admin_or_member = current_user.role in [UserRole.admin, UserRole.member]

    if not (is_admin_or_member or is_creator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="삭제 권한이 없습니다.",
        )

    db.delete(task)
    db.commit()
    return None


@router.put("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    task_id: int,
    move_data: TaskMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일감을 다른 카테고리로 이동 또는 순서 변경 (Admin/Member만)"""
    require_admin_or_member(current_user)

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="일감을 찾을 수 없습니다.",
        )

    # 대상 카테고리 존재 확인
    category = db.query(Category).filter(Category.id == move_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="카테고리를 찾을 수 없습니다.",
        )

    # 카테고리와 순서 업데이트
    task.category_id = move_data.category_id
    task.order = move_data.order

    db.commit()
    db.refresh(task)

    # 관계 포함하여 반환
    return get_task_with_relations(db, task.id)
