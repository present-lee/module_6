# Kanban 보드 프로젝트 계획

## 프로젝트 목표

팀원 혹은 그룹원들끼리의 일감 관리를 위한 Kanban 보드 애플리케이션 개발

## 기능 요구사항

### 1. 일감 관리 (Task Management)
- 스티커 형태의 목록 리스트
- 드래그 앤 드롭으로 카테고리 간 이동
- 일감 생성, 수정, 삭제
- 일감 상세 정보 (제목, 설명, 담당자, 마감일 등)

### 2. 카테고리 관리
- ToDo (할 일)
- Processing (진행 중)
- Issue (이슈/문제)
- Done (완료) - 추가 권장
- 사용자 정의 카테고리 추가/수정/삭제

### 3. 사용자 인증 및 권한 관리
- 사용자 등록 (회원가입)
- 로그인/로그아웃
- JWT 토큰 기반 인증
- 역할 기반 권한 부여
  - Admin: 전체 관리 권한
  - Member: 일감 생성/수정 권한
  - Viewer: 읽기 전용 권한

### 4. 간트차트 기능
- 전체 일감의 진행 상황 타임라인 시각화
- 마감일 기반 일정 표시
- 담당자별 필터링
- 카테고리별 필터링

## 기술 스택

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- 드래그 앤 드롭: react-beautiful-dnd 또는 dnd-kit
- 간트차트: react-gantt-chart 또는 dhtmlx-gantt

### Backend
- FastAPI
- Python 3.12
- JWT 인증: python-jose
- 비밀번호 해싱: passlib + bcrypt

### Database
- SQLite
- SQLAlchemy ORM

## 데이터베이스 스키마 (초안)

### Users 테이블
- id (PK)
- username
- email (unique)
- hashed_password
- role (admin/member/viewer)
- created_at

### Tasks 테이블
- id (PK)
- title
- description
- category_id (FK)
- assigned_to (FK to Users)
- created_by (FK to Users)
- start_date
- due_date
- priority (low/medium/high)
- order (카테고리 내 순서)
- created_at
- updated_at

### Categories 테이블
- id (PK)
- name (ToDo, Processing, Issue, Done 등)
- order (보드 내 순서)
- color (UI 표시용)
- created_at

## API 엔드포인트 (초안)

### 인증
- POST /api/auth/register - 회원가입
- POST /api/auth/login - 로그인
- GET /api/auth/me - 현재 사용자 정보

### 사용자
- GET /api/users - 사용자 목록
- GET /api/users/{id} - 사용자 상세
- PUT /api/users/{id} - 사용자 수정
- DELETE /api/users/{id} - 사용자 삭제

### 카테고리
- GET /api/categories - 카테고리 목록
- POST /api/categories - 카테고리 생성
- PUT /api/categories/{id} - 카테고리 수정
- DELETE /api/categories/{id} - 카테고리 삭제
- PUT /api/categories/reorder - 카테고리 순서 변경

### 일감 (Tasks)
- GET /api/tasks - 일감 목록 (필터링 지원)
- POST /api/tasks - 일감 생성
- GET /api/tasks/{id} - 일감 상세
- PUT /api/tasks/{id} - 일감 수정
- DELETE /api/tasks/{id} - 일감 삭제
- PUT /api/tasks/{id}/move - 일감 카테고리 이동
- GET /api/tasks/gantt - 간트차트용 데이터

## 페이지 구조 (Frontend)

### Public Pages
- `/login` - 로그인 페이지
- `/register` - 회원가입 페이지

### Protected Pages
- `/` (또는 `/board`) - Kanban 보드 메인
- `/gantt` - 간트차트 뷰
- `/tasks/[id]` - 일감 상세 페이지
- `/settings` - 설정 페이지
  - `/settings/users` - 사용자 관리 (Admin only)
  - `/settings/categories` - 카테고리 관리

## 개발 순서 (권장)

### Phase 1: 기본 인프라
1. 데이터베이스 모델 구현 (Users, Categories, Tasks)
2. 인증 API 구현 (회원가입, 로그인)
3. 로그인/회원가입 페이지 구현

### Phase 2: Kanban 보드 핵심 기능
1. 카테고리 CRUD API
2. 일감 CRUD API
3. Kanban 보드 UI 구현
4. 드래그 앤 드롭 기능

### Phase 3: 권한 관리
1. 역할 기반 권한 미들웨어
2. 사용자 관리 페이지 (Admin)
3. 권한별 UI 표시 제어

### Phase 4: 간트차트
1. 간트차트용 데이터 API
2. 간트차트 UI 구현
3. 필터링 기능

### Phase 5: 추가 기능 및 개선
1. 일감 검색 기능
2. 알림 기능
3. 댓글 기능 (선택사항)
4. 파일 첨부 (선택사항)
5. UI/UX 개선

## 고려사항

### 보안
- JWT 토큰 만료 시간 설정
- HTTPS 사용 권장 (프로덕션)
- XSS, CSRF 방어
- SQL Injection 방어 (SQLAlchemy로 자동 처리)

### 성능
- 일감 목록 페이지네이션
- 간트차트 데이터 캐싱
- 이미지 최적화 (Next.js Image 사용)

### 확장성
- 추후 팀/프로젝트 분리 기능 추가 가능하도록 설계
- 알림 시스템 추가 가능하도록 구조 설계
- WebSocket 연동 가능성 고려 (실시간 업데이트)

## 참고 자료

- FastAPI 인증: https://fastapi.tiangolo.com/tutorial/security/
- Next.js Authentication: https://nextjs.org/docs/app/building-your-application/authentication
- SQLAlchemy Relationships: https://docs.sqlalchemy.org/en/20/orm/relationships.html
