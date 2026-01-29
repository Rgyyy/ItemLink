#!/bin/bash

# ItemLink Backend Deployment Script
# EC2 서버에서 이 스크립트를 실행하여 배포합니다

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Starting deployment..."

# 프로젝트 디렉토리로 이동
cd ~/itemlink/backend

# 1. Git Pull
echo "📥 Pulling latest code from Git..."
git pull origin main

# 2. 의존성 설치
echo "📦 Installing dependencies..."
npm install --production

# 3. TypeScript 빌드
echo "🔨 Building TypeScript..."
npm run build

# 4. Prisma 마이그레이션 (프로덕션)
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# 5. PM2 재시작
echo "♻️  Restarting PM2 process..."
pm2 restart itemlink-backend

# 6. 상태 확인
echo "✅ Checking PM2 status..."
pm2 status

echo "✨ Deployment completed successfully!"
echo "📝 View logs with: pm2 logs itemlink-backend"
