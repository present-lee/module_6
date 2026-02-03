"""카테고리 관련 Pydantic 스키마"""
from datetime import datetime
from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    """카테고리 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=100, description="카테고리 이름")
    order: int = Field(default=0, ge=0, description="보드 내 순서")
    color: str | None = Field(default=None, max_length=20, description="UI 색상 코드 (예: #FF5733)")


class CategoryCreate(CategoryBase):
    """카테고리 생성 요청 스키마"""
    pass


class CategoryUpdate(BaseModel):
    """카테고리 수정 요청 스키마 (모든 필드 선택)"""
    name: str | None = Field(default=None, min_length=1, max_length=100, description="카테고리 이름")
    order: int | None = Field(default=None, ge=0, description="보드 내 순서")
    color: str | None = Field(default=None, max_length=20, description="UI 색상 코드")


class CategoryResponse(BaseModel):
    """카테고리 응답 스키마"""
    id: int
    name: str
    order: int
    color: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryReorderItem(BaseModel):
    """개별 카테고리 순서 변경 아이템"""
    id: int = Field(..., description="카테고리 ID")
    order: int = Field(..., ge=0, description="새로운 순서")


class CategoryReorder(BaseModel):
    """카테고리 순서 일괄 변경 요청 스키마"""
    items: list[CategoryReorderItem] = Field(..., description="ID와 순서 매핑 리스트")
