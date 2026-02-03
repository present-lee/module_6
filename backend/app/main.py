from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routers import examples
from app.routers import auth
from app.routers import categories
from app.routers import tasks
from app.routers import users

# 모든 모델 import (테이블 자동 생성을 위해 필요)
from app.models import User, Category, Task  # noqa: F401

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)


# 기본 카테고리 데이터
DEFAULT_CATEGORIES = [
    {"name": "ToDo", "order": 0, "color": "#6B7280"},
    {"name": "Processing", "order": 1, "color": "#3B82F6"},
    {"name": "Issue", "order": 2, "color": "#EF4444"},
    {"name": "Done", "order": 3, "color": "#10B981"},
]


def create_default_categories():
    """기본 카테고리가 없으면 생성"""
    db = SessionLocal()
    try:
        # 카테고리가 하나도 없을 때만 기본 카테고리 생성
        existing_count = db.query(Category).count()
        if existing_count == 0:
            for cat_data in DEFAULT_CATEGORIES:
                category = Category(**cat_data)
                db.add(category)
            db.commit()
            print(f"기본 카테고리 {len(DEFAULT_CATEGORIES)}개가 생성되었습니다.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 이벤트 핸들러"""
    # Startup
    create_default_categories()
    yield
    # Shutdown
    pass


app = FastAPI(title="Module 6 API", version="1.0.0", lifespan=lifespan)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "User-Agent"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)

# 라우터 등록
app.include_router(examples.router)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(tasks.router)
app.include_router(users.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "FastAPI 서버가 정상 작동 중입니다."}
