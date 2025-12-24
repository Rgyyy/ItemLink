# ItemLink - 게임 아이템 직거래 매칭 플랫폼

게이머들을 위한 직거래 매칭 플랫폼 - 게임 아이템 및 머니 직거래 중개

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Supabase, Prisma ORM)
- **Authentication**: JWT

## 주요 기능

### 사용자 기능
- ✅ **회원가입/로그인** - JWT 기반 인증
- ✅ **거래글 등록/검색** - 팝니다/삽니다 구분, 게임별 필터링
- ✅ **거래 시스템** - 5단계 상태 관리 (거래요청 → 조건합의 → 아이템전달 → 입금완료 → 거래완료)
- ✅ **거래 메시지** - 실시간 채팅
- ✅ **리뷰/평점 시스템** - 거래 완료 후 리뷰 작성
- ✅ **사용자 프로필** - 받은 리뷰, 거래 통계, 등급 시스템
- ✅ **신고 시스템** - 부적절한 사용자 신고

### 관리자 기능
- ✅ **대시보드** - 전체 통계 (사용자, 거래글, 거래, 리뷰, 신고, 차단)
- ✅ **사용자 관리** - 조회, 수정, 삭제, 차단
- ✅ **거래글 관리** - 조회, 상태 변경, 삭제
- ✅ **거래 관리** - 조회, 상태 변경
- ✅ **리뷰 관리** - 조회, 삭제
- ✅ **신고 관리** - 신고 처리, 사용자 제재

## 프로젝트 구조

```
itemlink/
├── frontend/          # Next.js 프론트엔드
├── backend/           # Express 백엔드
└── package.json       # 루트 패키지 설정
```

## 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트엔드 + 백엔드 동시 실행)
npm run dev

# 개별 실행
npm run dev:frontend  # Next.js (http://localhost:3000)
npm run dev:backend   # Express (http://localhost:5000)
```

## 데이터베이스 설정

```sql
-- PostgreSQL 데이터베이스 생성
CREATE DATABASE itemlink;
```

## 환경 변수 설정

### Backend (.env)
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Supabase)
DATABASE_URL="postgresql://postgres.xxx:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# JWT Secret
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 개발 로드맵

1. ✅ 프로젝트 초기 설정
2. ✅ 데이터베이스 스키마 설계 (Prisma + Supabase)
3. ✅ 인증 시스템 구현 (JWT)
4. ✅ 거래글 CRUD 구현 (팝니다/삽니다, 게임별 필터링)
5. ✅ 거래 시스템 구현 (5단계 상태 관리, 메시지)
6. ✅ 리뷰 시스템 (CRUD, 평점 자동 계산)
7. ✅ 관리자 기능 (대시보드, 전체 관리)
8. ✅ 신고 시스템 (사용자 신고 및 제재)

## API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/profile` - 프로필 조회
- `PUT /api/auth/profile` - 프로필 수정

### 거래글 (Trades)
- `GET /api/trades` - 거래글 목록 (팝니다/삽니다, 게임별 필터링, 페이지네이션)
- `GET /api/trades/:id` - 거래글 상세
- `POST /api/trades` - 거래글 생성
- `PUT /api/trades/:id` - 거래글 수정
- `DELETE /api/trades/:id` - 거래글 삭제

### 거래 (Transactions)
- `POST /api/transactions` - 거래 생성
- `GET /api/transactions` - 내 거래 목록
- `GET /api/transactions/:id` - 거래 상세
- `PATCH /api/transactions/:id/status` - 거래 상태 변경 (5단계)

### 리뷰 (Reviews)
- `POST /api/reviews` - 리뷰 작성
- `GET /api/reviews` - 리뷰 목록
- `GET /api/reviews/:id` - 리뷰 상세
- `PUT /api/reviews/:id` - 리뷰 수정
- `DELETE /api/reviews/:id` - 리뷰 삭제

### 메시지 (Messages)
- `POST /api/messages` - 메시지 전송
- `GET /api/messages/transaction/:transactionId` - 거래 메시지 조회
- `GET /api/messages/unread-count` - 읽지 않은 메시지 수
- `PATCH /api/messages/:id/read` - 메시지 읽음 처리

### 신고 (Reports)
- `POST /api/reports` - 사용자 신고
- `GET /api/reports` - 내 신고 목록

### 관리자 (Admin) - 관리자 권한 필요
- `GET /api/admin/dashboard/stats` - 대시보드 통계
- `GET /api/admin/users` - 사용자 관리
- `GET /api/admin/trades` - 거래글 관리
- `GET /api/admin/transactions` - 거래 관리
- `GET /api/admin/reviews` - 리뷰 관리
- `GET /api/admin/reports` - 신고 관리
- `PATCH /api/admin/reports/:id` - 신고 처리

## 지원 게임

20개 게임 지원:
- 아이온2, 메이플스토리, 메이플스토리월드, 로스트아크, 던전앤파이터
- 오딘: 발할라 라이징, 리니지M, 패스오브엑자일2, 서든어택, 거상
- 리니지, 디아블로4, 바람의나라클래식, 디아블로2: 레저렉션, 마비노기
- 테일즈위버, 뱀피르, RF온라인넥스트, 삼국지전략판, 마비노기 모바일

## 테스트 계정

### 일반 사용자
- **NORMAL 등급**: `user1@example.com` / `password123`
- **TRUSTED 등급**: `user2@example.com` / `password123`
- **VETERAN 등급**: `user3@example.com` / `password123`

### 관리자
- `admin@example.com` / `password123`

## 라이선스

MIT
