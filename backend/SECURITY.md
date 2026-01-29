# 보안 가이드

## 배포 전 필수 체크리스트

### 1. 환경 변수 설정

프로덕션 배포 전 반드시 다음 환경 변수를 설정하세요:

```bash
# 강력한 시크릿 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**필수 환경 변수:**
- `NODE_ENV=production`
- `JWT_SECRET` - 위 명령으로 생성한 랜덤 문자열
- `SESSION_SECRET` - 위 명령으로 생성한 랜덤 문자열
- `DATABASE_URL` - 프로덕션 데이터베이스 URL

### 2. HTTPS 설정

프로덕션에서는 반드시 HTTPS를 사용하세요:
- SSL/TLS 인증서 설치
- HTTP에서 HTTPS로 리다이렉트 설정
- `secure` 쿠키 플래그 활성화됨 (자동)

### 3. 데이터베이스 보안

- 데이터베이스 접근 IP 제한
- 강력한 데이터베이스 비밀번호 사용
- 정기적인 백업 설정
- 민감한 데이터 암호화

### 4. 파일 업로드 보안

현재 구현된 보안 기능:
- ✅ 파일 타입 검증 (이미지만 허용)
- ✅ 파일 크기 제한 (5MB)
- ✅ 경로 탐색 공격 방지
- ✅ 안전한 파일명 생성

**이미지 접근 방법:**
- ❌ 직접 접근: `/uploads/trade-images/image.jpg` (차단됨)
- ✅ API를 통한 접근: `/api/trades/images/image.jpg` (허용됨)

### 5. Rate Limiting

현재 설정된 제한:
- 로그인: 15분에 5회
- 회원가입: 1시간에 3회
- 이메일 인증: 프로덕션 1시간 3회 / 개발 1분 10회

### 6. 보안 헤더

Helmet이 다음 헤더를 자동 설정합니다:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS 사용 시)

### 7. CORS 정책

- JWT 기반 인증 사용 (쿠키 미사용)
- `credentials: false` 설정으로 CSRF 공격 방지
- 허용된 Origin만 접근 가능

## 보안 업데이트

### 의존성 취약점 스캔

정기적으로 실행하세요:

```bash
npm audit
npm audit fix
```

### 패키지 업데이트

```bash
npm update
npm outdated
```

## 알려진 보안 기능

### ✅ 구현된 보안 기능

1. **인증/인가**
   - JWT 토큰 기반 인증
   - bcrypt 비밀번호 해싱 (10 rounds)
   - 관리자 권한 검증

2. **입력 검증**
   - Prisma ORM (SQL 인젝션 방지)
   - Rate Limiting
   - 파일 업로드 검증

3. **보안 헤더**
   - Helmet 미들웨어
   - CORS 정책
   - 쿠키 보안 플래그 (httpOnly, sameSite)

4. **파일 보안**
   - 업로드 파일 타입 검증
   - 경로 탐색 공격 방지
   - 파일 크기 제한

### ⚠️ 추가 권장 사항

1. **입력 검증 강화**
   ```bash
   npm install express-validator
   ```

2. **로깅 시스템**
   ```bash
   npm install winston
   ```

3. **API 버전 관리**
   - `/api/v1/` 형식 도입

4. **모니터링**
   - Sentry 또는 LogRocket 설정
   - 에러 추적 및 알림

## 보안 사고 대응

보안 취약점을 발견하면:
1. 즉시 개발팀에 연락
2. 취약점 상세 정보 비공개 유지
3. 패치 배포 후 공개

## 연락처

보안 관련 문의: [보안 담당자 이메일]
