# ItemLink - Game Item Trading Platform

게임 아이템 및 머니 현거래 중개 플랫폼

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Authentication**: JWT
- **Payment**: 오픈뱅킹 API 연동 (마일리지 충전/환전)

## 주요 기능

### 사용자 기능
- ✅ **회원가입/로그인** - JWT 기반 인증, 비밀번호 변경
- ✅ **게임 아이템 등록/검색** - 아이템 CRUD, 필터링, 정렬
- ✅ **거래 시스템** - 상태 관리 (PENDING → PAYMENT → DELIVERY → COMPLETED)
- ✅ **거래 메시지** - 실시간 채팅 (카카오톡 스타일)
- ✅ **결제 시스템** - 오픈뱅킹 API를 통한 마일리지 충전/환전
- ✅ **리뷰/평점 시스템** - 거래 완료 후 리뷰 작성, 평균 평점 자동 계산
- ✅ **사용자 프로필** - 받은 리뷰, 거래 통계
- ✅ **마일리지 시스템** - 충전, 환전, 거래 내역 조회

### 관리자 기능
- ✅ **대시보드** - 전체 통계 (사용자, 아이템, 거래, 리뷰)
- ✅ **사용자 관리** - 조회, 수정, 삭제, 역할 변경
- ✅ **아이템 관리** - 조회, 상태 변경, 삭제
- ✅ **게임 관리** - CRUD
- ✅ **거래 관리** - 조회, 상태 변경
- ✅ **리뷰 관리** - 조회, 삭제

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
```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/itemlink
DIRECT_URL=postgresql://user:password@localhost:5432/itemlink

# JWT Secret
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3000

# Open Banking API Configuration
OPENBANKING_CLIENT_ID=your_openbanking_client_id
OPENBANKING_CLIENT_SECRET=your_openbanking_client_secret
OPENBANKING_BASE_URL=https://testapi.openbanking.or.kr
OPENBANKING_CALLBACK_URL=http://localhost:3000/callback/openbanking
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## MVP 개발 로드맵

1. ✅ 프로젝트 초기 설정
2. ✅ 데이터베이스 스키마 설계 (Prisma)
3. ✅ 인증 시스템 구현 (JWT, 비밀번호 변경)
4. ✅ 아이템 CRUD 구현 (필터링, 정렬, 검색)
5. ✅ 거래 시스템 구현 (상태 관리, 메시지, 수량 관리)
6. ✅ 결제 시스템 (목업 - 은행 송금)
7. ✅ 리뷰 시스템 (CRUD, 평점 자동 계산)
8. ✅ 관리자 기능 (대시보드, 전체 관리)

## API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/profile` - 프로필 조회
- `PUT /api/auth/profile` - 프로필 수정
- `PUT /api/auth/change-password` - 비밀번호 변경

### 아이템 (Items)
- `GET /api/items` - 아이템 목록 (필터링, 페이지네이션)
- `GET /api/items/:id` - 아이템 상세
- `POST /api/items` - 아이템 생성
- `PUT /api/items/:id` - 아이템 수정
- `DELETE /api/items/:id` - 아이템 삭제

### 거래 (Transactions)
- `POST /api/transactions` - 거래 생성
- `GET /api/transactions` - 내 거래 목록
- `GET /api/transactions/:id` - 거래 상세
- `PATCH /api/transactions/:id/status` - 거래 상태 변경

### 리뷰 (Reviews)
- `POST /api/reviews` - 리뷰 작성
- `GET /api/reviews` - 리뷰 목록
- `GET /api/reviews/:id` - 리뷰 상세
- `PUT /api/reviews/:id` - 리뷰 수정
- `DELETE /api/reviews/:id` - 리뷰 삭제
- `GET /api/reviews/user/:userId/rating` - 사용자 평점 조회

### 메시지 (Messages)
- `POST /api/messages` - 메시지 전송
- `GET /api/messages/transaction/:transactionId` - 거래 메시지 조회
- `GET /api/messages/unread-count` - 읽지 않은 메시지 수
- `PATCH /api/messages/:id/read` - 메시지 읽음 처리

### 결제 (Payments)
- `GET /api/payments/balance` - 마일리지 잔액 조회
- `POST /api/payments/deposit` - 마일리지 충전 (최소: 1,000원, 최대: 10,000,000원)
- `POST /api/payments/withdraw` - 마일리지 환전 (최소: 1,000원, 최대: 10,000,000원)
- `GET /api/payments/transactions` - 결제 내역 조회 (페이지네이션, 필터링)
- `GET /api/payments/transactions/:id` - 결제 상세 조회
- `POST /api/payments/bank-accounts` - 은행 계좌 등록 (자동 검증 및 마스킹)
- `GET /api/payments/bank-accounts` - 은행 계좌 목록 조회 (계좌번호 마스킹)
- `PATCH /api/payments/bank-accounts/:id` - 은행 계좌 업데이트 (기본 계좌 설정)
- `DELETE /api/payments/bank-accounts/:id` - 은행 계좌 삭제 (거래 내역 보호)

### 게임 (Games)
- `GET /api/games` - 게임 목록
- `GET /api/games/:id` - 게임 상세
- `GET /api/games/:gameId/categories` - 게임 카테고리

### 관리자 (Admin) - 관리자 권한 필요
- `GET /api/admin/dashboard/stats` - 대시보드 통계
- `GET /api/admin/users` - 사용자 관리
- `GET /api/admin/items` - 아이템 관리
- `GET /api/admin/games` - 게임 관리
- `GET /api/admin/transactions` - 거래 관리
- `GET /api/admin/reviews` - 리뷰 관리

## 마일리지 시스템 사용 가이드

### 오픈뱅킹 API 설정

1. **오픈뱅킹 개발자 센터 등록**
   - https://www.openbanking.or.kr 접속
   - 개발자 등록 및 앱 생성
   - Client ID 및 Client Secret 발급

2. **환경 변수 설정**
   - `.env` 파일에 오픈뱅킹 API 정보 추가
   - `OPENBANKING_CLIENT_ID`, `OPENBANKING_CLIENT_SECRET` 설정
   - **Note:** 환경 변수 없이도 Mock 모드로 작동 가능

3. **마일리지 충전**
   ```bash
   POST /api/payments/deposit
   {
     "amount": 10000,  # 1,000 ~ 10,000,000원
     "paymentMethod": "OPEN_BANKING",
     "bankAccountId": "계좌ID (선택)"
   }
   ```

4. **마일리지 환전**
   ```bash
   POST /api/payments/withdraw
   {
     "amount": 5000,  # 1,000 ~ 10,000,000원
     "paymentMethod": "OPEN_BANKING",
     "bankAccountId": "계좌ID (필수)"
   }
   ```

5. **잔액 조회**
   ```bash
   GET /api/payments/balance
   ```

### 마일리지 시스템 특징 (v1.1.0 개선)

- **자동 잔액 관리**: 충전/환전 시 사용자 마일리지 잔액이 자동으로 업데이트됩니다
- **거래 내역 추적**: 모든 충전/환전 내역이 실패 원인과 함께 기록되어 조회 가능합니다
- **은행 계좌 관리**: 여러 은행 계좌를 등록하고 관리할 수 있습니다
- **트랜잭션 안전성**: 데이터베이스 트랜잭션으로 안전한 처리를 보장합니다
- **보안 강화**: 계좌번호 자동 마스킹, 입력 검증, 금액 한도 설정
- **에러 처리**: 명확한 에러 메시지와 실패 원인 추적
- **Mock 모드**: 실제 API 없이도 테스트 가능 (10% 실패 시뮬레이션)

### 개선 내역

상세한 개선 내역은 [PAYMENT_IMPROVEMENTS.md](./PAYMENT_IMPROVEMENTS.md)를 참고하세요.

**주요 개선사항:**
- ✅ 보안: 계좌번호 마스킹, 입력 검증 강화
- ✅ 안정성: 에러 처리 개선, 트랜잭션 최적화
- ✅ 성능: DB 트랜잭션 시간 단축
- ✅ 유지보수성: 코드 중복 제거, 타입 안전성 향상

## 테스트 계정

### 일반 사용자
- 이메일: `user1@example.com` / 비밀번호: `password123`
- 이메일: `user2@example.com` / 비밀번호: `password123`

### 관리자
- 이메일: `admin@example.com` / 비밀번호: `password123`

## 라이선스

MIT
