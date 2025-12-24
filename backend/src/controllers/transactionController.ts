import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { TransactionStatus, TradeStatus } from '@prisma/client';

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { tradeId, quantity, paymentMethod, meetingLocation, notes } = req.body;

    if (!tradeId || !quantity) {
      res.status(400).json({
        success: false,
        message: 'Trade ID and quantity are required'
      });
      return;
    }

    // Use transaction to ensure data consistency
    const transaction = await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findUnique({
        where: { id: tradeId },
        include: { seller: true }
      });

      if (!trade || trade.status !== TradeStatus.AVAILABLE) {
        throw new Error('Trade not found or not available');
      }

      if (trade.sellerId === userId) {
        throw new Error('Cannot buy your own trade');
      }

      if (trade.quantity < quantity) {
        throw new Error('Insufficient quantity available');
      }

      const totalPrice = Number(trade.price) * quantity;

      // Create transaction with initial status REQUESTED (1단계)
      const newTransaction = await tx.transaction.create({
        data: {
          tradeId,
          sellerId: trade.sellerId,
          buyerId: userId!,
          quantity,
          totalPrice,
          paymentMethod: paymentMethod || null,
          meetingLocation: meetingLocation || null,
          notes: notes || null,
          status: TransactionStatus.REQUESTED, // 1단계: 거래 신청
        },
        include: {
          trade: true,
          seller: {
            select: {
              id: true,
              username: true,
              phone: true,
              tier: true,
              rating: true,
            }
          },
          buyer: {
            select: {
              id: true,
              username: true,
              phone: true,
              tier: true,
              rating: true,
            }
          }
        }
      });

      // Update trade quantity and status
      const newQuantity = trade.quantity - quantity;
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          quantity: newQuantity,
          status: newQuantity === 0 ? TradeStatus.SOLD : TradeStatus.AVAILABLE
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
          trade: {
            select: {
              id: true,
              title: true,
              images: true,
              price: true,
              gameCategory: true,
            }
          },
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              tier: true,
              rating: true,
            }
          },
          buyer: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              tier: true,
              rating: true,
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
        trade: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            quantity: true,
            images: true,
            gameCategory: true,
            server: true,
            itemType: true,
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatarUrl: true,
            tier: true,
            rating: true,
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatarUrl: true,
            tier: true,
            rating: true,
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
        trade: true,
        seller: {
          select: {
            id: true,
            username: true,
            tier: true,
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
            tier: true,
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

// 거래 취소 (수량 복구 및 통계 업데이트)
export const cancelTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Cancel reason is required'
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findUnique({
        where: { id },
        select: {
          id: true,
          sellerId: true,
          buyerId: true,
          tradeId: true,
          quantity: true,
          status: true,
        }
      });

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }

      // 권한 확인: 구매자, 판매자, 관리자만 취소 가능
      if (
        existingTransaction.sellerId !== userId &&
        existingTransaction.buyerId !== userId &&
        req.user?.role !== 'ADMIN'
      ) {
        throw new Error('Not authorized to cancel this transaction');
      }

      // 이미 완료된 거래는 취소 불가
      if (existingTransaction.status === TransactionStatus.COMPLETED) {
        throw new Error('Cannot cancel completed transaction');
      }

      // 이미 취소된 거래
      if (existingTransaction.status === TransactionStatus.CANCELLED) {
        throw new Error('Transaction is already cancelled');
      }

      // 거래 취소 처리
      const cancelledBy = existingTransaction.buyerId === userId ? 'buyer' : 'seller';
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          status: TransactionStatus.CANCELLED,
          cancelledBy,
          cancelReason: reason,
        },
        include: {
          trade: true,
          seller: {
            select: {
              id: true,
              username: true,
              tier: true,
            }
          },
          buyer: {
            select: {
              id: true,
              username: true,
              tier: true,
            }
          }
        }
      });

      // Trade 수량 복구
      await tx.trade.update({
        where: { id: existingTransaction.tradeId },
        data: {
          quantity: { increment: existingTransaction.quantity },
          status: TradeStatus.AVAILABLE, // 수량이 복구되므로 다시 판매 가능
        }
      });

      // UserRating 취소 통계 업데이트
      const cancellerUserId = cancelledBy === 'buyer' ? existingTransaction.buyerId : existingTransaction.sellerId;

      // UserRating이 없으면 생성
      await tx.userRating.upsert({
        where: { userId: cancellerUserId },
        create: {
          userId: cancellerUserId,
          totalReviews: 0,
          averageRating: 0,
          totalSales: 0,
          totalPurchases: 0,
          cancelledSales: cancelledBy === 'seller' ? 1 : 0,
          cancelledPurchases: cancelledBy === 'buyer' ? 1 : 0,
        },
        update: {
          cancelledSales: cancelledBy === 'seller' ? { increment: 1 } : undefined,
          cancelledPurchases: cancelledBy === 'buyer' ? { increment: 1 } : undefined,
        }
      });

      // User 취소 통계 업데이트
      await tx.user.update({
        where: { id: cancellerUserId },
        data: {
          cancelledTrades: { increment: 1 }
        }
      });

      return updatedTransaction;
    });

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      data: { transaction: result }
    });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel transaction';
    res.status(400).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
