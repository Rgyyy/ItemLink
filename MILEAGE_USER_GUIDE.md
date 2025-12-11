# 마일리지 충전 및 사용 가이드

## 목차
1. [시스템 개요](#시스템-개요)
2. [빠른 시작](#빠른-시작)
3. [마일리지 충전하기](#마일리지-충전하기)
4. [마일리지 잔액 확인](#마일리지-잔액-확인)
5. [거래 내역 조회](#거래-내역-조회)
6. [마일리지 환전하기](#마일리지-환전하기)
7. [은행 계좌 관리](#은행-계좌-관리)
8. [API 사용 예제](#api-사용-예제)
9. [문제 해결](#문제-해결)

---

## 시스템 개요

ItemLink의 마일리지 시스템은 오픈뱅킹 API를 활용하여 실제 계좌로 마일리지를 충전하고 환전할 수 있는 기능을 제공합니다.

### 주요 기능
- ✅ 마일리지 충전 (1,000원 ~ 10,000,000원)
- ✅ 마일리지 환전 (1,000원 ~ 10,000,000원)
- ✅ 실시간 잔액 조회
- ✅ 거래 내역 추적
- ✅ 은행 계좌 관리
- ✅ 자동 검증 및 보안

### 테스트 환경
현재 Mock 모드로 작동하므로 실제 계좌 연결 없이 테스트 가능합니다.

---

## 빠른 시작

### 1. 서버 실행
```bash
npm run dev
```

### 2. 테스트 스크립트 실행
```bash
node test-payment.js
```

### 3. 테스트 계정
- 이메일: `user1@example.com`
- 비밀번호: `password123`

---

## 마일리지 충전하기

### HTTP 요청

```http
POST /api/payments/deposit
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 10000,
  "paymentMethod": "OPEN_BANKING",
  "bankAccountId": "계좌ID (선택사항)"
}
```

### curl 예제 (PowerShell)

```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
    amount = 10000
    paymentMethod = "OPEN_BANKING"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/payments/deposit" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

### JavaScript/Node.js 예제

```javascript
const axios = require('axios');

const token = 'YOUR_JWT_TOKEN';

const depositMileage = async (amount) => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/payments/deposit',
      {
        amount: amount,
        paymentMethod: 'OPEN_BANKING'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('충전 성공!');
    console.log('새 잔액:', response.data.data.newBalance);
    console.log('거래 ID:', response.data.data.transaction.id);
  } catch (error) {
    console.error('충전 실패:', error.response.data.message);
  }
};

// 10,000원 충전
depositMileage(10000);
```

### 응답 예제 (성공)

```json
{
  "success": true,
  "message": "Mileage deposited successfully",
  "data": {
    "transaction": {
      "id": "a9100ce9-a004-4465-8496-f4aecd0fba9e",
      "userId": "user-id",
      "type": "DEPOSIT",
      "amount": "10000.00",
      "status": "COMPLETED",
      "paymentMethod": "OPEN_BANKING",
      "bankTransactionId": "MOCK_DEPOSIT_1765176215373_2zvq08",
      "createdAt": "2025-12-08T06:43:35.373Z",
      "completedAt": "2025-12-08T06:43:35.380Z"
    },
    "newBalance": "10000.00"
  }
}
```

### 응답 예제 (실패)

```json
{
  "success": false,
  "message": "Deposit amount must be at least 1,000"
}
```

### 충전 제한사항

| 항목 | 제한 |
|------|------|
| 최소 충전 금액 | 1,000원 |
| 최대 충전 금액 | 10,000,000원 |
| 금액 단위 | 정수만 허용 (소수점 불가) |
| 결제 수단 | OPEN_BANKING, CARD, VIRTUAL_ACCOUNT |

---

## 마일리지 잔액 확인

### HTTP 요청

```http
GET /api/payments/balance
Authorization: Bearer YOUR_JWT_TOKEN
```

### JavaScript 예제

```javascript
const checkBalance = async () => {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/payments/balance',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const balance = Number(response.data.data.balance);
    console.log(`현재 잔액: ${balance.toLocaleString()}원`);
  } catch (error) {
    console.error('잔액 조회 실패:', error.response.data.message);
  }
};

checkBalance();
```

### 응답 예제

```json
{
  "success": true,
  "data": {
    "balance": "15000.00"
  }
}
```

---

## 거래 내역 조회

### HTTP 요청

```http
GET /api/payments/transactions?type=DEPOSIT&page=1&limit=20
Authorization: Bearer YOUR_JWT_TOKEN
```

### 쿼리 파라미터

| 파라미터 | 설명 | 필수 | 기본값 |
|----------|------|------|--------|
| type | DEPOSIT 또는 WITHDRAWAL | 아니오 | 전체 |
| status | PENDING, COMPLETED, FAILED 등 | 아니오 | 전체 |
| page | 페이지 번호 | 아니오 | 1 |
| limit | 페이지당 항목 수 | 아니오 | 20 |

### JavaScript 예제

```javascript
const getTransactions = async () => {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/payments/transactions',
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          type: 'DEPOSIT',
          limit: 5
        }
      }
    );

    const transactions = response.data.data.transactions;
    console.log(`총 거래 수: ${response.data.data.pagination.total}개`);

    transactions.forEach((tx, index) => {
      console.log(`[${index + 1}] ${tx.type} - ${Number(tx.amount).toLocaleString()}원`);
      console.log(`    상태: ${tx.status}`);
      console.log(`    일시: ${new Date(tx.createdAt).toLocaleString('ko-KR')}`);
    });
  } catch (error) {
    console.error('거래 내역 조회 실패:', error.response.data.message);
  }
};

getTransactions();
```

### 응답 예제

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction-id",
        "type": "DEPOSIT",
        "amount": "10000.00",
        "status": "COMPLETED",
        "paymentMethod": "OPEN_BANKING",
        "bankTransactionId": "MOCK_DEPOSIT_...",
        "createdAt": "2025-12-08T06:43:35.373Z",
        "completedAt": "2025-12-08T06:43:35.380Z",
        "bankAccount": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

## 마일리지 환전하기

### HTTP 요청

```http
POST /api/payments/withdraw
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": "OPEN_BANKING",
  "bankAccountId": "your-bank-account-id"
}
```

### JavaScript 예제

```javascript
const withdrawMileage = async (amount, bankAccountId) => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/payments/withdraw',
      {
        amount: amount,
        paymentMethod: 'OPEN_BANKING',
        bankAccountId: bankAccountId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('환전 성공!');
    console.log('환전 금액:', amount.toLocaleString());
    console.log('새 잔액:', response.data.data.newBalance);
  } catch (error) {
    console.error('환전 실패:', error.response.data.message);
  }
};

// 5,000원 환전
withdrawMileage(5000, 'bank-account-id');
```

### 환전 제한사항

| 항목 | 제한 |
|------|------|
| 최소 환전 금액 | 1,000원 |
| 최대 환전 금액 | 10,000,000원 |
| 잔액 확인 | 현재 잔액 이하만 가능 |
| 은행 계좌 | 필수 (등록된 본인 계좌) |

---

## 은행 계좌 관리

### 계좌 등록

```http
POST /api/payments/bank-accounts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "bankCode": "020",
  "bankName": "우리은행",
  "accountNumber": "1002123456789",
  "accountHolderName": "홍길동",
  "isDefault": true
}
```

### JavaScript 예제

```javascript
const addBankAccount = async (accountInfo) => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/payments/bank-accounts',
      accountInfo,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('계좌 등록 성공!');
    console.log('계좌:', response.data.data.bankAccount.accountNumber);
  } catch (error) {
    console.error('계좌 등록 실패:', error.response.data.message);
  }
};

// 계좌 등록
addBankAccount({
  bankCode: '020',
  bankName: '우리은행',
  accountNumber: '1002123456789',
  accountHolderName: '홍길동',
  isDefault: true
});
```

### 계좌 목록 조회

```http
GET /api/payments/bank-accounts
Authorization: Bearer YOUR_JWT_TOKEN
```

### 응답 예제 (보안: 계좌번호 마스킹)

```json
{
  "success": true,
  "data": {
    "bankAccounts": [
      {
        "id": "account-id",
        "bankCode": "020",
        "bankName": "우리은행",
        "accountNumber": "1002******789",
        "accountHolderName": "홍길동",
        "isDefault": true,
        "isVerified": false,
        "createdAt": "2025-12-08T06:00:00.000Z"
      }
    ]
  }
}
```

---

## API 사용 예제

### 전체 플로우 예제

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function fullMileageFlow() {
  try {
    // 1. 로그인
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user1@example.com',
      password: 'password123'
    });
    const token = loginRes.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 2. 초기 잔액 확인
    const balanceRes1 = await axios.get(`${BASE_URL}/payments/balance`, { headers });
    console.log('초기 잔액:', balanceRes1.data.data.balance);

    // 3. 마일리지 충전
    const depositRes = await axios.post(
      `${BASE_URL}/payments/deposit`,
      { amount: 10000, paymentMethod: 'OPEN_BANKING' },
      { headers }
    );
    console.log('충전 완료:', depositRes.data.data.newBalance);

    // 4. 충전 후 잔액 확인
    const balanceRes2 = await axios.get(`${BASE_URL}/payments/balance`, { headers });
    console.log('현재 잔액:', balanceRes2.data.data.balance);

    // 5. 거래 내역 조회
    const txRes = await axios.get(`${BASE_URL}/payments/transactions`, { headers });
    console.log('거래 내역:', txRes.data.data.transactions.length, '건');

  } catch (error) {
    console.error('에러:', error.response?.data?.message || error.message);
  }
}

fullMileageFlow();
```

---

## 문제 해결

### Q1: 충전이 실패합니다

**A:** 다음을 확인하세요:
- 금액이 1,000원 ~ 10,000,000원 범위인가요?
- 소수점이 포함되지 않았나요?
- JWT 토큰이 유효한가요?

### Q2: "Insufficient balance" 에러가 발생합니다

**A:** 현재 잔액이 환전하려는 금액보다 적습니다. 잔액을 먼저 확인하세요:
```bash
GET /api/payments/balance
```

### Q3: 계좌번호가 마스킹되어 보입니다

**A:** 이는 정상입니다. 보안을 위해 모든 API 응답에서 계좌번호는 자동으로 마스킹됩니다.
- 예: `1002123456789` → `1002******789`

### Q4: Mock 모드에서 실제 계좌로 전환하려면?

**A:** `.env` 파일에 오픈뱅킹 API 키를 설정하세요:
```env
OPENBANKING_CLIENT_ID=your_client_id
OPENBANKING_CLIENT_SECRET=your_client_secret
```

### Q5: 거래가 FAILED 상태입니다

**A:** Mock 모드에서는 10% 확률로 실패가 시뮬레이션됩니다. 이는 정상이며 실제 환경에서는 발생하지 않습니다.

---

## 테스트 시나리오

### 시나리오 1: 기본 충전
1. 로그인
2. 초기 잔액 확인
3. 10,000원 충전
4. 충전 후 잔액 확인
5. 거래 내역 확인

### 시나리오 2: 에러 케이스
1. 500원 충전 시도 (최소 금액 미만)
2. 20,000,000원 충전 시도 (최대 금액 초과)
3. 1000.50원 충전 시도 (소수점 포함)

### 시나리오 3: 환전
1. 은행 계좌 등록
2. 마일리지 충전
3. 마일리지 환전
4. 최종 잔액 확인

---

## 보안 주의사항

1. **JWT 토큰 보호**
   - 토큰을 안전하게 저장하세요
   - 공개 저장소에 토큰을 커밋하지 마세요

2. **계좌번호 마스킹**
   - 모든 API 응답에서 자동으로 마스킹됩니다
   - 실제 계좌번호는 DB에만 저장됩니다

3. **금액 검증**
   - 서버에서 자동으로 검증됩니다
   - 클라이언트 검증도 추가 권장

4. **HTTPS 사용**
   - 프로덕션에서는 반드시 HTTPS를 사용하세요

---

## 추가 리소스

- [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) - 전체 시스템 가이드
- [PAYMENT_IMPROVEMENTS.md](./PAYMENT_IMPROVEMENTS.md) - 개선 내역
- [README.md](./README.md) - 프로젝트 문서
- [오픈뱅킹 공식 문서](https://www.openbanking.or.kr)

---

## 문의

문제가 발생하거나 질문이 있으시면:
1. 이슈 트래커에 문의
2. 로그 확인 (`backend/logs`)
3. 서버 콘솔 출력 확인

---

**버전:** 1.1.0
**최종 업데이트:** 2025-12-08
