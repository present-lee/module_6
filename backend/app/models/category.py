from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Category(Base):
    """카테고리 모델 (칸반 보드의 컬럼)"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # ToDo, Processing, Issue, Done 등
    order = Column(Integer, nullable=False, default=0)  # 보드 내 순서
    color = Column(String(20), nullable=True)  # UI 표시용 색상 코드 (예: #FF5733)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 관계 설정: 카테고리에 속한 태스크들
    tasks = relationship("Task", back_populates="category")
