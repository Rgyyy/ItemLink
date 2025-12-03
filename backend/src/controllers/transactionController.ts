import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { TransactionStatus, ItemStatus } from '@prisma/client';

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { itemId, quantity, paymentMethod, meetingLocation, notes } = req.body;

    if (!itemId || !quantity) {
      res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required'
      });
      return;
    }

    // Use transaction to ensure data consistency
    const transaction = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: itemId },
        include: { seller: true }
      });

      if (!item || item.status !== ItemStatus.AVAILABLE) {
        throw new Error('Item not found or not available');
      }

      if (item.sellerId === userId) {
        throw new Error('Cannot buy your own item');
      }

      if (item.quantity < quantity) {
        throw new Error('Insufficient quantity available');
      }

      const totalPrice = Number(item.price) * quantity;

      // Create transaction
      const newTransaction = await tx.transaction.create({
        data: {
          itemId,
          sellerId: item.sellerId,
          buyerId: userId!,
          quantity,
          totalPrice,
          paymentMethod: paymentMethod || null,
          meetingLocation: meetingLocation || null,
          notes: notes || null,
        },
        include: {
          item: true,
          seller: {
            select: {
              id: true,
              username: true,
              phone: true,
            }
          },
          buyer: {
            select: {
              id: true,
              username: true,
              phone: true,
            }
          }
        }
      });

      // Update item quantity and status
      const newQuantity = item.quantity - quantity;
      await tx.item.update({
        where: { id: itemId },
        data: {
          quantity: newQuantity,
          status: newQuantity === 0 ? ItemStatus.SOLD : ItemStatus.AVAILABLE
        }
      });

      return newTransaction;
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    res.status(400).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { type = 'all', status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (type === 'sales') {
      where.sellerId = userId;
    } else if (type === 'purchases') {
      where.buyerId = userId;
    } else {
      where.OR = [
        { sellerId: userId },
        { buyerId: userId }
      ];
    }

    if (status) {
      where.status = status as TransactionStatus;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              title: true,
              images: true,
              price: true,
            }
          },
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            }
          },
          buyer: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        item: true,
        seller: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatarUrl: true,
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    if (transaction.sellerId !== userId && transaction.buyerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
      return;
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateTransactionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required'
      });
      return;
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { sellerId: true, buyerId: true }
    });

    if (!existingTransaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    if (existingTransaction.sellerId !== userId && existingTransaction.buyerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this transaction'
      });
      return;
    }

    const updateData: any = { status: status as TransactionStatus };
    if (status === TransactionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        item: true,
        seller: {
          select: {
            id: true,
            username: true,
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
