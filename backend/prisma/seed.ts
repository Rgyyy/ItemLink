import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.favorite.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.item.deleteMany();
  await prisma.itemCategory.deleteMany();
  await prisma.game.deleteMany();
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
    },
  });

  console.log('Created users');

  // Create games
  const lostArk = await prisma.game.create({
    data: {
      name: '로스트아크',
      slug: 'lost-ark',
      description: '액션 RPG MMORPG',
      imageUrl: 'https://cdn.lostark.game/2024/upload/2024_LOGO.png',
    },
  });

  const wow = await prisma.game.create({
    data: {
      name: '월드 오브 워크래프트',
      slug: 'world-of-warcraft',
      description: 'MMORPG의 전설',
      imageUrl: 'https://example.com/wow.jpg',
    },
  });

  const maple = await prisma.game.create({
    data: {
      name: '메이플스토리',
      slug: 'maplestory',
      description: '2D 횡스크롤 MMORPG',
      imageUrl: 'https://example.com/maple.jpg',
    },
  });

  const lineage = await prisma.game.create({
    data: {
      name: '리니지M',
      slug: 'lineage-m',
      description: '모바일 MMORPG',
      imageUrl: 'https://example.com/lineage.jpg',
    },
  });

  const dnf = await prisma.game.create({
    data: {
      name: '던전앤파이터',
      slug: 'dungeon-and-fighter',
      description: '액션 횡스크롤 RPG',
      imageUrl: 'https://example.com/dnf.jpg',
    },
  });

  console.log('Created games');

  // Create categories
  const lostArkGold = await prisma.itemCategory.create({
    data: {
      gameId: lostArk.id,
      name: '골드',
      slug: 'gold',
      description: '로스트아크 골드',
    },
  });

  const lostArkItem = await prisma.itemCategory.create({
    data: {
      gameId: lostArk.id,
      name: '아이템',
      slug: 'item',
      description: '게임 아이템',
    },
  });

  const mapleCategory = await prisma.itemCategory.create({
    data: {
      gameId: maple.id,
      name: '메소',
      slug: 'meso',
      description: '메이플스토리 메소',
    },
  });

  const dnfGold = await prisma.itemCategory.create({
    data: {
      gameId: dnf.id,
      name: '게임머니',
      slug: 'game-money',
      description: '던전앤파이터 골드',
    },
  });

  const dnfItem = await prisma.itemCategory.create({
    data: {
      gameId: dnf.id,
      name: '게임아이템',
      slug: 'game-item',
      description: '던전앤파이터 게임 아이템',
    },
  });

  console.log('Created categories');

  // Create items
  await prisma.item.createMany({
    data: [
      {
        sellerId: user1.id,
        gameId: lostArk.id,
        categoryId: lostArkGold.id,
        title: '로스트아크 골드 100만골드 판매',
        description: '안전하고 빠른 거래! 직거래 가능합니다.',
        price: 50000,
        quantity: 10,
        server: '아만',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
      {
        sellerId: user2.id,
        gameId: lostArk.id,
        categoryId: lostArkItem.id,
        title: '상급 오레하 융화 재료 10개',
        description: '급처! 빠른 거래 원합니다.',
        price: 15000,
        quantity: 5,
        server: '루페온',
        itemType: 'ITEM',
        status: 'AVAILABLE',
      },
      {
        sellerId: user1.id,
        gameId: maple.id,
        categoryId: mapleCategory.id,
        title: '메이플스토리 메소 10억',
        description: '안전거래! 1:1 직거래',
        price: 80000,
        quantity: 1,
        server: '스카니아',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
      {
        sellerId: user2.id,
        gameId: wow.id,
        title: 'WoW 골드 500만골드',
        description: '미국 서버 골드 판매합니다.',
        price: 100000,
        quantity: 3,
        server: 'US-Stormrage',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
      {
        sellerId: user1.id,
        gameId: lineage.id,
        title: '리니지M 아덴 1억',
        description: '빠른 거래, 안전거래 보장',
        price: 120000,
        quantity: 2,
        server: '켄라우헬',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
      {
        sellerId: user2.id,
        gameId: lostArk.id,
        categoryId: lostArkGold.id,
        title: '로스트아크 골드 500만골드 대량판매',
        description: '대량 구매시 할인 가능! 쪽지주세요.',
        price: 230000,
        quantity: 20,
        server: '아만',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
      {
        sellerId: user1.id,
        gameId: dnf.id,
        categoryId: dnfGold.id,
        title: '던전앤파이터 골드 1억 판매',
        description: '안전하고 빠른 거래! 직거래 가능합니다.',
        price: 45000,
        quantity: 5,
        server: '카인',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
      {
        sellerId: user2.id,
        gameId: dnf.id,
        categoryId: dnfItem.id,
        title: '+12 증폭 무기 판매',
        description: '희귀 옵션 붙은 무기입니다. 급처!',
        price: 150000,
        quantity: 1,
        server: '카인',
        itemType: 'ITEM',
        status: 'AVAILABLE',
      },
      {
        sellerId: user1.id,
        gameId: dnf.id,
        categoryId: dnfItem.id,
        title: '에픽 장비 세트 판매',
        description: '풀셋 판매합니다. 쪽지주세요.',
        price: 200000,
        quantity: 1,
        server: '디레지에',
        itemType: 'ITEM',
        status: 'AVAILABLE',
      },
      {
        sellerId: user2.id,
        gameId: dnf.id,
        categoryId: dnfGold.id,
        title: '던파 골드 5억 대량판매',
        description: '대량 구매시 할인! 안전거래 보장',
        price: 200000,
        quantity: 10,
        server: '카인',
        itemType: 'GAME_MONEY',
        status: 'AVAILABLE',
      },
    ],
  });

  console.log('Created items');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
