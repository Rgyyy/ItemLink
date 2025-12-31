import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { TradeStatus } from '@prisma/client';
import { GAME_CATEGORIES } from '../constants/games';

export const createTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      gameCategory,
      title,
      description,
      tradeType,
      images
    } = req.body;

    // Validation
    if (!gameCategory || !title || !description) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields (gameCategory, title, description)'
      });
      return;
    }

    // 게임 카테고리 검증 - 하드코딩된 목록에 없어도 허용 (사용자 직접 입력)
    // 단, 빈 값은 불가
    if (!gameCategory.trim()) {
      res.status(400).json({
        success: false,
        message: 'Game category cannot be empty'
      });
      return;
    }

    const trade = await prisma.trade.create({
      data: {
        userId: userId!,
        gameCategory: gameCategory.trim(),
        title: title.trim(),
        description: description.trim(),
        tradeType: tradeType || 'SELL',
        images: images || [],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            tier: true,
          }
        },
      }
    });

    // user를 seller로 매핑 (프론트엔드 호환성)
    const responseData = {
      ...trade,
      seller: trade.user,
      user: undefined,
    };

    res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      data: { trade: responseData }
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create trade',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      gameCategory,
      tradeType,
      userId,
      status,
      page = '1',
      limit = '20',
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // status가 명시적으로 전달된 경우에만 필터링
    if (status) where.status = status as TradeStatus;
    if (gameCategory) where.gameCategory = gameCategory as string;
    if (tradeType) where.tradeType = tradeType as string;
    if (userId) where.userId = userId as string;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              tier: true,
            }
          },
        },
        orderBy: {
          [sort as string]: order === 'asc' ? 'asc' : 'desc'
        },
        skip,
        take: limitNum,
      }),
      prisma.trade.count({ where })
    ]);

    // user를 seller로 매핑 (프론트엔드 호환성)
    const tradesWithSeller = trades.map(trade => ({
      ...trade,
      seller: trade.user,
      user: undefined,
    }));

    res.json({
      success: true,
      data: {
        trades: tradesWithSeller,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trades',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTradeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            tier: true,
          }
        },
      }
    });

    if (!trade) {
      res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
      return;
    }

    // Increment view count only if not the author and user is logged in
    let updatedViews = trade.views;
    if (currentUserId && trade.userId !== currentUserId) {
      await prisma.trade.update({
        where: { id },
        data: { views: { increment: 1 } }
      });
      updatedViews = trade.views + 1;
    }

    // user를 seller로 매핑 (프론트엔드 호환성)
    const responseData = {
      ...trade,
      views: updatedViews,
      seller: trade.user,
      user: undefined,
    };

    res.json({
      success: true,
      data: { trade: responseData }
    });
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trade',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const { id } = req.params;
    const { gameCategory, title, description, status, images } = req.body;

    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingTrade) {
      res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
      return;
    }

    if (existingTrade.userId !== currentUserId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this trade'
      });
      return;
    }

    const updateData: any = {};
    if (gameCategory !== undefined) updateData.gameCategory = gameCategory;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status as TradeStatus;
    if (images !== undefined) updateData.images = images;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            tier: true,
          }
        },
      }
    });

    // user를 seller로 매핑 (프론트엔드 호환성)
    const responseData = {
      ...trade,
      seller: trade.user,
      user: undefined,
    };

    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: { trade: responseData }
    });
  } catch (error) {
    console.error('Update trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trade',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const { id } = req.params;

    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingTrade) {
      res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
      return;
    }

    if (existingTrade.userId !== currentUserId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this trade'
      });
      return;
    }

    await prisma.trade.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trade',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
