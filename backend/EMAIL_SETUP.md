# 이메일 인증 설정 가이드

## 개발 환경 (Development)

개발 환경에서는 두 가지 모드로 작동합니다:

### 1. 콘솔 출력 모드 (기본)
이메일 설정이 없거나 이메일 발송에 실패하면 **백엔드 서버 콘솔**에 인증 코드가 출력됩니다.

```
============================================================
📧 EMAIL VERIFICATION CODE (Development Mode)
============================================================
To: user@example.com
Code: 123456
============================================================
```

**이메일을 설정하지 않아도 개발이 가능합니다!**

### 2. 실제 이메일 발송 모드
.env 파일에 Gmail 설정을 추가하면 실제 이메일이 발송됩니다.

## Gmail 앱 비밀번호 설정 방법

### 1단계: Google 계정 설정
1. https://myaccount.google.com/ 접속
2. 왼쪽 메뉴에서 "보안" 클릭

### 2단계: 2단계 인증 활성화
1. "2단계 인증" 섹션 찾기
2. 아직 활성화하지 않았다면 활성화
3. 2단계 인증이 활성화되어야 앱 비밀번호를 생성할 수 있습니다

### 3단계: 앱 비밀번호 생성
1. "보안" 페이지에서 "앱 비밀번호" 검색
2. "앱 비밀번호" 클릭
3. 앱 선택: "메일"
4. 기기 선택: "Windows 컴퓨터" (또는 해당하는 기기)
5. "생성" 클릭
6. 생성된 16자리 비밀번호를 복사 (공백 제거)

### 4단계: .env 파일 설정
```env
NODE_ENV=development
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-digit-app-password
```

**주의:**
- `EMAIL_APP_PASSWORD`는 일반 Gmail 비밀번호가 아닌 **앱 비밀번호**입니다
- 공백 없이 16자리를 입력하세요

## 프로덕션 환경 (Production)

프로덕션 환경에서는 반드시 실제 이메일 설정이 필요합니다.

```env
NODE_ENV=production
EMAIL_USER=your-production-email@gmail.com
EMAIL_APP_PASSWORD=your-production-app-password
```

이메일 설정이 없으면 **에러가 발생**합니다.

## 문제 해결

### 이메일이 발송되지 않아요
1. **개발 환경**: 백엔드 서버 콘솔을 확인하세요. 인증 코드가 출력됩니다.
2. **Gmail 설정 확인**:
   - 2단계 인증이 활성화되어 있나요?
   - 앱 비밀번호를 올바르게 생성했나요?
   - .env 파일의 EMAIL_APP_PASSWORD에 공백이 없나요?

### "Failed to send verification code" 에러
개발 환경에서는 이 에러가 발생해도 **백엔드 콘솔에 인증 코드가 출력**됩니다. 콘솔을 확인하세요!

### Gmail 대신 다른 이메일 서비스를 사용하고 싶어요
`backend/src/config/email.ts` 파일의 설정을 변경하세요:

```typescript
emailTransporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});
```

## 테스트

백엔드 서버를 시작한 후:

```bash
cd backend
npm run dev
```

회원가입 시 이메일 인증을 요청하면:
- **이메일 설정 있음**: 실제 이메일 발송
- **이메일 설정 없음 (개발)**: 콘솔에 인증 코드 출력
- **이메일 발송 실패 (개발)**: 콘솔에 인증 코드 출력

모든 경우에 개발이 가능합니다! 🎉
