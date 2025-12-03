# ItemLink API 테스트 가이드

## 기본 정보
- **Base URL**: `http://localhost:5000`
- **인증**: JWT Bearer Token (회원가입/로그인 후 받은 토큰)

## 1. 헬스 체크

```bash
curl http://localhost:5000/health
```

## 2. 데이터베이스 연결 테스트

```bash
curl http://localhost:5000/api/test-db
```

## 3. 인증 API

### 회원가입
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "fullName": "테스트 유저"
  }'
```

### 로그인
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**응답에서 token을 복사하세요!**

### 프로필 조회 (인증 필요)
```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 4. 게임 API

### 게임 목록 조회
```bash
curl http://localhost:5000/api/games
```

### 게임 상세 조회
```bash
curl http://localhost:5000/api/games/GAME_ID
```

### 게임 카테고리 조회
```bash
curl http://localhost:5000/api/games/GAME_ID/categories
```

## 5. 아이템 API

### 아이템 등록 (인증 필요)
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "gameId": "GAME_ID",
    "title": "리그오브레전드 계정 판매",
    "description": "다이아 티어 계정입니다",
    "price": 50000,
    "quantity": 1,
    "itemType": "ACCOUNT"
  }'
```

### 아이템 목록 조회
```bash
# 전체 목록
curl http://localhost:5000/api/items

# 필터링 예시
curl "http://localhost:5000/api/items?gameId=GAME_ID&page=1&limit=10"
```

### 아이템 상세 조회
```bash
curl http://localhost:5000/api/items/ITEM_ID
```

### 아이템 수정 (인증 필요)
```bash
curl -X PUT http://localhost:5000/api/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "수정된 제목",
    "price": 45000
  }'
```

### 아이템 삭제 (인증 필요)
```bash
curl -X DELETE http://localhost:5000/api/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 6. 거래 API

### 거래 생성 (인증 필요)
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer BUYER_TOKEN_HERE" \
  -d '{
    "itemId": "ITEM_ID",
    "quantity": 1,
    "paymentMethod": "직거래",
    "meetingLocation": "강남역 10번 출구"
  }'
```

### 거래 목록 조회 (인증 필요)
```bash
# 전체 거래
curl http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 판매 내역
curl "http://localhost:5000/api/transactions?type=sales" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 구매 내역
curl "http://localhost:5000/api/transactions?type=purchases" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 거래 상세 조회 (인증 필요)
```bash
curl http://localhost:5000/api/transactions/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 거래 상태 변경 (인증 필요)
```bash
curl -X PATCH http://localhost:5000/api/transactions/TRANSACTION_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "COMPLETED"
  }'
```

#### 거래 상태 종류:
- `PENDING` - 대기 중
- `PAYMENT_WAITING` - 결제 대기
- `PAYMENT_COMPLETED` - 결제 완료
- `IN_DELIVERY` - 배송 중
- `DELIVERED` - 배송 완료
- `COMPLETED` - 거래 완료
- `CANCELLED` - 취소됨
- `REFUNDED` - 환불됨

## 테스트 플로우

### 완전한 테스트 시나리오:

1. **회원가입** (판매자)
2. **로그인** → 토큰 저장
3. **게임 목록 조회** → gameId 확인
4. **아이템 등록** → itemId 저장
5. **아이템 목록 조회** → 등록한 아이템 확인
6. **새로운 회원가입** (구매자)
7. **로그인** (구매자) → 토큰 저장
8. **거래 생성** (구매자 토큰 사용)
9. **거래 목록 조회**
10. **거래 상태 업데이트**

## PowerShell에서 사용하는 경우

Windows PowerShell에서는 curl 대신:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/games" -Method GET
```

또는 Git Bash, WSL을 사용하세요.
