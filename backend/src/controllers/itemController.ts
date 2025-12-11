import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { ItemType, ItemStatus } from '@prisma/client';

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      gameId,
      categoryId,
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
    if (!gameId || !title || !description || !price || !itemType) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    if (price < 0) {
      res.status(400).json({
        success: false,
        message: 'Price must be non-negative'
      });
      return;
    }

    const item = await prisma.item.create({
      data: {
        sellerId: userId!,
        gameId,
        categoryId: categoryId || null,
        title,
        description,
        price,
        quantity: quantity || 1,
        server: server || null,
        itemType: itemType as ItemType,
        tradeType: tradeType || 'SELL',
        images: images || [],
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          }
        },
        game: true,
        category: true,
      }
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: { item }
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      gameId,
      categoryId,
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
      status: status as ItemStatus,
    };

    if (gameId) where.gameId = gameId as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (itemType) where.itemType = itemType as ItemType;
    if (tradeType) where.tradeType = tradeType as string;
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice as string) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice as string) };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            }
          },
          game: true,
          category: true,
        },
        orderBy: {
          [sort as string]: order === 'asc' ? 'asc' : 'desc'
        },
        skip,
        take: limitNum,
      }),
      prisma.item.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getItemById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            rating: true,
          }
        },
        game: true,
        category: true,
      }
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      });
      return;
    }

    // Increment view count only if not the seller and user is logged in
    let updatedViews = item.views;
    if (userId && item.sellerId !== userId) {
      await prisma.item.update({
        where: { id },
        data: { views: { increment: 1 } }
      });
      updatedViews = item.views + 1;
    }

    res.json({
      success: true,
      data: { item: { ...item, views: updatedViews } }
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { title, description, price, quantity, status, images } = req.body;

    const existingItem = await prisma.item.findUnique({
      where: { id },
      select: { sellerId: true }
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      });
      return;
    }

    if (existingItem.sellerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
      return;
    }

    // Check if there are any ongoing transactions
    const ongoingTransactions = await prisma.transaction.count({
      where: {
        itemId: id,
        status: {
          in: ['PENDING', 'PAYMENT_WAITING', 'PAYMENT_COMPLETED', 'IN_DELIVERY', 'DELIVERED']
        }
      }
    });

    if (ongoingTransactions > 0) {
      res.status(400).json({
        success: false,
        message: '거래가 진행중인 아이템은 수정할 수 없습니다.'
      });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (status !== undefined) updateData.status = status as ItemStatus;
    if (images !== undefined) updateData.images = images;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          }
        },
        game: true,
        category: true,
      }
    });

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item }
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const existingItem = await prisma.item.findUnique({
      where: { id },
      select: { sellerId: true }
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      });
      return;
    }

    if (existingItem.sellerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
      return;
    }

    // Check if there are any ongoing transactions
    const ongoingTransactions = await prisma.transaction.count({
      where: {
        itemId: id,
        status: {
          in: ['PENDING', 'PAYMENT_WAITING', 'PAYMENT_COMPLETED', 'IN_DELIVERY', 'DELIVERED']
        }
      }
    });

    if (ongoingTransactions > 0) {
      res.status(400).json({
        success: false,
        message: '거래가 진행중인 아이템은 삭제할 수 없습니다.'
      });
      return;
    }

    await prisma.item.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
