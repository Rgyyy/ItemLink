# PayAction API 연동 및 자동 입금 확인 시스템

## 개요

이 시스템은 PayAction API를 활용하여 사용자의 입금 요청을 자동으로 확인하고 마일리지를 충전하는 기능을 제공합니다.

## 주요 기능

1. **주문 자동 등록**: 사용자가 입금 요청 생성 시 PayAction에 자동으로 주문 등록
2. **Webhook 실시간 처리**: PayAction에서 입금 확인 시 webhook으로 즉시 알림 수신
3. **마일리지 자동 충전**: 입금이 확인되면 자동으로 사용자 마일리지 충전
4. **매칭 로그 기록**: 모든 매칭 시도와 결과를 데이터베이스에 기록

## 환경 변수 설정

`.env` 파일에 다음 환경 변수를 추가하세요:

```env
# PayAction API Configuration
PAYACTION_API_KEY=your_payaction_api_key
PAYACTION_MALL_ID=your_payaction_mall_id
PAYACTION_API_URL=https://api.payaction.app/order
PAYACTION_WEBHOOK_KEY=your_payaction_webhook_key

# Backend URL (for webhook)
BACKEND_URL=https://yourdomain.com

# Admin Bank Account Info
ADMIN_BANK_NAME=농협은행
ADMIN_ACCOUNT_NUMBER=352-1234-5678-90
ADMIN_ACCOUNT_HOLDER=아이템링크
```

### 환경 변수 설명

- `PAYACTION_API_KEY`: PayAction에서 발급받은 API 키
- `PAYACTION_MALL_ID`: PayAction 쇼핑몰 ID
- `PAYACTION_API_URL`: PayAction API 엔드포인트 (기본값: https://api.payaction.app/order)
- `PAYACTION_WEBHOOK_KEY`: Webhook 서명 검증용 키
- `BACKEND_URL`: 서버의 공개 URL (webhook 수신용)
- `ADMIN_BANK_NAME`: 관리자 은행명
- `ADMIN_ACCOUNT_NUMBER`: 관리자 계좌번호 (사용자에게 표시)
- `ADMIN_ACCOUNT_HOLDER`: 관리자 예금주명

## PayAction 설정

### 1. API 자격증명 발급
PayAction 관리 페이지에서:
1. API Key 발급
2. Mall ID 확인
3. Webhook Key 발급

### 2. Webhook URL 설정
PayAction 관리 페이지에서 Webhook URL을 설정합니다:
```
https://yourdomain.com/api/payaction/webhook
```

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
  "receiptImage": "optional_image_url",
  "ordererPhone": "010-1234-5678",
  "ordererEmail": "user@example.com"
}
```

**동작 과정**:
1. DepositRequest 데이터베이스에 저장
2. PayAction API로 주문 등록
3. 사용자에게 계좌 정보 안내

### 3. PayAction Webhook
```
POST /api/payaction/webhook
Content-Type: application/json
x-webhook-signature: {HMAC SHA256 signature}

{
  "order_number": "abc123-1234567890",
  "order_amount": 10000,
  "billing_name": "홍길동",
  "status": "completed",
  "payment_date": "2025-12-18T10:30:00+09:00"
}
```

**Webhook 처리 과정**:
1. 서명 검증 (HMAC SHA256)
2. order_number로 DepositRequest 조회
3. status가 'completed' 또는 'paid'인 경우:
   - 입금 요청 상태를 APPROVED로 변경
   - 사용자 마일리지 충전
   - PaymentTransaction 기록 생성
   - DepositMatchingLog 기록

## PayAction API 사양

### 주문 생성 API

**엔드포인트**:
```
POST https://api.payaction.app/order
```

**요청 헤더**:
```
Content-Type: application/json
x-api-key: {your_api_key}
x-mall-id: {your_mall_id}
```

**요청 파라미터**:
| Field | Description | Required |
|-------|-------------|----------|
| order_number | 주문번호 (22자 이하 권장) | Yes |
| order_amount | 주문금액 | Yes |
| order_date | 주문일시 (ISO 8601: YYYY-MM-DDTHH:MM:SS+09:00) | Yes |
| billing_name | 입금자명 (자동매칭 판단 항목) | Yes |
| orderer_name | 주문자명 | Yes |
| orderer_phone_number | 주문자 전화번호 (하이픈 제외, 예: 01012345678) | No |
| orderer_email | 주문자 이메일 | No |
| trade_usage | 현금영수증 거래구분 (소득공제용/지출증빙용) | No |
| identity_number | 현금영수증 식별번호 | No |

**요청 예시**:
```json
{
  "order_number": "abc123-1234567890",
  "order_amount": 19000,
  "order_date": "2023-07-26T11:31:00+09:00",
  "billing_name": "홍길동",
  "orderer_name": "홍길동",
  "orderer_phone_number": "01012345678",
  "orderer_email": "hong@gildong.kr"
}
```

**응답 예시**:
```json
{
  "status": "success",
  "response": {}
}
```

## 사용 흐름

### 사용자 측
1. 입금 요청 생성 (금액, 입금자명, 입금일시 입력)
2. 시스템이 PayAction에 자동으로 주문 등록
3. 안내받은 계좌로 입금
4. PayAction이 자동으로 입금 확인
5. Webhook을 통해 실시간으로 마일리지 자동 충전

### 관리자 측
1. 미확인 입금 요청 목록 조회
2. Webhook으로 자동 처리된 요청 확인
3. 필요 시 수동으로 승인/거부
4. 매칭 로그 확인으로 시스템 모니터링

## 데이터 흐름

```
[사용자] 입금 요청 생성
    ↓
[시스템] PayAction 주문 등록
    ↓
[사용자] 계좌 입금
    ↓
[PayAction] 자동 매칭 및 확인
    ↓
[PayAction] Webhook 전송
    ↓
[시스템] Webhook 수신 및 검증
    ↓
[시스템] 마일리지 자동 충전
    ↓
[사용자] 충전 완료 알림 (선택)
```

## 보안

### Webhook 서명 검증
PayAction에서 보내는 webhook은 HMAC SHA256 서명으로 검증됩니다:

```typescript
const signature = crypto
  .createHmac('sha256', PAYACTION_WEBHOOK_KEY)
  .update(JSON.stringify(requestBody))
  .digest('hex');
```

서명이 일치하지 않으면 요청이 거부됩니다.

## 주의사항

1. **API Key 보안**:
   - `PAYACTION_API_KEY`와 `PAYACTION_WEBHOOK_KEY`는 절대 코드에 하드코딩하지 마세요
   - 환경 변수로만 관리하고 Git에 커밋하지 마세요
   - 키가 노출되면 즉시 PayAction 관리 페이지에서 재발급하세요

2. **Webhook URL**:
   - HTTPS 사용 필수 (운영 환경)
   - 공개적으로 접근 가능한 URL이어야 함
   - 방화벽에서 PayAction IP 허용 필요 (있는 경우)

3. **전화번호 형식**:
   - 하이픈(-) 제거 필수
   - 국가코드(+82) 제거
   - 올바른 형식: `01012345678`

4. **주문번호**:
   - 22자 이하 권장 (초과 시 알림톡 발송 불가)
   - 중복 방지를 위해 고유한 값 사용

5. **중복 처리 방지**:
   - Webhook은 중복으로 올 수 있으므로 멱등성 보장
   - `autoMatched` 플래그와 상태 확인으로 중복 충전 방지

## 트러블슈팅

### Webhook이 수신되지 않는 경우
1. PayAction 관리 페이지에서 Webhook URL 설정 확인
2. 서버가 공개적으로 접근 가능한지 확인
3. HTTPS 인증서가 유효한지 확인
4. 방화벽 설정 확인
5. 서버 로그에서 에러 메시지 확인

### 주문 생성이 실패하는 경우
1. API Key와 Mall ID 확인
2. 요청 파라미터 형식 확인 (특히 날짜, 전화번호)
3. PayAction API 응답 메시지 확인
4. 중복 주문번호 여부 확인

### 마일리지가 충전되지 않는 경우
1. Webhook이 정상적으로 수신되었는지 로그 확인
2. `deposit_matching_logs` 테이블에서 상태 확인
3. DepositRequest의 status가 APPROVED인지 확인
4. PaymentTransaction 기록이 생성되었는지 확인

## 개발 및 테스트

```bash
# 패키지 설치
cd backend
npm install

# 서버 실행
npm run dev

# Webhook 테스트 (로컬)
# ngrok 등을 사용하여 로컬 서버를 공개 URL로 노출
ngrok http 5000
# PayAction 관리 페이지에서 ngrok URL 설정

# Webhook 수동 테스트
curl -X POST http://localhost:5000/api/payaction/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": "test-1234567890",
    "order_amount": 10000,
    "billing_name": "홍길동",
    "status": "completed"
  }'
```

## 알림톡 및 이메일 발송

### 알림톡 발송
입금 완료 시 사용자에게 알림톡을 발송하려면:
- `orderer_phone_number` 필드 포함 필요

### 이메일 발송
입금 완료 시 사용자에게 이메일을 발송하려면:
- `orderer_email` 필드 포함 필요

## 현금영수증 자동발행

프리미어 플랜 이상 이용 시 지원:
- `trade_usage`: "소득공제용" 또는 "지출증빙용"
- `identity_number`:
  - 소득공제용: 휴대폰번호 (숫자만)
  - 지출증빙용: 사업자번호 (숫자만)

## 환경별 설정

### 개발 환경
```env
BACKEND_URL=http://localhost:5000
# 또는 ngrok 사용
BACKEND_URL=https://abc123.ngrok.io
```

### 운영 환경
```env
BACKEND_URL=https://api.yourdomain.com
```

## 문의

PayAction 관련 문의:
- 웹사이트: https://payaction.app
- 개발자 문서: https://payaction.app/developer
