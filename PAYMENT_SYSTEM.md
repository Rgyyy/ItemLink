# 마일리지 충전/환전 시스템 가이드

## 개요

ItemLink 플랫폼의 마일리지 시스템은 오픈뱅킹 API를 활용하여 사용자가 실제 계좌로 마일리지를 충전하고 환전할 수 있는 기능을 제공합니다.

## 시스템 아키텍처

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   사용자    │ ──▶  │  백엔드 API  │ ──▶  │ 오픈뱅킹 API   │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  PostgreSQL  │
                     └──────────────┘
```

## 데이터베이스 스키마

### User 모델 (추가 필드)
```prisma
model User {
  balance            Decimal              @default(0) @db.Decimal(12, 2)
  paymentTransactions PaymentTransaction[]
  bankAccounts       BankAccount[]
}
```

### PaymentTransaction 모델
```prisma
model PaymentTransaction {
  id                  String             @id @default(uuid())
  userId              String
  type                PaymentType        // DEPOSIT | WITHDRAWAL
  amount              Decimal            @db.Decimal(12, 2)
  status              PaymentStatus      // PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED
  paymentMethod       PaymentMethod      // OPEN_BANKING | CARD | VIRTUAL_ACCOUNT
  bankTransactionId   String?
  bankAccountId       String?
  description         String?
  failureReason       String?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  completedAt         DateTime?
}
```

### BankAccount 모델
```prisma
model BankAccount {
  id                  String               @id @default(uuid())
  userId              String
  bankCode            String
  bankName            String
  accountNumber       String
  accountHolderName   String
  isDefault           Boolean              @default(false)
  isVerified          Boolean              @default(false)
  openBankingToken    String?
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
}
```

## API 엔드포인트

### 1. 마일리지 잔액 조회
```http
GET /api/payments/balance
Authorization: Bearer {token}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "balance": "50000.00"
  }
}
```

### 2. 마일리지 충전
```http
POST /api/payments/deposit
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 10000,
  "paymentMethod": "OPEN_BANKING",
  "bankAccountId": "계좌ID (선택)"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Mileage deposited successfully",
  "data": {
    "transaction": {
      "id": "transaction-uuid",
      "type": "DEPOSIT",
      "amount": "10000.00",
      "status": "COMPLETED",
      "bankTransactionId": "MOCK_1234567890",
      "completedAt": "2025-12-08T12:00:00Z"
    },
    "newBalance": "60000.00"
  }
}
```

### 3. 마일리지 환전
```http
POST /api/payments/withdraw
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": "OPEN_BANKING",
  "bankAccountId": "계좌ID (필수)"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Mileage withdrawn successfully",
  "data": {
    "transaction": {
      "id": "transaction-uuid",
      "type": "WITHDRAWAL",
      "amount": "5000.00",
      "status": "COMPLETED",
      "bankTransactionId": "MOCK_1234567891",
      "completedAt": "2025-12-08T12:05:00Z"
    },
    "newBalance": "55000.00"
  }
}
```

### 4. 결제 내역 조회
```http
GET /api/payments/transactions?type=DEPOSIT&status=COMPLETED&page=1&limit=20
Authorization: Bearer {token}
```

**쿼리 파라미터:**
- `type`: DEPOSIT | WITHDRAWAL (선택)
- `status`: PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED (선택)
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20)

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction-uuid",
        "type": "DEPOSIT",
        "amount": "10000.00",
        "status": "COMPLETED",
        "paymentMethod": "OPEN_BANKING",
        "createdAt": "2025-12-08T12:00:00Z",
        "completedAt": "2025-12-08T12:00:05Z",
        "bankAccount": {
          "bankName": "우리은행",
          "accountNumber": "1002-***-****",
          "accountHolderName": "홍길동"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### 5. 은행 계좌 등록
```http
POST /api/payments/bank-accounts
Authorization: Bearer {token}
Content-Type: application/json

{
  "bankCode": "020",
  "bankName": "우리은행",
  "accountNumber": "1002123456789",
  "accountHolderName": "홍길동",
  "isDefault": true
}
```

### 6. 은행 계좌 목록 조회
```http
GET /api/payments/bank-accounts
Authorization: Bearer {token}
```

### 7. 은행 계좌 삭제
```http
DELETE /api/payments/bank-accounts/:id
Authorization: Bearer {token}
```

## 오픈뱅킹 API 통합

### 서비스 레이어 구조

`backend/src/services/openBankingService.ts` 파일에서 오픈뱅킹 API와의 통신을 처리합니다.

#### 주요 메서드:

1. **getAuthorizationUrl(userId)**: 사용자 인증 URL 생성
2. **getAccessToken(code)**: 인증 코드로 액세스 토큰 발급
3. **refreshAccessToken(refreshToken)**: 액세스 토큰 갱신
4. **getAccountList(accessToken, userSeqNo)**: 사용자 계좌 목록 조회
5. **getBalance(accessToken, bankCode, accountNumber)**: 계좌 잔액 조회
6. **transfer(accessToken, request)**: 계좌 이체 실행
7. **depositToUser(amount, description)**: 마일리지 충전 (Mock)
8. **withdrawFromUser(amount, description)**: 마일리지 환전 (Mock)

### 오픈뱅킹 API 인증 플로우

```
1. 사용자가 계좌 연동 요청
   ↓
2. getAuthorizationUrl()로 인증 URL 생성
   ↓
3. 사용자가 오픈뱅킹 페이지에서 계좌 인증
   ↓
4. 콜백으로 인증 코드 수신
   ↓
5. getAccessToken()으로 액세스 토큰 발급
   ↓
6. 토큰을 DB에 저장
   ↓
7. 이후 API 호출 시 토큰 사용
```

## 트랜잭션 처리 흐름

### 충전 프로세스

```javascript
// 1. 사용자 요청 검증
if (!amount || amount <= 0) {
  throw new Error('Invalid amount');
}

// 2. 데이터베이스 트랜잭션 시작
await prisma.$transaction(async (tx) => {
  // 3. 오픈뱅킹 API 호출
  const result = await openBankingService.depositToUser(amount);

  // 4. PaymentTransaction 레코드 생성
  const transaction = await tx.paymentTransaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      amount,
      status: result.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
      bankTransactionId: result.transactionId
    }
  });

  // 5. 성공 시 사용자 잔액 업데이트
  if (result.status === 'SUCCESS') {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } }
    });
  }
});
```

### 환전 프로세스

```javascript
// 1. 잔액 확인
const user = await prisma.user.findUnique({ where: { id: userId } });
if (user.balance < amount) {
  throw new Error('Insufficient balance');
}

// 2. 데이터베이스 트랜잭션 시작
await prisma.$transaction(async (tx) => {
  // 3. 오픈뱅킹 API 호출
  const result = await openBankingService.withdrawFromUser(amount);

  // 4. PaymentTransaction 레코드 생성
  const transaction = await tx.paymentTransaction.create({
    data: {
      userId,
      type: 'WITHDRAWAL',
      amount,
      status: result.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
      bankTransactionId: result.transactionId
    }
  });

  // 5. 성공 시 사용자 잔액 차감
  if (result.status === 'SUCCESS') {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } }
    });
  }
});
```

## 보안 고려사항

### 1. 인증 및 권한
- 모든 결제 API는 JWT 인증 필수
- 사용자는 본인의 거래 내역만 조회 가능
- 관리자는 전체 거래 내역 조회 가능

### 2. 트랜잭션 안전성
- Prisma 트랜잭션을 사용하여 원자성 보장
- 충전/환전 실패 시 자동 롤백
- 중복 거래 방지 메커니즘

### 3. 금액 검증
- 최소/최대 충전/환전 금액 제한
- 소수점 처리 (Decimal 타입 사용)
- 잔액 부족 시 환전 차단

### 4. API 보안
- 오픈뱅킹 API 키는 환경 변수로 관리
- HTTPS 통신 필수
- 토큰 만료 시간 관리

## 에러 처리

### 일반 에러 코드

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 400 | Invalid amount | 유효하지 않은 금액 |
| 400 | Insufficient balance | 잔액 부족 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not found | 리소스 없음 |
| 500 | Internal server error | 서버 오류 |

### 오픈뱅킹 API 에러

```javascript
try {
  const result = await openBankingService.transfer(...);
} catch (error) {
  if (error.response?.data?.rsp_code) {
    // 오픈뱅킹 API 에러 처리
    switch (error.response.data.rsp_code) {
      case 'A0001':
        throw new Error('계좌 인증 실패');
      case 'A0002':
        throw new Error('잔액 부족');
      default:
        throw new Error('결제 처리 실패');
    }
  }
}
```

## 테스트

### 개발 환경 설정

1. **오픈뱅킹 테스트 환경 사용**
   ```
   OPENBANKING_BASE_URL=https://testapi.openbanking.or.kr
   ```

2. **Mock 데이터 사용**
   - 현재 `depositToUser()` 및 `withdrawFromUser()` 메서드는 Mock 데이터 반환
   - 실제 API 연동 전 테스트 가능

### API 테스트 예시 (curl)

```bash
# 1. 로그인
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}'

# 2. 잔액 조회
curl -X GET http://localhost:5000/api/payments/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. 마일리지 충전
curl -X POST http://localhost:5000/api/payments/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"paymentMethod":"OPEN_BANKING"}'

# 4. 마일리지 환전
curl -X POST http://localhost:5000/api/payments/withdraw \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"paymentMethod":"OPEN_BANKING"}'

# 5. 거래 내역 조회
curl -X GET http://localhost:5000/api/payments/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 향후 개선 사항

1. **실제 오픈뱅킹 API 연동**
   - Mock 메서드를 실제 API 호출로 교체
   - 토큰 관리 시스템 구현
   - 계좌 인증 플로우 완성

2. **결제 수단 확장**
   - 신용카드 결제 연동
   - 가상계좌 발급
   - 간편결제 연동 (카카오페이, 네이버페이 등)

3. **보안 강화**
   - 2FA (이중 인증) 추가
   - 거래 한도 설정
   - 의심스러운 거래 감지

4. **사용자 경험 개선**
   - 결제 상태 실시간 알림
   - 거래 내역 엑셀 다운로드
   - 자동 충전 기능

5. **관리자 기능**
   - 결제 통계 대시보드
   - 환불 처리 기능
   - 거래 취소/정정 기능

## 문제 해결

### Q: 충전이 안 됩니다
A:
- 오픈뱅킹 API 키가 올바르게 설정되었는지 확인
- 데이터베이스 연결 상태 확인
- 로그에서 에러 메시지 확인

### Q: 잔액이 업데이트되지 않습니다
A:
- 트랜잭션이 COMPLETED 상태인지 확인
- 데이터베이스 트랜잭션이 정상적으로 커밋되었는지 확인
- Prisma 클라이언트 재생성 (`npx prisma generate`)

### Q: 오픈뱅킹 API 연동 오류
A:
- API 키 유효성 확인
- 테스트 환경 URL 확인
- 네트워크 연결 상태 확인

## 참고 자료

- [오픈뱅킹 공식 문서](https://www.openbanking.or.kr)
- [Prisma 트랜잭션 가이드](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Express.js 공식 문서](https://expressjs.com)
