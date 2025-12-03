# ItemLink - Game Item Trading Platform

게임 아이템 및 머니 현거래 중개 플랫폼

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Payment**: (추후 연동 예정)

## 주요 기능

- ✅ 회원가입/로그인
- ✅ 게임 아이템 등록/검색
- ✅ 거래 시스템 (에스크로)
- ✅ 결제 시스템
- ✅ 리뷰/평점 시스템
- ✅ 관리자 페이지

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
DATABASE_URL=postgresql://user:password@localhost:5432/itemlink
JWT_SECRET=your-secret-key
PORT=5000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## MVP 개발 로드맵

1. ✅ 프로젝트 초기 설정
2. 🔄 데이터베이스 스키마 설계
3. 🔄 인증 시스템 구현
4. 🔄 아이템 CRUD 구현
5. 🔄 거래 시스템 구현
6. ⏳ 결제 연동
7. ⏳ 리뷰 시스템
8. ⏳ 관리자 기능

## 라이선스

MIT
