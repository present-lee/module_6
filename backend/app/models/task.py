from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class TaskPriority(str, enum.Enum):
    """태스크 우선순위 Enum"""
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Task(Base):
    """태스크 모델"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # 외래키
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 날짜 필드
    start_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    # 우선순위 및 순서
    priority = Column(SQLEnum(TaskPriority), default=TaskPriority.medium, nullable=False)
    order = Column(Integer, nullable=False, default=0)  # 카테고리 내 순서

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 관계 설정
    category = relationship("Category", back_populates="tasks")
    assignee = relationship(
        "User",
        back_populates="assigned_tasks",
        foreign_keys=[assigned_to]
    )
    creator = relationship(
        "User",
        back_populates="created_tasks",
        foreign_keys=[created_by]
    )
