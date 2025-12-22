# 뱅크다(Bankda) API 연동 및 자동 입금 확인 시스템

## 개요

이 시스템은 뱅크다 API를 활용하여 사용자의 입금 요청을 자동으로 확인하고 마일리지를 충전하는 기능을 제공합니다.

## 주요 기능

1. **자동 입금 확인**: 뱅크다 API를 통해 계좌 거래 내역을 조회하고 사용자의 입금 요청과 자동 매칭
2. **마일리지 자동 충전**: 입금이 확인되면 자동으로 사용자 마일리지 충전
3. **매칭 로그 기록**: 모든 매칭 시도와 결과를 데이터베이스에 기록
4. **스케줄러**: 정기적으로 자동 입금 확인 프로세스 실행

## 환경 변수 설정

`.env` 파일에 다음 환경 변수를 추가하세요:

```env
# Bankda API Configuration
BANKDA_ACCOUNT_NUMBER=your_bankda_account_number
BANKDA_ACCESS_TOKEN=your_bankda_access_token
BANKDA_TEST_MODE=true

# Auto Deposit Matching
ENABLE_AUTO_DEPOSIT_MATCHING=true
DEPOSIT_MATCHING_CRON=*/10 * * * *

# Admin Bank Account Info
ADMIN_BANK_NAME=농협은행
ADMIN_ACCOUNT_NUMBER=352-1234-5678-90
ADMIN_ACCOUNT_HOLDER=아이템링크
```

### 환경 변수 설명

- `BANKDA_ACCOUNT_NUMBER`: 뱅크다에 등록된 계좌번호 (숫자만)
- `BANKDA_ACCESS_TOKEN`: 뱅크다 API Access Token (Bearer 토큰)
  - 뱅크다 서비스 설정 페이지에서 발급
  - 토큰은 고정값이며 만료일이 없음
  - 노출 시 새로 발급 가능 (기존 토큰은 폐기됨)
- `BANKDA_TEST_MODE`: 테스트 모드 활성화 여부 (true/false)
  - true: 5분 제한 없이 테스트 가능 (최대 2건 데이터 반환)
  - false: 실제 운영 모드 (5분마다 조회 제한)
- `ENABLE_AUTO_DEPOSIT_MATCHING`: 자동 입금 확인 활성화 여부 (true/false)
- `DEPOSIT_MATCHING_CRON`: 스케줄러 실행 주기 (크론 표현식)
  - 기본값: `*/10 * * * *` (10분마다 실행)
  - 예시: `0 * * * *` (매 시간 정각), `*/30 * * * *` (30분마다)
- `ADMIN_BANK_NAME`: 관리자 은행명
- `ADMIN_ACCOUNT_NUMBER`: 관리자 계좌번호 (사용자에게 표시)
- `ADMIN_ACCOUNT_HOLDER`: 관리자 예금주명

## API 엔드포인트

### 1. 은행 계좌 정보 조회
```
GET /api/deposit-requests/bank-info
```
사용자에게 입금할 은행 계좌 정보를 반환합니다.

### 2. 입금 요청 생성
```
POST /api/deposit-requests
Content-Type: application/json

{
  "amount": 10000,
  "depositorName": "홍길동",
  "depositDate": "2025-12-18T10:00:00Z",
  "receiptImage": "optional_image_url"
}
```

### 3. 입금 요청 목록 조회
```
GET /api/deposit-requests?status=PENDING&page=1&limit=20
```

### 4. 관리자: 모든 입금 요청 조회
```
GET /api/deposit-requests/all?status=PENDING&page=1&limit=20
```

### 5. 관리자: 입금 요청 승인
```
POST /api/deposit-requests/:id/approve
Content-Type: application/json

{
  "adminNote": "승인 완료"
}
```

### 6. 관리자: 입금 요청 거부
```
POST /api/deposit-requests/:id/reject
Content-Type: application/json

{
  "adminNote": "입금 내역 확인 불가"
}
```

### 7. 관리자: 수동 자동 매칭 트리거
```
POST /api/deposit-requests/auto-match
```
스케줄러를 기다리지 않고 즉시 자동 입금 확인을 실행합니다.

## 자동 매칭 로직

시스템은 다음 조건을 기반으로 입금을 자동 매칭합니다:

1. **금액 일치**: 입금 요청 금액과 실제 입금 금액의 차이가 1원 미만
2. **시간 범위**: 입금 요청 시간과 실제 입금 시간의 차이가 48시간 이내
3. **입금자명 일치**: 입금자명이 부분 일치 (한쪽이 다른 쪽을 포함)

조건을 모두 만족하면:
- 입금 요청 상태를 `APPROVED`로 변경
- 사용자 마일리지 충전
- 결제 트랜잭션 기록 생성
- 매칭 로그 기록

## 데이터베이스 스키마

### DepositRequest (입금 요청)
```prisma
model DepositRequest {
  id              String
  userId          String
  amount          Decimal
  depositorName   String
  depositDate     DateTime
  status          DepositRequestStatus  // PENDING, APPROVED, REJECTED
  autoMatched     Boolean               // 자동 매칭 여부
  bankdaOrderId   String?              // 뱅크다 주문 ID
  // ...
}
```

### DepositMatchingLog (매칭 로그)
```prisma
model DepositMatchingLog {
  id                  String
  depositRequestId    String?
  bankdaOrderId       String?
  amount              Decimal
  depositorName       String
  matchStatus         DepositMatchStatus  // PENDING, MATCHED, CONFIRMED, FAILED, MANUAL
  failureReason       String?
  metadata            Json?
  // ...
}
```

## 사용 흐름

### 사용자 측
1. 관리자 계좌로 입금
2. 입금 요청 생성 (금액, 입금자명, 입금일시 입력)
3. 시스템이 자동으로 확인하거나 관리자가 수동 승인
4. 승인되면 마일리지 자동 충전

### 관리자 측
1. 미확인 입금 요청 목록 조회
2. 자동 매칭된 요청 확인
3. 필요 시 수동으로 승인/거부
4. 매칭 로그 확인으로 시스템 모니터링

## 스케줄러

서버 시작 시 `ENABLE_AUTO_DEPOSIT_MATCHING=true`로 설정되어 있으면 자동으로 스케줄러가 시작됩니다.

```typescript
// 기본 설정: 10분마다 실행
DEPOSIT_MATCHING_CRON=*/10 * * * *

// 서버 로그 예시:
🕐 Starting deposit matching scheduler with cron: */10 * * * *
✅ Deposit matching scheduler started successfully
🔄 Running auto deposit matching...
✅ Auto deposit matching completed - Success: 2, Failed: 0
```

## 뱅크다 API 사양

### API 엔드포인트
```
URL: https://a.bankda.com/dtsvc/bank_tr.php
Method: POST
Content-Type: multipart/form-data
```

### 요청 헤더
```
Authorization: Bearer {your_access_token}
```

### 요청 파라미터 (Form Data)
- `accountnum`: 조회 계좌번호 (생략 시 전체 계좌 조회)
- `datatype`: 반환 데이터 유형 (json/xml, 기본값: json)
- `charset`: 문자셋 (utf8/euckr, 기본값: utf8)
- `datefrom`: 조회 시작일 (YYYYMMDD)
- `dateto`: 조회 종료일 (YYYYMMDD)
- `istest`: 테스트 모드 (y/n)

### 응답 데이터 구조
```json
{
  "request": { ... },
  "response": {
    "record": 2,
    "bank": [
      {
        "bkcode": "일련번호",
        "accountnum": "계좌번호",
        "bkname": "은행명",
        "bkdate": "20251218",
        "bktime": "143020",
        "bkjukyo": "홍길동",
        "bkcontent": "입금",
        "bkinput": "10000",
        "bkoutput": "0",
        "bkjango": "100000"
      }
    ]
  }
}
```

### API 제한사항
- 거래 내역 조회 후 5분이 지나야 재조회 가능
- 특정 계좌 조회 시 계좌별로 5분 제한 적용
- 테스트 모드(`istest=y`)는 제한 없음 (최대 2건 반환)
- 최대 3개의 IP 주소 등록 가능 (CIDR 형식)

## 주의사항

1. **Access Token 보안**:
   - `BANKDA_ACCESS_TOKEN`은 절대 코드에 하드코딩하지 마세요
   - 환경 변수로만 관리하고 Git에 커밋하지 마세요
   - 토큰이 노출되면 즉시 새로 발급받으세요
2. **IP 등록**:
   - 뱅크다 설정에서 서버 IP를 등록해야 API 호출 가능
   - CIDR 형식 사용 (예: 192.168.0.1/32)
3. **매칭 정확도**:
   - 입금자명이 정확하지 않으면 자동 매칭 실패 가능
   - 사용자에게 정확한 입금자명 입력 안내 필요
4. **중복 매칭 방지**:
   - `autoMatched` 플래그로 이미 매칭된 요청은 재처리하지 않음
5. **API 호출 제한**:
   - 운영 모드에서는 5분마다 한 번만 조회 가능
   - 테스트 시에는 `BANKDA_TEST_MODE=true` 설정

## 트러블슈팅

### 자동 매칭이 작동하지 않는 경우
1. `ENABLE_AUTO_DEPOSIT_MATCHING=true` 설정 확인
2. 뱅크다 API 자격 증명 확인
3. 서버 로그에서 에러 메시지 확인
4. 데이터베이스 연결 상태 확인

### 매칭이 계속 실패하는 경우
1. `deposit_matching_logs` 테이블에서 `failureReason` 확인
2. 입금자명, 금액, 시간이 조건을 만족하는지 확인
3. 뱅크다 API 응답 데이터 확인

## 개발 및 테스트

```bash
# 패키지 설치
cd backend
npm install

# 데이터베이스 마이그레이션
npx prisma generate
npx prisma db push

# 개발 서버 실행
npm run dev

# 수동 매칭 테스트 (관리자 권한 필요)
curl -X POST http://localhost:5000/api/deposit-requests/auto-match \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
