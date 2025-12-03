# ItemLink 설치 및 실행 가이드

## 1. 사전 준비

### 필수 소프트웨어 설치
- Node.js 18 이상
- PostgreSQL 14 이상
- npm 또는 yarn

## 2. 데이터베이스 설정

### PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE itemlink;

# 데이터베이스 연결
\c itemlink

# 스키마 실행
\i backend/src/config/schema.sql
```

또는 직접 SQL 실행:

```bash
psql -U postgres -d itemlink -f backend/src/config/schema.sql
```

## 3. 백엔드 설정

### 환경 변수 설정

[backend/.env](backend/.env) 파일이 이미 생성되어 있습니다. PostgreSQL 비밀번호를 본인의 설정에 맞게 변경하세요:

```env
DB_PASSWORD=your_postgresql_password
```

### 의존성 설치 및 실행

```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

백엔드 서버가 http://localhost:5000 에서 실행됩니다.

### API 테스트

브라우저나 curl로 테스트:

```bash
# 헬스 체크
curl http://localhost:5000/health

# 데이터베이스 연결 테스트
curl http://localhost:5000/api/test-db

# 게임 목록 조회
curl http://localhost:5000/api/games
```

## 4. 프론트엔드 설정

### 환경 변수 확인

[frontend/.env.local](frontend/.env.local) 파일이 이미 생성되어 있습니다.

### 의존성 설치 및 실행

```bash
# frontend 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드가 http://localhost:3000 에서 실행됩니다.

## 5. 동시 실행 (권장)

루트 디렉토리에서 프론트엔드와 백엔드를 동시에 실행:

```bash
# 루트 디렉토리에서
npm install

# 프론트엔드와 백엔드 동시 실행
npm run dev
```

## 6. 빌드 (프로덕션)

### 백엔드 빌드

```bash
cd backend
npm run build
npm start
```

### 프론트엔드 빌드

```bash
cd frontend
npm run build
npm start
```

## 7. API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/profile` - 프로필 조회 (인증 필요)

### 게임 (Games)
- `GET /api/games` - 게임 목록
- `GET /api/games/:id` - 게임 상세
- `GET /api/games/:gameId/categories` - 게임별 카테고리

### 아이템 (Items)
- `GET /api/items` - 아이템 목록 (필터링, 페이지네이션)
- `GET /api/items/:id` - 아이템 상세
- `POST /api/items` - 아이템 등록 (인증 필요)
- `PUT /api/items/:id` - 아이템 수정 (인증 필요)
- `DELETE /api/items/:id` - 아이템 삭제 (인증 필요)

### 거래 (Transactions)
- `POST /api/transactions` - 거래 생성 (인증 필요)
- `GET /api/transactions` - 거래 목록 (인증 필요)
- `GET /api/transactions/:id` - 거래 상세 (인증 필요)
- `PATCH /api/transactions/:id/status` - 거래 상태 변경 (인증 필요)

## 8. 문제 해결

### 데이터베이스 연결 실패
- PostgreSQL이 실행 중인지 확인
- [backend/.env](backend/.env)의 데이터베이스 설정 확인
- 방화벽 설정 확인

### 포트 충돌
- 다른 프로그램이 5000번 또는 3000번 포트를 사용 중인지 확인
- [backend/.env](backend/.env)에서 PORT 변경 가능

### CORS 에러
- 백엔드 [backend/.env](backend/.env)의 FRONTEND_URL 확인
- 프론트엔드와 백엔드가 모두 실행 중인지 확인

## 9. 다음 단계

MVP 완료 후 추가 기능:
- 리뷰/평점 시스템
- 결제 시스템 연동
- 이미지 업로드 기능
- 실시간 채팅
- 관리자 대시보드
- 검색 기능 고도화
