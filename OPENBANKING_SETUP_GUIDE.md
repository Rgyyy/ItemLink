# 실제 오픈뱅킹 API 사용 가이드

## 목차
1. [오픈뱅킹 센터 가입](#1-오픈뱅킹-센터-가입)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [필요한 코드 구현](#3-필요한-코드-구현)
4. [OAuth 2.0 인증 플로우](#4-oauth-20-인증-플로우)
5. [테스트 절차](#5-테스트-절차)
6. [문제 해결](#6-문제-해결)

---

## 1. 오픈뱅킹 센터 가입

### 1.1 오픈뱅킹 센터 회원가입
1. **오픈뱅킹 센터 접속**: https://www.openbanking.or.kr
2. **회원가입** 클릭
3. **이용기관 회원가입** 선택
4. 필요 서류 준비:
   - 사업자등록증
   - 대표자 신분증
   - 통장 사본

### 1.2 서비스 신청
1. 로그인 후 **서비스 신청** 메뉴 선택
2. **핀테크 서비스** 신청
3. 서비스 유형 선택:
   - 결제대행형 PG (Payment Gateway)
   - 계좌조회/이체 서비스
4. 신청서 작성 및 제출

### 1.3 심사 및 승인
- 심사 기간: 약 2~4주
- 승인 후 **Client ID**와 **Client Secret** 발급됨

### 1.4 테스트 환경 이용
- 실제 서비스 승인 전에 **샌드박스 환경**을 사용할 수 있습니다
- 테스트용 Client ID/Secret 발급 가능
- 테스트 계좌로 실제 거래 없이 API 테스트 가능

**샌드박스 신청:**
```
오픈뱅킹 센터 로그인 → 샌드박스 신청 → 테스트 계정 발급
```

---

## 2. 환경 변수 설정

### 2.1 `.env` 파일에 오픈뱅킹 정보 추가

**backend/.env** 파일에 다음 내용 추가:

```env
# OpenBanking Configuration
OPENBANKING_CLIENT_ID=your_client_id_here
OPENBANKING_CLIENT_SECRET=your_client_secret_here
OPENBANKING_BASE_URL=https://testapi.openbanking.or.kr  # 테스트 환경
# OPENBANKING_BASE_URL=https://api.openbanking.or.kr     # 실제 환경
OPENBANKING_CALLBACK_URL=http://localhost:5000/api/payments/callback
```

### 2.2 환경별 URL
| 환경 | Base URL |
|------|----------|
| 샌드박스 (테스트) | https://testapi.openbanking.or.kr |
| 프로덕션 (실제) | https://api.openbanking.or.kr |

### 2.3 환경 변수 예제

**테스트 환경 예제:**
```env
OPENBANKING_CLIENT_ID=T12345678901234567890
OPENBANKING_CLIENT_SECRET=ab12cd34-ef56-gh78-ij90-kl1234567890
OPENBANKING_BASE_URL=https://testapi.openbanking.or.kr
OPENBANKING_CALLBACK_URL=http://localhost:5000/api/payments/callback
```

---

## 3. 필요한 코드 구현

현재 `depositToUser()`와 `withdrawFromUser()` 메서드는 실제 구현이 없습니다. 다음과 같이 구현이 필요합니다:

### 3.1 사용자 계좌 연동 필요

실제 오픈뱅킹을 사용하려면 사용자가 자신의 은행 계좌를 연동해야 합니다.

**필요한 추가 기능:**
1. **OAuth 인증 엔드포인트** (사용자가 은행 계좌 연동 동의)
2. **액세스 토큰 저장** (사용자별 오픈뱅킹 액세스 토큰 저장)
3. **계좌 정보 조회** (연동된 계좌 목록)
4. **입출금 이체** (실제 계좌 이체 구현)

### 3.2 데이터베이스 스키마 추가 필요

**prisma/schema.prisma**에 다음 필드 추가 권장:

```prisma
model User {
  id                    String   @id @default(uuid())
  // ... 기존 필드들 ...

  // 오픈뱅킹 관련 필드 추가
  openbankingAccessToken   String?  @map("openbanking_access_token")
  openbankingRefreshToken  String?  @map("openbanking_refresh_token")
  openbankingUserSeqNo     String?  @map("openbanking_user_seq_no")
  openbankingTokenExpiry   DateTime? @map("openbanking_token_expiry")
}
```

### 3.3 실제 API 구현 예제

**backend/src/services/openBankingService.ts** 수정 필요:

```typescript
async depositToUser(amount: number, description: string = 'Mileage Deposit'): Promise<TransferResponse> {
  if (this.isMockMode()) {
    // Mock 모드 코드 (현재 구현)
    return {
      transactionId: `MOCK_DEPOSIT_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'SUCCESS',
    };
  }

  // 실제 구현 필요:
  // 1. 사용자의 액세스 토큰 가져오기
  // 2. 플랫폼 계좌에서 사용자 계좌로 이체 (입금)
  // 3. 이체 결과 반환

  throw new OpenBankingError('Real deposit requires user account linking via OAuth');
}
```

---

## 4. OAuth 2.0 인증 플로우

실제 오픈뱅킹을 사용하려면 사용자가 계좌를 연동하는 OAuth 플로우가 필요합니다.

### 4.1 인증 플로우 다이어그램

```
사용자 → 웹앱 → 오픈뱅킹 센터 → 은행 → 계좌 동의 → 콜백 → 토큰 저장
```

### 4.2 단계별 구현

#### Step 1: 사용자가 "계좌 연동" 버튼 클릭

**프론트엔드:**
```typescript
// frontend/app/settings/page.tsx
const handleLinkAccount = async () => {
  const response = await api.getOpenbankingAuthUrl();
  window.location.href = response.data.authUrl;
};
```

#### Step 2: 백엔드에서 인증 URL 생성

**백엔드:**
```typescript
// backend/src/controllers/paymentController.ts
export const getAuthUrl = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const authUrl = await openBankingService.getAuthorizationUrl(userId);

  res.json({
    success: true,
    data: { authUrl }
  });
};
```

#### Step 3: 사용자가 은행 인증 및 동의

오픈뱅킹 센터 페이지로 리다이렉트됨:
- 은행 선택
- 계좌 선택
- 이용 동의

#### Step 4: 콜백으로 인증 코드 수신

```typescript
// backend/src/controllers/paymentController.ts
export const handleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // 1. 인증 코드로 액세스 토큰 교환
  const tokens = await openBankingService.getAccessToken(code as string);

  // 2. 토큰을 사용자 DB에 저장
  await prisma.user.update({
    where: { id: state as string },
    data: {
      openbankingAccessToken: tokens.accessToken,
      openbankingRefreshToken: tokens.refreshToken,
      openbankingUserSeqNo: tokens.userSeqNo,
      openbankingTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일
    }
  });

  // 3. 프론트엔드로 리다이렉트
  res.redirect(`${process.env.FRONTEND_URL}/settings?status=success`);
};
```

#### Step 5: 계좌 정보 조회

```typescript
// 사용자의 연동된 계좌 목록 조회
export const getLinkedAccounts = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openbankingAccessToken: true, openbankingUserSeqNo: true }
  });

  if (!user?.openbankingAccessToken) {
    return res.status(400).json({
      success: false,
      message: 'No linked bank account'
    });
  }

  const accounts = await openBankingService.getAccountList(
    user.openbankingAccessToken,
    user.openbankingUserSeqNo
  );

  res.json({
    success: true,
    data: { accounts }
  });
};
```

---

## 5. 테스트 절차

### 5.1 샌드박스 환경에서 테스트

1. **환경 변수 설정**
   ```env
   OPENBANKING_CLIENT_ID=T12345678901234567890
   OPENBANKING_CLIENT_SECRET=your_test_secret
   OPENBANKING_BASE_URL=https://testapi.openbanking.or.kr
   ```

2. **서버 재시작**
   ```bash
   cd backend
   npm run dev
   ```

3. **계좌 연동 테스트**
   - 웹앱에서 "계좌 연동" 클릭
   - 테스트 은행 선택
   - 테스트 계좌 선택 및 동의

4. **충전/환전 테스트**
   - 마일리지 충전 시도
   - 실제 API 호출 확인
   - 거래 결과 확인

### 5.2 로그 확인

```bash
# 백엔드 콘솔에서 확인
[OPENBANKING] Deposit request: 10000
[OPENBANKING] Transaction ID: T1234567890
[OPENBANKING] Status: SUCCESS
```

---

## 6. 문제 해결

### Q1: "Real deposit implementation not available" 에러

**원인:** 실제 오픈뱅킹 구현이 아직 완료되지 않음

**해결:**
1. Mock 모드 계속 사용 (환경 변수 설정 안 함)
2. 또는 위의 4장 OAuth 플로우 구현 완료

### Q2: "Unauthorized" 또는 "Invalid client_id" 에러

**원인:** Client ID/Secret이 잘못되었거나 만료됨

**해결:**
1. 오픈뱅킹 센터에서 Client ID/Secret 확인
2. `.env` 파일 정확히 입력했는지 확인
3. 서버 재시작

### Q3: "User account not linked" 에러

**원인:** 사용자가 계좌를 연동하지 않음

**해결:**
1. 웹앱에서 "설정" → "계좌 연동" 진행
2. OAuth 인증 완료

### Q4: 테스트 환경에서 실제 돈이 이동하나요?

**답변:**
- 샌드박스 환경 (testapi.openbanking.or.kr): **실제 돈 이동 없음**
- 프로덕션 환경 (api.openbanking.or.kr): **실제 돈 이동 발생**

---

## 현재 상태 및 다음 단계

### ✅ 현재 구현된 기능
- Mock 모드 마일리지 충전/환전
- 데이터베이스 거래 기록
- 프론트엔드 UI

### ⏳ 구현 필요한 기능 (실제 오픈뱅킹 사용)
1. OAuth 2.0 인증 엔드포인트
2. 사용자 액세스 토큰 저장
3. 계좌 연동 UI
4. 실제 API 호출 코드 (transfer, deposit, withdraw)
5. 토큰 갱신 로직

### 🚀 빠른 시작 (추천)

**방법 1: Mock 모드 계속 사용 (현재 상태)**
- 환경 변수 설정 없이 사용
- 개발/테스트 단계에 적합
- 실제 은행 연동 없이 기능 테스트 가능

**방법 2: 샌드박스 환경 사용**
1. 오픈뱅킹 센터에서 샌드박스 계정 발급
2. `.env`에 테스트 Client ID/Secret 설정
3. OAuth 인증 플로우 구현
4. 실제 API 테스트 (실제 돈 이동 없음)

**방법 3: 실제 환경 사용**
1. 사업자등록증 준비
2. 오픈뱅킹 센터 정식 가입 및 심사
3. 실제 Client ID/Secret 발급
4. 프로덕션 환경 설정
5. 실제 서비스 시작

---

## 참고 자료

- [오픈뱅킹 공식 문서](https://www.openbanking.or.kr)
- [오픈뱅킹 API 가이드](https://developers.openbanking.or.kr)
- [샌드박스 신청](https://www.openbanking.or.kr/sandbox)
- [핀테크 서비스 신청 안내](https://www.openbanking.or.kr/apply)

---

**문의:**
- 오픈뱅킹 센터 고객센터: 1544-3755
- 개발자 포럼: https://forum.openbanking.or.kr

---

**작성일:** 2025-12-08
**버전:** 1.0.0
