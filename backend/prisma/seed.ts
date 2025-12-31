import { PrismaClient, UserTier } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GAME_CATEGORIES } from '../src/constants/games';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data (새로운 모델 순서)
  await prisma.comment.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.report.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.userRating.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      username: 'gamer123',
      passwordHash: hashedPassword,
      fullName: '김철수',
      phone: '010-1234-5678',
      isVerified: true,
      tier: UserTier.NORMAL, // 일반 등급
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      username: 'seller456',
      passwordHash: hashedPassword,
      fullName: '이영희',
      phone: '010-9876-5432',
      isVerified: true,
      tier: UserTier.TRUSTED, // 신뢰 등급
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'user3@example.com',
      username: 'trader789',
      passwordHash: hashedPassword,
      fullName: '박지성',
      phone: '010-5555-6666',
      isVerified: true,
      tier: UserTier.VETERAN, // 베테랑 등급
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: '관리자',
      role: 'ADMIN',
      isVerified: true,
      tier: UserTier.VETERAN,
    },
  });

  console.log('Created users');

  // Create trades (직접 거래 플랫폼 - 가격/수량/아이템타입 제거)
  await prisma.trade.createMany({
    data: [
      // 로스트아크 거래글
      {
        userId: user1.id,
        gameCategory: '로스트아크',
        title: '[로스트아크] 골드 100만골드 판매',
        description: '안전하고 빠른 거래! 직거래 가능합니다.\n아만 서버 골드 판매합니다.\n가격: 50,000원\n수량: 100만골드 x 10개\n쪽지 또는 채팅으로 연락주세요.',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },
      {
        userId: user2.id,
        gameCategory: '로스트아크',
        title: '[로스트아크] 상급 오레하 융화 재료 구매',
        description: '급하게 필요합니다! 빠른 거래 원합니다.\n루페온 서버입니다.\n가격: 협의 가능',
        tradeType: 'BUY',
        status: 'AVAILABLE',
      },
      {
        userId: user2.id,
        gameCategory: '로스트아크',
        title: '[로스트아크] 골드 500만골드 대량판매',
        description: '대량 구매시 할인 가능! 쪽지주세요.\n안전거래 보장합니다.\n가격: 230,000원\n아만 서버',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },

      // 메이플스토리 거래글
      {
        userId: user1.id,
        gameCategory: '메이플스토리',
        title: '[메이플스토리] 메소 10억 판매',
        description: '안전거래! 1:1 직거래\n스카니아 서버 메소입니다.\n가격: 80,000원\n수량: 10억 메소',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },
      {
        userId: user3.id,
        gameCategory: '메이플스토리',
        title: '[메이플스토리] 메소 50억 대량구매',
        description: '대량 구매 희망합니다.\n신뢰거래 보장!\n스카니아 서버\n가격 제시 부탁드립니다.',
        tradeType: 'BUY',
        status: 'AVAILABLE',
      },

      // 월드 오브 워크래프트 거래글
      {
        userId: user2.id,
        gameCategory: '월드 오브 워크래프트',
        title: '[WoW] 골드 500만골드 판매',
        description: '미국 서버 골드 판매합니다.\n빠른 거래 가능합니다.\nUS-Stormrage 서버\n가격: 100,000원',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },

      // 리니지M 거래글
      {
        userId: user1.id,
        gameCategory: '리니지M',
        title: '[리니지M] 아덴 1억 판매',
        description: '빠른 거래, 안전거래 보장\n켄라우헬 서버입니다.\n가격: 120,000원\n수량: 1억 x 2개',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },

      // 던전앤파이터 거래글
      {
        userId: user1.id,
        gameCategory: '던전앤파이터',
        title: '[던파] 골드 1억 판매',
        description: '안전하고 빠른 거래! 직거래 가능합니다.\n카인 서버 골드입니다.\n가격: 45,000원\n수량: 1억 x 5개',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },
      {
        userId: user2.id,
        gameCategory: '던전앤파이터',
        title: '[던파] +12 증폭 무기 구매',
        description: '희귀 옵션 있는 무기 찾습니다!\n카인 서버 귀검사 무기\n가격 협의 가능합니다.',
        tradeType: 'BUY',
        status: 'AVAILABLE',
      },
      {
        userId: user1.id,
        gameCategory: '던전앤파이터',
        title: '[던파] 에픽 장비 세트 판매',
        description: '풀셋 판매합니다. 쪽지주세요.\n디레지에 서버입니다.\n가격: 200,000원',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },
      {
        userId: user2.id,
        gameCategory: '던전앤파이터',
        title: '[던파] 골드 5억 대량판매',
        description: '대량 구매시 할인! 안전거래 보장\n카인 서버 거래 가능합니다.\n가격: 200,000원\n수량: 5억 x 10개',
        tradeType: 'SELL',
        status: 'AVAILABLE',
      },
      {
        userId: user3.id,
        gameCategory: '던전앤파이터',
        title: '[던파] 계정 구매 (레벨 110 이상)',
        description: '레벨 110 이상 강화 계정 구매합니다.\n신뢰거래만 원합니다.\n카인 서버\n가격 협의 가능',
        tradeType: 'BUY',
        status: 'AVAILABLE',
      },
    ],
  });

  console.log('Created trades');

  // Create UserRatings for users with activity
  await prisma.userRating.createMany({
    data: [
      {
        userId: user1.id,
        totalReviews: 8,
        averageRating: 4.2,
        totalSales: 12,
        totalPurchases: 3,
        cancelledSales: 1,
        cancelledPurchases: 0,
      },
      {
        userId: user2.id,
        totalReviews: 15,
        averageRating: 4.6,
        totalSales: 25,
        totalPurchases: 8,
        cancelledSales: 0,
        cancelledPurchases: 1,
      },
      {
        userId: user3.id,
        totalReviews: 42,
        averageRating: 4.8,
        totalSales: 56,
        totalPurchases: 12,
        cancelledSales: 2,
        cancelledPurchases: 0,
      },
    ],
  });

  console.log('Created user ratings');

  console.log('Seed completed successfully!');
  console.log(`Supported game categories: ${GAME_CATEGORIES.join(', ')}`);
  console.log('\nTest accounts:');
  console.log('- user1@example.com (NORMAL tier)');
  console.log('- user2@example.com (TRUSTED tier)');
  console.log('- user3@example.com (VETERAN tier)');
  console.log('- admin@example.com (Admin)');
  console.log('Password for all: password123');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
