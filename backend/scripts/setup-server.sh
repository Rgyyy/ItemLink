#!/bin/bash

# EC2 서버 초기 설정 스크립트
# 새로운 EC2 인스턴스에서 한 번만 실행합니다

set -e

echo "🔧 Setting up EC2 server for ItemLink..."

# 1. 시스템 업데이트
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Node.js 18 설치
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# 3. Git 설치
echo "📦 Installing Git..."
sudo apt install -y git

# 4. PM2 설치
echo "📦 Installing PM2..."
sudo npm install -g pm2

# 5. Nginx 설치
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# 6. 프로젝트 디렉토리 생성
echo "📁 Creating project directory..."
cd ~
if [ ! -d "itemlink" ]; then
    echo "❓ Enter your Git repository URL:"
    read -r REPO_URL
    git clone "$REPO_URL" itemlink
else
    echo "⚠️  itemlink directory already exists. Skipping clone."
fi

# 7. Backend 의존성 설치
echo "📦 Installing backend dependencies..."
cd ~/itemlink/backend
npm install

# 8. 환경 변수 파일 생성
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit ~/itemlink/backend/.env with your configuration!"
    echo "   Run: nano ~/itemlink/backend/.env"
else
    echo "✅ .env file already exists"
fi

# 9. TypeScript 빌드
echo "🔨 Building TypeScript..."
npm run build

# 10. uploads 디렉토리 생성
echo "📁 Creating uploads directory..."
mkdir -p uploads/trade-images

# 11. PM2 설정
echo "🔧 Setting up PM2..."
pm2 start dist/index.js --name itemlink-backend
pm2 startup
pm2 save

# 12. UFW 방화벽 설정
echo "🔒 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo ""
echo "✨ Server setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Edit environment variables: nano ~/itemlink/backend/.env"
echo "2. Configure Nginx: sudo nano /etc/nginx/sites-available/itemlink"
echo "3. Run database migrations: cd ~/itemlink/backend && npx prisma migrate deploy"
echo "4. Restart PM2: pm2 restart itemlink-backend"
echo ""
echo "📚 See AWS_DEPLOYMENT_GUIDE.md for detailed instructions"
