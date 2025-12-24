import prisma from '../config/prisma';

export interface RiskWarning {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
}

/**
 * 거래 위험도 탐지 함수
 * 사용자의 계정 나이, 평점, 취소율, 제재 이력 등을 기반으로 위험도를 평가
 */
export async function detectTransactionRisk(
  userId: string,
  tradePrice: number
): Promise<RiskWarning> {
  const warnings: string[] = [];
  let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

  try {
    const [user, userRating] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          isBanned: true,
          bannedUntil: true,
          tier: true,
        }
      }),
      prisma.userRating.findUnique({
        where: { userId },
        select: {
          averageRating: true,
          totalSales: true,
          totalPurchases: true,
          cancelledSales: true,
          cancelledPurchases: true,
        }
      })
    ]);

    if (!user) {
      warnings.push('사용자를 찾을 수 없습니다');
      return { level: 'HIGH', reasons: warnings };
    }

    // 1. 신규 계정 고액 거래
    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 7 && tradePrice >= 100000) {
      warnings.push('신규 계정의 고액 거래 (계정 생성 7일 미만)');
      level = 'HIGH';
    } else if (accountAgeDays < 30 && tradePrice >= 300000) {
      warnings.push('신규 계정의 고액 거래 (계정 생성 30일 미만)');
      level = 'MEDIUM';
    }

    // 2. 낮은 평점 (거래 횟수가 일정 이상일 때만 평가)
    if (userRating) {
      const totalTransactions = userRating.totalSales + userRating.totalPurchases;

      if (totalTransactions >= 5) {
        const avgRating = Number(userRating.averageRating);

        if (avgRating < 2.0) {
          warnings.push(`매우 낮은 평점 (${avgRating.toFixed(1)}점)`);
          level = 'HIGH';
        } else if (avgRating < 3.0) {
          warnings.push(`낮은 평점 (${avgRating.toFixed(1)}점)`);
          if (level !== 'HIGH') level = 'MEDIUM';
        }
      }

      // 3. 높은 취소율
      if (totalTransactions >= 5) {
        const totalCancelled = userRating.cancelledSales + userRating.cancelledPurchases;
        const cancelRate = (totalCancelled / totalTransactions) * 100;

        if (cancelRate >= 50) {
          warnings.push(`매우 높은 취소율 (${cancelRate.toFixed(0)}%)`);
          level = 'HIGH';
        } else if (cancelRate >= 30) {
          warnings.push(`높은 취소율 (${cancelRate.toFixed(0)}%)`);
          if (level !== 'HIGH') level = 'MEDIUM';
        }
      }
    }

    // 4. 제재 이력
    if (user.isBanned) {
      if (user.bannedUntil && user.bannedUntil > new Date()) {
        warnings.push('현재 제재 중인 사용자');
        level = 'HIGH';
      } else {
        warnings.push('과거 제재 이력이 있는 사용자');
        if (level === 'LOW') level = 'MEDIUM';
      }
    }

    // 5. 뉴비 등급 고액 거래
    if (user.tier === 'NEWBIE' && tradePrice >= 500000) {
      warnings.push('뉴비 등급 사용자의 고액 거래');
      if (level === 'LOW') level = 'MEDIUM';
    }

    // 경고가 없으면 LOW
    if (warnings.length === 0) {
      warnings.push('위험도가 낮은 거래입니다');
    }

    return { level, reasons: warnings };
  } catch (error) {
    console.error('Risk detection error:', error);
    return {
      level: 'MEDIUM',
      reasons: ['위험도 평가 중 오류가 발생했습니다']
    };
  }
}

/**
 * 사용자 신뢰도 점수 계산 (0-100)
 */
export async function calculateTrustScore(userId: string): Promise<number> {
  try {
    const [user, userRating] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          isBanned: true,
          tier: true,
        }
      }),
      prisma.userRating.findUnique({
        where: { userId },
        select: {
          averageRating: true,
          totalSales: true,
          totalPurchases: true,
          cancelledSales: true,
          cancelledPurchases: true,
        }
      })
    ]);

    if (!user) return 0;

    let score = 50; // 기본 점수

    // 계정 나이 (최대 +15점)
    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.min(15, accountAgeDays / 30 * 5);

    // 등급 (최대 +20점)
    const tierBonus = { NEWBIE: 0, NORMAL: 5, TRUSTED: 12, VETERAN: 20 };
    score += tierBonus[user.tier] || 0;

    if (userRating) {
      // 평점 (최대 +20점)
      const avgRating = Number(userRating.averageRating);
      score += avgRating * 4;

      // 거래 횟수 (최대 +10점)
      const totalTransactions = userRating.totalSales + userRating.totalPurchases;
      score += Math.min(10, totalTransactions / 10);

      // 취소율 페널티 (최대 -15점)
      if (totalTransactions >= 5) {
        const totalCancelled = userRating.cancelledSales + userRating.cancelledPurchases;
        const cancelRate = (totalCancelled / totalTransactions) * 100;
        score -= Math.min(15, cancelRate / 5);
      }
    }

    // 제재 페널티 (-20점)
    if (user.isBanned) {
      score -= 20;
    }

    // 0-100 범위로 제한
    return Math.max(0, Math.min(100, Math.round(score)));
  } catch (error) {
    console.error('Trust score calculation error:', error);
    return 50; // 오류 시 중립 점수
  }
}
