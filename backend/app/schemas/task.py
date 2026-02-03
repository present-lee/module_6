"""일감(Task) 관련 Pydantic 스키마"""
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.task import TaskPriority
from app.schemas.user import UserResponse
from app.schemas.category import CategoryResponse


class TaskBase(BaseModel):
    """일감 기본 스키마"""
    title: str = Field(..., min_length=1, max_length=200, description="일감 제목")
    description: str | None = Field(default=None, description="일감 설명")
    category_id: int = Field(..., description="카테고리 ID")
    assigned_to: int | None = Field(default=None, description="담당자 ID")
    start_date: datetime | None = Field(default=None, description="시작일")
    due_date: datetime | None = Field(default=None, description="마감일")
    priority: TaskPriority = Field(default=TaskPriority.medium, description="우선순위 (low, medium, high)")
    order: int = Field(default=0, ge=0, description="카테고리 내 순서")


class TaskCreate(TaskBase):
    """일감 생성 요청 스키마"""
    assigned_to: int | None = Field(default=None, description="담당자 ID (선택)")
    start_date: datetime | None = Field(default=None, description="시작일 (선택)")
    due_date: datetime | None = Field(default=None, description="마감일 (선택)")
    order: int | None = Field(default=None, ge=0, description="카테고리 내 순서 (선택, 없으면 마지막)")


class TaskUpdate(BaseModel):
    """일감 수정 요청 스키마 (모든 필드 선택)"""
    title: str | None = Field(default=None, min_length=1, max_length=200, description="일감 제목")
    description: str | None = Field(default=None, description="일감 설명")
    category_id: int | None = Field(default=None, description="카테고리 ID")
    assigned_to: int | None = Field(default=None, description="담당자 ID")
    start_date: datetime | None = Field(default=None, description="시작일")
    due_date: datetime | None = Field(default=None, description="마감일")
    priority: TaskPriority | None = Field(default=None, description="우선순위")
    order: int | None = Field(default=None, ge=0, description="카테고리 내 순서")


class TaskResponse(BaseModel):
    """일감 응답 스키마"""
    id: int
    title: str
    description: str | None
    category_id: int
    assigned_to: int | None
    created_by: int
    start_date: datetime | None
    due_date: datetime | None
    priority: TaskPriority
    order: int
    created_at: datetime
    updated_at: datetime

    # 관계 포함
    category: CategoryResponse | None = None
    assignee: UserResponse | None = None
    creator: UserResponse | None = None

    class Config:
        from_attributes = True


class TaskMove(BaseModel):
    """일감 이동 요청 스키마 (카테고리 이동 및 순서 변경)"""
    category_id: int = Field(..., description="이동할 카테고리 ID")
    order: int = Field(..., ge=0, description="카테고리 내 새로운 순서")


class TaskFilter(BaseModel):
    """일감 필터링 스키마"""
    category_id: int | None = Field(default=None, description="카테고리 ID로 필터")
    assigned_to: int | None = Field(default=None, description="담당자 ID로 필터")
    priority: TaskPriority | None = Field(default=None, description="우선순위로 필터")
