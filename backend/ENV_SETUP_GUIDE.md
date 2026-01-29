# 환경 변수 설정 가이드

ItemLink 프로젝트의 환경 변수를 올바르게 설정하는 방법입니다.

## 📋 목차
1. [환경 변수 개요](#환경-변수-개요)
2. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
3. [프로덕션 환경 설정 (EC2)](#프로덕션-환경-설정-ec2)
4. [환경 변수 보안](#환경-변수-보안)
5. [문제 해결](#문제-해결)

---

## 📝 환경 변수 개요

### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 실행 환경 | `development`, `production` |
| `PORT` | 서버 포트 | `5000` |
| `DATABASE_URL` | PostgreSQL 연결 URL | `postgresql://user:pass@host:5432/db` |
| `DIRECT_URL` | Prisma Direct URL | 동일하게 설정 |
| `JWT_SECRET` | JWT 토큰 시크릿 | 64자 랜덤 문자열 |
| `SESSION_SECRET` | 세션 시크릿 | 64자 랜덤 문자열 |

### 선택적 환경 변수

| 변수명 | 설명 | 사용 시점 |
|--------|------|----------|
| `AWS_*` | AWS S3 설정 | S3 이미지 저장 사용 시 |
| `GOOGLE_CLIENT_ID` | Google OAuth | 구글 로그인 사용 시 |
| `NAVER_CLIENT_ID` | Naver OAuth | 네이버 로그인 사용 시 |
| `KAKAO_CLIENT_ID` | Kakao OAuth | 카카오 로그인 사용 시 |
| `EMAIL_USER` | 이메일 계정 | 이메일 인증 사용 시 |

---

## 🏠 로컬 개발 환경 설정

### 1. `.env` 파일 생성

```bash
cd backend
cp .env.example .env
```

### 2. 필수 값 설정

#### 데이터베이스 (로컬 PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/itemlink
DIRECT_URL=postgresql://postgres:your-password@localhost:5432/itemlink
```

**로컬 PostgreSQL 설치:**
```bash
# Windows (Chocolatey)
choco install postgresql

# Mac
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
```

**데이터베이스 생성:**
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE itemlink;

# 종료
\q
```

#### JWT & Session Secret 생성

**자동 생성 (권장):**
```bash
# JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

생성된 값을 `.env`에 복사합니다.

#### CORS 설정

```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### 3. 선택적 설정

#### AWS S3 (로컬에서는 선택사항)

로컬 개발 시 S3 없이 로컬 저장소 사용 가능:
```env
# 주석 처리하거나 값 비워두면 로컬 저장소 사용
# AWS_REGION=
# AWS_S3_BUCKET=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

#### OAuth (로컬 개발 시 선택사항)

테스트를 위해 설정:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. 개발 환경 `.env` 전체 예시

```env
# Server
NODE_ENV=development
PORT=5000

# Database (로컬 PostgreSQL)
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/itemlink
DIRECT_URL=postgresql://postgres:mypassword@localhost:5432/itemlink

# JWT & Session
JWT_SECRET=a1b2c3d4e5f6....(64자 이상 랜덤 문자열)
JWT_EXPIRES_IN=7d
SESSION_SECRET=x1y2z3w4v5u6....(64자 이상 랜덤 문자열)

# CORS
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# AWS S3 (로컬에서는 선택사항)
# AWS_REGION=ap-northeast-2
# AWS_S3_BUCKET=itemlink-trade-images
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=

# OAuth (선택사항)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# NAVER_CLIENT_ID=
# NAVER_CLIENT_SECRET=
# KAKAO_CLIENT_ID=

# Email (선택사항)
# EMAIL_USER=your-email@gmail.com
# EMAIL_APP_PASSWORD=your-app-password
```

### 5. 개발 서버 실행

```bash
# 데이터베이스 마이그레이션
npx prisma migrate dev

# 서버 시작
npm run dev
```

---

## 🌐 프로덕션 환경 설정 (EC2)

### 1. EC2 서버 접속

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### 2. `.env` 파일 생성

```bash
cd ~/itemlink/backend
nano .env
```

### 3. 프로덕션 환경 변수 설정

```env
# Server
NODE_ENV=production
PORT=5000

# Database (RDS PostgreSQL)
DATABASE_URL=postgresql://postgres:your-strong-password@itemlink-db.xxxxxx.ap-northeast-2.rds.amazonaws.com:5432/postgres
DIRECT_URL=postgresql://postgres:your-strong-password@itemlink-db.xxxxxx.ap-northeast-2.rds.amazonaws.com:5432/postgres

# JWT & Session (새로 생성할 것!)
JWT_SECRET=프로덕션용_새로운_64자_이상_랜덤_문자열
JWT_EXPIRES_IN=7d
SESSION_SECRET=프로덕션용_새로운_64자_이상_랜덤_문자열

# CORS (실제 도메인으로 변경)
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://api.your-domain.com

# AWS S3 (필수)
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=itemlink-trade-images
AWS_ACCESS_KEY_ID=AKIA.....................
AWS_SECRET_ACCESS_KEY=wJalr..............................
AWS_CLOUDFRONT_DOMAIN=d123456789abcd.cloudfront.net

# OAuth (프로덕션 키로 변경)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
NAVER_CLIENT_ID=your-production-naver-client-id
NAVER_CLIENT_SECRET=your-production-naver-client-secret
KAKAO_CLIENT_ID=your-production-kakao-client-id

# Email
EMAIL_USER=noreply@your-domain.com
EMAIL_APP_PASSWORD=your-gmail-app-password
```

### 4. 파일 권한 설정 (보안)

```bash
# .env 파일 권한을 소유자만 읽을 수 있도록 설정
chmod 600 .env

# 소유자 확인
ls -la .env
```

### 5. 환경 변수 검증

서버 시작 전 환경 변수가 제대로 로드되는지 확인:

```bash
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set')"
```

### 6. 프로덕션 배포

```bash
# 데이터베이스 마이그레이션
npx prisma migrate deploy

# PM2로 서버 시작
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 🔒 환경 변수 보안

### ⚠️ 절대 하지 말아야 할 것

1. **`.env` 파일을 Git에 커밋하지 마세요**
   ```bash
   # .gitignore에 추가되어 있는지 확인
   cat .gitignore | grep .env
   ```

2. **환경 변수를 코드에 하드코딩하지 마세요**
   ```typescript
   // ❌ 나쁜 예
   const secret = 'my-secret-key';

   // ✅ 좋은 예
   const secret = process.env.JWT_SECRET;
   ```

3. **로그에 시크릿을 출력하지 마세요**
   ```typescript
   // ❌ 나쁜 예
   console.log('JWT_SECRET:', process.env.JWT_SECRET);

   // ✅ 좋은 예
   console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Missing');
   ```

### ✅ 권장 보안 사항

1. **강력한 시크릿 생성**
   - 최소 64자 이상
   - 랜덤 문자열 사용
   - 개발/프로덕션 환경마다 다른 값 사용

2. **AWS 키 보호**
   - IAM 사용자의 권한을 최소화
   - 정기적으로 액세스 키 로테이션
   - AWS Secrets Manager 사용 고려

3. **환경별 분리**
   ```
   .env.development   # 개발 환경
   .env.test          # 테스트 환경
   .env.production    # 프로덕션 환경
   ```

4. **민감한 정보 암호화**
   프로덕션 환경에서는 AWS Secrets Manager, HashiCorp Vault 등 사용 권장

---

## 🐛 문제 해결

### 환경 변수가 로드되지 않음

**증상**: `process.env.VARIABLE_NAME`이 `undefined`

**해결**:
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. `dotenv.config()` 호출 확인
3. 파일 인코딩 확인 (UTF-8)
4. 서버 재시작

### 데이터베이스 연결 실패

**증상**: `Error: P1001: Can't reach database server`

**해결**:
1. `DATABASE_URL` 형식 확인
2. 데이터베이스가 실행 중인지 확인
3. 방화벽/보안 그룹 설정 확인
4. IP 주소 및 포트 확인

```bash
# PostgreSQL 연결 테스트
psql "postgresql://user:pass@host:5432/db"
```

### S3 업로드 실패

**증상**: `Access Denied` 또는 `Credentials not found`

**해결**:
1. AWS 환경 변수 확인
2. IAM 권한 확인
3. 버킷 이름 확인
4. 리전 확인

```bash
# AWS 자격 증명 테스트
aws s3 ls s3://your-bucket-name --region ap-northeast-2
```

### OAuth 로그인 실패

**증상**: `Callback URL mismatch` 또는 `Invalid client`

**해결**:
1. OAuth 제공자 콘솔에서 Callback URL 확인
2. 클라이언트 ID/Secret 확인
3. `FRONTEND_URL`, `BACKEND_URL` 확인

---

## 📚 추가 자료

- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/development-environment/environment-variables)
- [dotenv Documentation](https://github.com/motdotla/dotenv)

---

**다음 단계**:
- [S3_SETUP_GUIDE.md](./S3_SETUP_GUIDE.md) - S3 이미지 저장소 설정
- [AWS_DEPLOYMENT_GUIDE.md](../AWS_DEPLOYMENT_GUIDE.md) - AWS 배포
