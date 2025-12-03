# 프론트엔드 개발 현황

## ✅ 완료된 작업

### 1. 핵심 인프라
- ✅ API 클라이언트 유틸리티 ([src/lib/api.ts](frontend/src/lib/api.ts))
  - 인증, 게임, 아이템, 거래 API 엔드포인트 구현
  - JWT 토큰 자동 처리
  - 에러 핸들링

- ✅ AuthContext ([src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx))
  - 로그인/로그아웃 상태 관리
  - 회원가입/로그인 함수 제공
  - localStorage 기반 토큰 관리
  - 자동 인증 상태 체크

### 2. UI 컴포넌트
- ✅ Button 컴포넌트 ([src/components/ui/Button.tsx](frontend/src/components/ui/Button.tsx))
  - primary, secondary, outline, danger 스타일
  - sm, md, lg 크기 지원

- ✅ Input 컴포넌트 ([src/components/ui/Input.tsx](frontend/src/components/ui/Input.tsx))
  - 라벨, 에러 메시지 지원
  - 포커스 스타일

- ✅ Card 컴포넌트 ([src/components/ui/Card.tsx](frontend/src/components/ui/Card.tsx))
  - Card, CardHeader, CardBody, CardFooter
  - 그림자 효과

### 3. 레이아웃 컴포넌트
- ✅ Header ([src/components/layout/Header.tsx](frontend/src/components/layout/Header.tsx))
  - 네비게이션 메뉴
  - 로그인 상태에 따른 UI 변화
  - 로그인/로그아웃 버튼

- ✅ Footer ([src/components/layout/Footer.tsx](frontend/src/components/layout/Footer.tsx))
  - 저작권 정보
  - 링크

- ✅ Root Layout ([app/layout.tsx](frontend/app/layout.tsx))
  - AuthProvider 적용
  - 전역 레이아웃 구조

### 4. 페이지
- ✅ 메인 홈 페이지 ([app/page.tsx](frontend/app/page.tsx))
  - Hero 섹션
  - 주요 기능 소개
  - 최근 등록된 아이템 표시 (최대 6개)
  - CTA(Call To Action) 섹션

- ✅ 로그인 페이지 ([app/login/page.tsx](frontend/app/login/page.tsx))
  - 이메일/비밀번호 로그인
  - 에러 메시지 표시
  - 회원가입 링크

- ✅ 회원가입 페이지 ([app/register/page.tsx](frontend/app/register/page.tsx))
  - 이메일, 사용자명, 이름, 전화번호, 비밀번호 입력
  - 클라이언트 사이드 유효성 검사
  - 비밀번호 확인
  - 에러 메시지 표시

- ✅ 아이템 목록 페이지 ([app/items/page.tsx](frontend/app/items/page.tsx))
  - 게임별 필터링
  - 가격 범위 필터
  - 검색 기능
  - 그리드 레이아웃 (반응형)
  - 상세보기 링크

## 🔄 진행 중인 작업

### 데이터베이스 설정
- Prisma 스키마 푸시 진행 중
- Supabase PostgreSQL 연결 테스트

## 📋 다음 작업 계획

### 1. 추가 페이지 개발
- [ ] 아이템 상세 페이지 ([/items/[id]](frontend/app/items/[id]/page.tsx))
  - 아이템 정보 표시
  - 구매 버튼
  - 판매자 정보

- [ ] 아이템 등록 페이지 ([/items/new](frontend/app/items/new/page.tsx))
  - 게임 선택
  - 아이템 정보 입력
  - 이미지 업로드 (추후)

- [ ] 거래 내역 페이지 ([/transactions](frontend/app/transactions/page.tsx))
  - 판매 내역
  - 구매 내역
  - 거래 상태 표시

- [ ] 거래 상세 페이지 ([/transactions/[id]](frontend/app/transactions/[id]/page.tsx))
  - 거래 정보
  - 상태 변경 버튼
  - 메시지 기능 (추후)

### 2. 기능 개선
- [ ] 로딩 스피너 컴포넌트
- [ ] Toast 알림 시스템
- [ ] 이미지 업로드 기능
- [ ] 페이지네이션 개선
- [ ] 검색 디바운싱
- [ ] 반응형 모바일 메뉴

### 3. 데이터 초기화
- [ ] 게임 데이터 시딩
- [ ] 샘플 아이템 데이터

## 🚀 실행 방법

### 개발 서버 실행
```bash
# 프론트엔드
cd frontend
npm run dev

# 백엔드
cd backend
npm run dev

# 또는 루트에서 동시 실행
npm run dev
```

### 접속 URL
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5000

## 🎨 디자인 시스템

### 색상
- Primary (파랑): `blue-600`, `blue-700`, `blue-800`
- Secondary (회색): `gray-600`, `gray-700`
- Success (초록): `green-100`, `green-800`
- Danger (빨강): `red-50`, `red-600`, `red-700`
- Text: `gray-500`, `gray-600`, `gray-700`, `black`

### 타이포그래피
- 헤딩: `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`
- 본문: `text-sm`, `text-base`, `text-lg`, `text-xl`
- Font Weight: `font-medium`, `font-semibold`, `font-bold`

### 간격
- Padding: `px-3`, `px-4`, `px-6`, `py-2`, `py-3`, `py-4`
- Margin: `mb-2`, `mb-4`, `mb-8`, `mb-12`
- Gap: `gap-4`, `gap-6`, `gap-8`

## 📝 주요 기능

### 인증
- JWT 기반 토큰 인증
- localStorage 저장
- 자동 로그인 유지
- 인증이 필요한 페이지 보호

### 아이템 관리
- 목록 조회 (필터링, 검색)
- 상세 조회
- 등록 (로그인 필요)
- 수정/삭제 (본인 아이템만)

### 거래 시스템
- 거래 생성
- 거래 상태 관리
- 구매/판매 내역 조회

## 🐛 알려진 이슈

1. ~~TypeScript 경로 에러~~ ✅ 해결 (tsconfig.json paths 수정)
2. 데이터베이스 연결 - Supabase 연결 테스트 중

## 📚 참고 문서

- [Next.js 16 문서](https://nextjs.org/docs)
- [Tailwind CSS 4](https://tailwindcss.com/docs)
- [Prisma 문서](https://www.prisma.io/docs)
- [API 테스트 가이드](../TEST_API.md)
