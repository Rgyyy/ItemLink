import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { ItemType, TradeStatus } from '@prisma/client';
import { GAME_CATEGORIES } from '../constants/games';

export const createTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      gameCategory,
      title,
      description,
      price,
      quantity,
      server,
      itemType,
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

    // Price 검증 - 선택사항, 있으면 음수만 체크
    if (price !== undefined && price < 0) {
      res.status(400).json({
        success: false,
        message: 'Price must be non-negative'
      });
      return;
    }

    const trade = await prisma.trade.create({
      data: {
        sellerId: userId!,
        gameCategory: gameCategory.trim(),
        title: title.trim(),
        description: description.trim(),
        price: price || 0,
        quantity: quantity || 1,
        server: server || null,
        itemType: (itemType as ItemType) || 'OTHER',
        tradeType: tradeType || 'SELL',
        images: images || [],
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            tier: true,
            rating: true,
          }
        },
      }
    });

    res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      data: { trade }
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
      itemType,
      tradeType,
      minPrice,
      maxPrice,
      status = 'AVAILABLE',
      page = '1',
      limit = '20',
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      status: status as TradeStatus,
    };

    if (gameCategory) where.gameCategory = gameCategory as string;
    if (itemType) where.itemType = itemType as ItemType;
    if (tradeType) where.tradeType = tradeType as string;
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice as string) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice as string) };

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              tier: true,
              rating: true,
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

    res.json({
      success: true,
      data: {
        trades,
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
    const userId = req.user?.userId;

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            tier: true,
            rating: true,
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

    // Increment view count only if not the seller and user is logged in
    let updatedViews = trade.views;
    if (userId && trade.sellerId !== userId) {
      await prisma.trade.update({
        where: { id },
        data: { views: { increment: 1 } }
      });
      updatedViews = trade.views + 1;
    }

    res.json({
      success: true,
      data: { trade: { ...trade, views: updatedViews } }
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
    const userId = req.user?.userId;
    const { id } = req.params;
    const { gameCategory, title, description, price, quantity, status, images } = req.body;

    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { sellerId: true }
    });

    if (!existingTrade) {
      res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
      return;
    }

    if (existingTrade.sellerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this trade'
      });
      return;
    }

    // Check if there are any ongoing transactions (새로운 5단계 상태)
    const ongoingTransactions = await prisma.transaction.count({
      where: {
        tradeId: id,
        status: {
          in: ['REQUESTED', 'CONDITIONS_AGREED', 'ITEM_DELIVERED', 'PAYMENT_COMPLETED']
        }
      }
    });

    if (ongoingTransactions > 0) {
      res.status(400).json({
        success: false,
        message: '거래가 진행중인 상품은 수정할 수 없습니다.'
      });
      return;
    }

    const updateData: any = {};
    if (gameCategory !== undefined) updateData.gameCategory = gameCategory;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (quantity !== undefined) updateData.quantity = quantity;
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
        seller: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            tier: true,
            rating: true,
          }
        },
      }
    });

    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: { trade }
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
    const userId = req.user?.userId;
    const { id } = req.params;

    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { sellerId: true }
    });

    if (!existingTrade) {
      res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
      return;
    }

    if (existingTrade.sellerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this trade'
      });
      return;
    }

    // Check if there are any ongoing transactions (새로운 5단계 상태)
    const ongoingTransactions = await prisma.transaction.count({
      where: {
        tradeId: id,
        status: {
          in: ['REQUESTED', 'CONDITIONS_AGREED', 'ITEM_DELIVERED', 'PAYMENT_COMPLETED']
        }
      }
    });

    if (ongoingTransactions > 0) {
      res.status(400).json({
        success: false,
        message: '거래가 진행중인 상품은 삭제할 수 없습니다.'
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
