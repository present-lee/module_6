# Kanban 보드 개발 진행 상황

> 이 문서는 [@.claude\docs\plan.md](plan.md) 계획의 진행 및 완료 상황을 추적합니다.
>
> `[ ]` 미완료 / `[x]` 완료

마지막 업데이트: 2026-02-03 (Phase 1 완료)

---

## Phase 1: 기본 인프라

### 데이터베이스 모델 구현
- [x] Users 모델 생성
  - [x] id, username, email, hashed_password 필드
  - [x] role 필드 (admin/member/viewer)
  - [x] created_at 필드
- [x] Categories 모델 생성
  - [x] id, name, order, color 필드
  - [x] created_at 필드
- [x] Tasks 모델 생성
  - [x] id, title, description 필드
  - [x] category_id, assigned_to, created_by FK 설정
  - [x] start_date, due_date, priority 필드
  - [x] order, created_at, updated_at 필드
- [x] 모델 간 관계 설정 (ForeignKey, Relationship)
- [x] 데이터베이스 초기화 및 마이그레이션

### 인증 API 구현
- [x] POST /api/auth/register - 회원가입
  - [x] Pydantic 스키마 정의 (UserCreate, UserResponse)
  - [x] 비밀번호 해싱 (passlib + bcrypt)
  - [x] 중복 이메일 검증
- [x] POST /api/auth/login - 로그인
  - [x] JWT 토큰 생성 (python-jose)
  - [x] 비밀번호 검증
  - [x] 토큰 반환
- [x] GET /api/auth/me - 현재 사용자 정보
  - [x] JWT 토큰 검증 미들웨어
  - [x] 현재 사용자 반환

### 프론트엔드 인증 페이지
- [x] /login 페이지 구현
  - [x] 로그인 폼 UI
  - [x] API 연동
  - [x] 에러 처리
  - [x] JWT 토큰 저장 (localStorage/cookie)
- [x] /register 페이지 구현
  - [x] 회원가입 폼 UI
  - [x] API 연동
  - [x] 입력 검증
  - [x] 에러 처리
- [x] 인증 상태 관리 (Context API 또는 상태관리)
- [x] Protected Route 구현

---

## Phase 2: Kanban 보드 핵심 기능

### 카테고리 API
- [ ] GET /api/categories - 카테고리 목록
- [ ] POST /api/categories - 카테고리 생성
- [ ] PUT /api/categories/{id} - 카테고리 수정
- [ ] DELETE /api/categories/{id} - 카테고리 삭제
- [ ] PUT /api/categories/reorder - 카테고리 순서 변경
- [ ] Pydantic 스키마 (CategoryCreate, CategoryUpdate, CategoryResponse)

### 일감 API
- [ ] GET /api/tasks - 일감 목록 (필터링 지원)
  - [ ] 카테고리별 필터
  - [ ] 담당자별 필터
  - [ ] 우선순위별 필터
- [ ] POST /api/tasks - 일감 생성
- [ ] GET /api/tasks/{id} - 일감 상세
- [ ] PUT /api/tasks/{id} - 일감 수정
- [ ] DELETE /api/tasks/{id} - 일감 삭제
- [ ] PUT /api/tasks/{id}/move - 일감 카테고리 이동
- [ ] Pydantic 스키마 (TaskCreate, TaskUpdate, TaskResponse)

### Kanban 보드 UI
- [ ] / 또는 /board 페이지 생성
- [ ] 카테고리 컬럼 레이아웃
  - [ ] ToDo, Processing, Issue, Done 컬럼 표시
  - [ ] 카테고리별 색상 적용
- [ ] 일감 카드 컴포넌트
  - [ ] 제목, 설명 표시
  - [ ] 담당자, 마감일 표시
  - [ ] 우선순위 표시
- [ ] 일감 생성 버튼 및 모달
- [ ] 일감 상세 보기 모달
- [ ] 일감 수정/삭제 기능

### 드래그 앤 드롭
- [ ] react-beautiful-dnd 또는 dnd-kit 설치
- [ ] 드래그 앤 드롭 이벤트 핸들러
- [ ] 카테고리 간 이동 API 연동
- [ ] 같은 카테고리 내 순서 변경
- [ ] 드래그 중 시각적 피드백

---

## Phase 3: 권한 관리

### 역할 기반 권한 미들웨어
- [ ] 권한 검증 데코레이터/미들웨어 구현
- [ ] Admin 전용 엔드포인트 보호
- [ ] Member/Viewer 권한 검증

### 사용자 관리 API (Admin)
- [ ] GET /api/users - 사용자 목록
- [ ] GET /api/users/{id} - 사용자 상세
- [ ] PUT /api/users/{id} - 사용자 수정 (역할 변경)
- [ ] DELETE /api/users/{id} - 사용자 삭제

### 사용자 관리 페이지
- [ ] /settings/users 페이지 (Admin only)
  - [ ] 사용자 목록 테이블
  - [ ] 역할 변경 기능
  - [ ] 사용자 삭제 기능

### 권한별 UI 제어
- [ ] Admin: 모든 기능 접근
- [ ] Member: 일감 생성/수정만 가능
- [ ] Viewer: 읽기 전용
- [ ] 권한에 따른 버튼/메뉴 표시/숨김

---

## Phase 4: 간트차트

### 간트차트 API
- [ ] GET /api/tasks/gantt - 간트차트용 데이터
  - [ ] start_date, due_date 포함
  - [ ] 담당자, 카테고리 정보 포함
  - [ ] 필터링 지원

### 간트차트 UI
- [ ] /gantt 페이지 생성
- [ ] react-gantt-chart 또는 dhtmlx-gantt 설치
- [ ] 간트차트 렌더링
  - [ ] 일감별 타임라인 표시
  - [ ] 마감일 표시
  - [ ] 담당자 정보 표시

### 필터링 기능
- [ ] 담당자별 필터
- [ ] 카테고리별 필터
- [ ] 날짜 범위 필터
- [ ] 우선순위별 필터

---

## Phase 5: 추가 기능 및 개선

### 검색 및 필터링
- [ ] 일감 검색 API
- [ ] 검색 UI (제목, 설명 기반)
- [ ] 고급 필터 UI

### 알림 기능 (선택사항)
- [ ] 알림 모델 및 API
- [ ] 마감일 임박 알림
- [ ] 일감 배정 알림
- [ ] 알림 UI

### 댓글 기능 (선택사항)
- [ ] 댓글 모델 및 API
- [ ] 일감 상세 페이지에 댓글 섹션
- [ ] 댓글 작성/수정/삭제

### 파일 첨부 (선택사항)
- [ ] 파일 업로드 API
- [ ] 파일 저장소 설정
- [ ] 일감에 파일 첨부 기능
- [ ] 파일 다운로드 기능

### UI/UX 개선
- [ ] 반응형 디자인 적용
- [ ] 로딩 상태 표시
- [ ] 에러 메시지 개선
- [ ] 다크 모드 지원
- [ ] 애니메이션 및 트랜지션

---

## 추가 작업

### 설정 페이지
- [ ] /settings 페이지 생성
- [ ] /settings/categories - 카테고리 관리
  - [ ] 카테고리 추가/수정/삭제
  - [ ] 순서 변경
  - [ ] 색상 변경

### 테스트
- [ ] 백엔드 단위 테스트
- [ ] 백엔드 통합 테스트
- [ ] 프론트엔드 컴포넌트 테스트
- [ ] E2E 테스트

### 배포 준비
- [ ] 환경변수 설정 (.env)
- [ ] 프로덕션 빌드 설정
- [ ] HTTPS 설정
- [ ] 보안 점검 (XSS, CSRF, SQL Injection)

---

## 참고사항

### 현재 작업 중
<!-- 현재 진행 중인 작업을 여기에 기록 -->
- Phase 1 완료

### 발견된 이슈
<!-- 개발 중 발견된 이슈나 TODO를 여기에 기록 -->
- 없음

### 다음 우선순위
<!-- 다음에 작업할 항목을 여기에 기록 -->
1. Phase 2: Kanban 보드 핵심 기능
   - 카테고리 API 및 일감 API 구현
   - Kanban 보드 UI 및 드래그 앤 드롭 기능
