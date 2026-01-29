# AWS 배포 가이드 (프리티어)

ItemLink 프로젝트를 AWS에 배포하는 완전한 가이드입니다.

## 📋 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [사전 준비](#사전-준비)
3. [AWS 리소스 설정](#aws-리소스-설정)
4. [Backend 배포](#backend-배포)
5. [Frontend 배포](#frontend-배포)
6. [S3 이미지 저장소 설정](#s3-이미지-저장소-설정)
7. [도메인 및 SSL 설정](#도메인-및-ssl-설정)
8. [모니터링 및 유지보수](#모니터링-및-유지보수)

---

## 🏗️ 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    사용자                                 │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌──────────────┐
│   Frontend    │      │   Backend    │
│   (EC2/S3)    │◄────►│   (EC2)      │
└───────────────┘      └──────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌─────────────┐
            │  PostgreSQL  │    │     S3      │
            │    (RDS)     │    │  (이미지)    │
            └──────────────┘    └─────────────┘
```

**비용 예상 (프리티어 사용 시):**
- EC2 t2.micro: 무료 (12개월)
- RDS t3.micro: 무료 (12개월)
- S3: 5GB 무료
- 데이터 전송: 15GB/월 무료
- **예상 월 비용: $0 ~ $5**

---

## 🔧 사전 준비

### 1. AWS 계정 생성
1. [AWS 회원가입](https://aws.amazon.com/ko/)
2. 신용카드 등록 (프리티어 사용 시에도 필요)
3. IAM 사용자 생성 권장

### 2. 로컬 개발 환경
```bash
# Node.js 18+ 설치 확인
node --version

# AWS CLI 설치
# Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
# Mac: brew install awscli
# Linux: sudo apt install awscli

# AWS CLI 설정
aws configure
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: ap-northeast-2 (서울)
# Default output format: json
```

### 3. 필요한 정보 준비
- AWS Access Key & Secret Key
- SSH Key Pair (EC2 접속용)
- 데이터베이스 비밀번호
- JWT Secret, Session Secret

---

## ☁️ AWS 리소스 설정

### 1. RDS PostgreSQL 설정

#### 1-1. RDS 인스턴스 생성
1. AWS Console → RDS → "데이터베이스 생성"
2. 설정:
   - **엔진 옵션**: PostgreSQL 15
   - **템플릿**: 프리 티어
   - **인스턴스 식별자**: `itemlink-db`
   - **마스터 사용자**: `postgres`
   - **마스터 암호**: 강력한 비밀번호 설정
   - **인스턴스 클래스**: db.t3.micro (프리티어)
   - **스토리지**: 20GB (프리티어 최대)
   - **퍼블릭 액세스**: 예 (개발 시), 아니오 (프로덕션)
3. "데이터베이스 생성" 클릭

#### 1-2. 보안 그룹 설정
1. RDS 인스턴스 선택 → 보안 그룹 클릭
2. 인바운드 규칙 편집:
   ```
   유형: PostgreSQL
   포트: 5432
   소스: EC2 보안 그룹 ID (또는 개발 시 내 IP)
   ```

#### 1-3. 연결 정보 확인
```
엔드포인트: itemlink-db.xxxxxxxxx.ap-northeast-2.rds.amazonaws.com
포트: 5432
데이터베이스: postgres
```

### 2. EC2 인스턴스 생성

#### 2-1. EC2 인스턴스 시작
1. AWS Console → EC2 → "인스턴스 시작"
2. 설정:
   - **이름**: `itemlink-backend`
   - **AMI**: Ubuntu Server 22.04 LTS
   - **인스턴스 유형**: t2.micro (프리티어)
   - **키 페어**: 새로 생성 또는 기존 선택 (.pem 다운로드)
   - **네트워크 설정**:
     * 퍼블릭 IP 자동 할당: 활성화
     * 보안 그룹: 새로 생성
   - **스토리지**: 8GB ~ 30GB (프리티어)

#### 2-2. 보안 그룹 인바운드 규칙
```
SSH        | 22   | 내 IP
HTTP       | 80   | 0.0.0.0/0
HTTPS      | 443  | 0.0.0.0/0
Custom TCP | 5000 | 0.0.0.0/0 (임시, 나중에 제거)
```

#### 2-3. Elastic IP 할당 (선택사항)
1. EC2 → 네트워크 및 보안 → Elastic IP
2. "Elastic IP 주소 할당"
3. 생성된 IP를 EC2 인스턴스에 연결
   - **장점**: 서버 재시작 시에도 IP 유지
   - **주의**: 인스턴스에 연결되지 않으면 요금 부과

### 3. S3 버킷 생성

#### 3-1. S3 버킷 생성
1. AWS Console → S3 → "버킷 만들기"
2. 설정:
   - **버킷 이름**: `itemlink-trade-images` (글로벌 고유 이름)
   - **리전**: ap-northeast-2 (서울)
   - **퍼블릭 액세스 차단**: 해제 (이미지는 공개)
   - **버킷 버전 관리**: 비활성화 (비용 절감)

#### 3-2. CORS 설정
S3 버킷 → 권한 → CORS 구성:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

#### 3-3. 버킷 정책 설정
S3 버킷 → 권한 → 버킷 정책:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::itemlink-trade-images/*"
        }
    ]
}
```

#### 3-4. IAM 사용자 생성 (S3 업로드용)
1. IAM → 사용자 → "사용자 추가"
2. **사용자 이름**: `itemlink-s3-uploader`
3. **권한 설정**: 직접 정책 연결
4. 다음 정책 생성:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::itemlink-trade-images/*"
        }
    ]
}
```
5. **액세스 키 생성** → CSV 다운로드 (절대 유출 금지!)

---

## 🚀 Backend 배포

### 1. EC2 접속

```bash
# Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2. 서버 초기 설정

```bash
# 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 버전 확인
node --version
npm --version

# Git 설치
sudo apt install -y git

# PM2 설치 (프로세스 관리자)
sudo npm install -g pm2

# Nginx 설치 (리버스 프록시)
sudo apt install -y nginx
```

### 3. 프로젝트 배포

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론
git clone https://github.com/your-username/itemlink.git
cd itemlink/backend

# 의존성 설치
npm install

# TypeScript 빌드
npm run build
```

### 4. 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

다음 내용 입력:
```env
# Server
NODE_ENV=production
PORT=5000

# Database (RDS 정보 입력)
DATABASE_URL=postgresql://postgres:your-password@itemlink-db.xxxxxxxxx.ap-northeast-2.rds.amazonaws.com:5432/postgres
DIRECT_URL=postgresql://postgres:your-password@itemlink-db.xxxxxxxxx.ap-northeast-2.rds.amazonaws.com:5432/postgres

# JWT & Session (강력한 랜덤 문자열 생성)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-super-secret-session-key-change-this

# AWS S3
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=itemlink-trade-images
AWS_ACCESS_KEY_ID=your-s3-access-key
AWS_SECRET_ACCESS_KEY=your-s3-secret-key

# CORS
FRONTEND_URL=http://your-frontend-domain.com
BACKEND_URL=http://your-backend-domain.com

# OAuth (선택사항)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
KAKAO_CLIENT_ID=

# Email (선택사항)
EMAIL_USER=
EMAIL_APP_PASSWORD=
```

**JWT/Session Secret 생성 방법:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. 데이터베이스 마이그레이션

```bash
# Prisma 마이그레이션 실행
npx prisma migrate deploy

# (옵션) 시드 데이터 추가
npm run seed
```

### 6. PM2로 서비스 시작

```bash
# PM2로 서버 시작
pm2 start dist/index.js --name itemlink-backend

# 서버 부팅 시 자동 시작 설정
pm2 startup
pm2 save

# PM2 상태 확인
pm2 status
pm2 logs itemlink-backend

# 서버 재시작 명령어
pm2 restart itemlink-backend
```

### 7. Nginx 리버스 프록시 설정

```bash
# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/itemlink
```

다음 내용 입력:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 또는 EC2 IP

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 클라이언트 업로드 크기 제한
    client_max_body_size 10M;

    # API 요청을 백엔드로 프록시
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/itemlink /etc/nginx/sites-enabled/

# 기본 사이트 비활성화
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 8. 방화벽 설정 (UFW)

```bash
# UFW 활성화
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 상태 확인
sudo ufw status
```

### 9. 배포 확인

```bash
# Health check
curl http://your-ec2-ip/health

# API 테스트
curl http://your-ec2-ip/api/test-db
```

---

## 🎨 Frontend 배포

### 옵션 1: EC2에 Frontend 배포 (권장)

```bash
# Frontend 디렉토리로 이동
cd ~/itemlink/frontend

# 의존성 설치
npm install

# 환경 변수 설정
nano .env.production
```

```env
NEXT_PUBLIC_API_URL=http://your-backend-domain.com/api
```

```bash
# 프로덕션 빌드
npm run build

# PM2로 실행
pm2 start npm --name itemlink-frontend -- start

# 부팅 시 자동 시작
pm2 save
```

### 옵션 2: S3 + CloudFront (정적 배포)

```bash
# 정적 빌드
npm run build
npm run export

# AWS CLI로 S3 업로드
aws s3 sync ./out s3://your-bucket-name --delete
```

---

## 📦 S3 이미지 저장소 설정

백엔드 코드에서 S3 업로드를 구현합니다.
(코드는 다음 단계에서 자동 생성됩니다)

---

## 🔒 도메인 및 SSL 설정

### 1. 도메인 연결 (선택사항)

#### Route 53 사용
1. Route 53 → 호스팅 영역 생성
2. A 레코드 생성 → EC2 Elastic IP 연결

#### 외부 도메인 사용
도메인 DNS 설정에서 A 레코드 추가:
```
Type: A
Name: api (또는 @)
Value: your-ec2-elastic-ip
```

### 2. Let's Encrypt SSL 인증서

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (도메인 필요)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 설정 (자동으로 설정됨)
sudo systemctl status certbot.timer
```

Nginx 설정이 자동으로 HTTPS로 업데이트됩니다.

---

## 📊 모니터링 및 유지보수

### 1. PM2 모니터링

```bash
# 실시간 로그 확인
pm2 logs

# 특정 앱 로그
pm2 logs itemlink-backend

# 메모리/CPU 사용량
pm2 monit
```

### 2. 디스크 공간 관리

```bash
# 디스크 사용량 확인
df -h

# PM2 로그 정리
pm2 flush

# 오래된 로그 자동 정리 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 자동 배포 스크립트

홈 디렉토리에 `deploy.sh` 생성:
```bash
nano ~/deploy.sh
```

```bash
#!/bin/bash
cd ~/itemlink/backend
git pull origin main
npm install
npm run build
pm2 restart itemlink-backend
echo "Backend deployed successfully!"
```

```bash
chmod +x ~/deploy.sh
```

사용:
```bash
~/deploy.sh
```

### 4. 백업 설정

```bash
# RDS 자동 백업 활성화 (AWS Console)
# 백업 보존 기간: 7일 (프리티어)

# Cron으로 데이터베이스 백업
crontab -e
```

```cron
# 매일 새벽 3시 백업
0 3 * * * pg_dump -h itemlink-db.xxx.rds.amazonaws.com -U postgres -d postgres > ~/backup_$(date +\%Y\%m\%d).sql
```

---

## 🐛 문제 해결

### 데이터베이스 연결 실패
```bash
# RDS 보안 그룹 확인
# EC2 보안 그룹이 허용되어 있는지 확인

# 연결 테스트
nc -zv your-rds-endpoint.rds.amazonaws.com 5432
```

### PM2 프로세스 죽음
```bash
# 로그 확인
pm2 logs itemlink-backend --lines 100

# 메모리 부족 시
pm2 start dist/index.js --name itemlink-backend --max-memory-restart 300M
```

### Nginx 502 Bad Gateway
```bash
# Backend가 실행 중인지 확인
pm2 status

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

---

## 💰 비용 최적화 팁

1. **프리티어 한도 확인**: AWS Billing Dashboard에서 사용량 모니터링
2. **불필요한 리소스 삭제**: 사용하지 않는 EC2, Elastic IP 삭제
3. **S3 수명 주기 정책**: 오래된 이미지 자동 삭제
4. **CloudWatch 알림**: 비용 임계값 초과 시 알림 설정
5. **Reserved Instance**: 장기 사용 시 예약 인스턴스 고려

---

## 📝 체크리스트

배포 전:
- [ ] AWS 계정 생성 및 결제 정보 등록
- [ ] RDS PostgreSQL 인스턴스 생성
- [ ] EC2 인스턴스 생성 및 보안 그룹 설정
- [ ] S3 버킷 생성 및 CORS 설정
- [ ] IAM 사용자 및 액세스 키 생성

배포 중:
- [ ] EC2에 Node.js, PM2, Nginx 설치
- [ ] 프로젝트 클론 및 빌드
- [ ] 환경 변수 설정
- [ ] 데이터베이스 마이그레이션
- [ ] PM2로 서비스 시작
- [ ] Nginx 리버스 프록시 설정

배포 후:
- [ ] Health check API 테스트
- [ ] 데이터베이스 연결 확인
- [ ] S3 이미지 업로드 테스트
- [ ] PM2 자동 시작 설정
- [ ] (선택) 도메인 및 SSL 설정
- [ ] 모니터링 및 로그 확인

---

## 🆘 지원

문제가 발생하면:
1. PM2 로그 확인: `pm2 logs`
2. Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`
3. RDS 연결 테스트
4. AWS CloudWatch 로그 확인

---

**다음 단계**: S3 이미지 업로드 코드 구현 및 배포 스크립트 생성
