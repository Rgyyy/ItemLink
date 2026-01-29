# 빠른 배포 가이드 (Quick Start)

ItemLink를 AWS에 배포하기 위한 단계별 체크리스트입니다.

## 🎯 배포 전 준비

### 1. AWS 계정 생성
- [ ] AWS 계정 생성 완료
- [ ] 신용카드 등록 완료
- [ ] 프리티어 사용 가능 확인

### 2. 필요한 패키지 설치

```bash
# Backend 디렉토리로 이동
cd backend

# AWS SDK 및 필요한 패키지 설치
npm install @aws-sdk/client-s3 uuid
npm install --save-dev @types/uuid

# (선택) PM2 글로벌 설치
npm install -g pm2
```

---

## 📦 Step 1: AWS 리소스 생성 (30분)

### RDS PostgreSQL
1. AWS Console → RDS → "데이터베이스 생성"
2. PostgreSQL 15, 프리티어, db.t3.micro
3. 마스터 사용자: `postgres`, 비밀번호 설정
4. 보안 그룹: PostgreSQL (5432) 허용

**완료 후**: 엔드포인트 주소 복사

### EC2 인스턴스
1. AWS Console → EC2 → "인스턴스 시작"
2. Ubuntu 22.04 LTS, t2.micro
3. 키 페어 생성 및 다운로드 (.pem)
4. 보안 그룹: SSH(22), HTTP(80), HTTPS(443) 허용

**완료 후**: 퍼블릭 IP 주소 복사

### S3 버킷
1. AWS Console → S3 → "버킷 만들기"
2. 버킷 이름: `itemlink-trade-images`
3. 리전: ap-northeast-2
4. 퍼블릭 액세스 허용
5. CORS 설정 및 버킷 정책 추가 (가이드 참조)

**완료 후**: 버킷 이름 확인

### IAM 사용자 (S3용)
1. IAM → 사용자 → "사용자 추가"
2. 사용자 이름: `itemlink-s3-uploader`
3. S3 권한 정책 연결
4. 액세스 키 생성 및 다운로드

**완료 후**: Access Key ID, Secret Access Key 저장

---

## 🖥️ Step 2: EC2 서버 설정 (20분)

### 1. EC2 접속

```bash
# Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@YOUR_EC2_IP

# Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### 2. 자동 설정 스크립트 실행

```bash
# 설정 스크립트 다운로드 및 실행
wget https://raw.githubusercontent.com/YOUR_USERNAME/itemlink/main/backend/scripts/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

또는 수동 설정:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Git, PM2, Nginx 설치
sudo apt install -y git
sudo npm install -g pm2
sudo apt install -y nginx

# 프로젝트 클론
cd ~
git clone https://github.com/YOUR_USERNAME/itemlink.git
cd itemlink/backend
npm install
```

### 3. 환경 변수 설정

```bash
cd ~/itemlink/backend
cp .env.example .env
nano .env
```

필수 환경 변수 입력:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/postgres
DIRECT_URL=postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/postgres
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=itemlink-trade-images
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
FRONTEND_URL=http://YOUR_DOMAIN
BACKEND_URL=http://YOUR_DOMAIN
```

저장: `Ctrl + X`, `Y`, `Enter`

### 4. 빌드 및 마이그레이션

```bash
npm run build
npx prisma migrate deploy
```

### 5. PM2로 서버 시작

```bash
pm2 start dist/index.js --name itemlink-backend
pm2 startup
pm2 save
```

### 6. Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/itemlink
```

다음 내용 붙여넣기:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 10M;

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

Nginx 활성화:
```bash
sudo ln -s /etc/nginx/sites-available/itemlink /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. 방화벽 설정

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## ✅ Step 3: 배포 확인 (5분)

### API 테스트

```bash
# Health check
curl http://YOUR_EC2_IP/health

# 응답 예시:
{
  "status": "ok",
  "message": "ItemLink API is running",
  "timestamp": "2025-01-15T..."
}
```

### 브라우저 테스트

1. `http://YOUR_EC2_IP/health` 접속
2. JSON 응답 확인
3. `http://YOUR_EC2_IP/api/trades` 접속 (거래 목록)

### PM2 상태 확인

```bash
pm2 status
pm2 logs itemlink-backend
```

---

## 🔒 Step 4: SSL 설정 (선택사항, 10분)

도메인이 있는 경우 무료 SSL 인증서 설치:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🤖 Step 5: CI/CD 설정 (선택사항, 15분)

### 1. GitHub Secrets 추가

Repository → Settings → Secrets and variables → Actions

- `EC2_HOST`: EC2 IP 주소
- `EC2_USERNAME`: `ubuntu`
- `EC2_SSH_KEY`: `.pem` 파일 전체 내용

### 2. 워크플로우 파일 확인

`.github/workflows/deploy.yml` 파일이 있는지 확인

### 3. 첫 배포 테스트

```bash
git add .
git commit -m "chore: Setup deployment"
git push origin main
```

GitHub Actions 탭에서 배포 진행 확인

---

## 📊 배포 후 체크리스트

### 기능 테스트
- [ ] API Health Check 응답 확인
- [ ] 데이터베이스 연결 확인
- [ ] 이미지 업로드 테스트 (S3)
- [ ] 사용자 가입/로그인 테스트

### 보안 확인
- [ ] `.env` 파일 권한 확인 (`chmod 600 .env`)
- [ ] AWS 액세스 키 Git에 업로드 안 됨 확인
- [ ] RDS 보안 그룹 확인 (EC2만 접근 가능)
- [ ] S3 버킷 정책 확인

### 모니터링 설정
- [ ] PM2 로그 확인: `pm2 logs`
- [ ] Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`
- [ ] AWS CloudWatch 알림 설정 (선택)

---

## 🔄 일상 운영

### 코드 업데이트 (수동)

```bash
# EC2 서버에서
cd ~/itemlink
git pull origin main
cd backend
npm install --production
npm run build
npx prisma migrate deploy
pm2 restart itemlink-backend
```

### 코드 업데이트 (자동 - CI/CD 설정 시)

```bash
# 로컬에서
git push origin main
# GitHub Actions가 자동 배포
```

### 로그 확인

```bash
# PM2 로그
pm2 logs itemlink-backend

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 서버 재시작

```bash
pm2 restart itemlink-backend
sudo systemctl restart nginx
```

---

## 💰 비용 예상

### 프리티어 사용 시 (첫 12개월)
- EC2 t2.micro: $0
- RDS t3.micro: $0
- S3 (5GB): $0
- 데이터 전송 (15GB/월): $0
- **총계: $0/월**

### 프리티어 이후
- EC2 t2.micro: ~$8/월
- RDS t3.micro: ~$15/월
- S3 (5GB): ~$0.12/월
- 데이터 전송: ~$1/월
- **총계: ~$24/월**

### 비용 절감 팁
- 프리티어 한도 모니터링
- 불필요한 리소스 삭제
- S3 수명 주기 정책 설정
- Reserved Instance 고려 (장기 사용 시)

---

## 🐛 자주 발생하는 문제

### 1. 데이터베이스 연결 실패
```bash
# RDS 보안 그룹에 EC2 보안 그룹 추가
# DATABASE_URL 형식 확인
```

### 2. PM2 프로세스 죽음
```bash
pm2 logs itemlink-backend --lines 100
# 메모리 부족 시 max-memory-restart 설정
```

### 3. Nginx 502 Bad Gateway
```bash
# Backend가 실행 중인지 확인
pm2 status
# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 4. S3 업로드 실패
```bash
# AWS 환경 변수 확인
# IAM 권한 확인
# 버킷 이름 및 리전 확인
```

---

## 📚 상세 가이드

더 자세한 내용은 다음 문서를 참조하세요:

- **[AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)** - 전체 배포 가이드
- **[backend/ENV_SETUP_GUIDE.md](./backend/ENV_SETUP_GUIDE.md)** - 환경 변수 설정
- **[backend/S3_SETUP_GUIDE.md](./backend/S3_SETUP_GUIDE.md)** - S3 이미지 저장소
- **[CICD_SETUP_GUIDE.md](./CICD_SETUP_GUIDE.md)** - CI/CD 자동화

---

## 🆘 도움이 필요하신가요?

- Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/itemlink/issues)
- AWS 공식 문서: [AWS Documentation](https://docs.aws.amazon.com/)
- Prisma 문서: [Prisma Docs](https://www.prisma.io/docs)

---

**축하합니다! 🎉 ItemLink가 성공적으로 배포되었습니다!**
