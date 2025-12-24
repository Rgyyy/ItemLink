import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { ReportStatus } from '@prisma/client';

// Dashboard Stats
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [usersCount, tradesCount, transactionsCount, reviewsCount, pendingReports, bannedUsers] = await Promise.all([
      prisma.user.count(),
      prisma.trade.count(),
      prisma.transaction.count(),
      prisma.review.count(),
      prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      prisma.user.count({ where: { isBanned: true } })
    ]);

    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        trade: { select: { title: true } },
        buyer: { select: { username: true } },
        seller: { select: { username: true } }
      }
    });

    res.json({
      success: true,
      data: {
        stats: {
          users: usersCount,
          trades: tradesCount,
          transactions: transactionsCount,
          reviews: reviewsCount,
          pendingReports,
          bannedUsers
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Users Management
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (role && (role === 'USER' || role === 'ADMIN')) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, isActive, isVerified } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof isVerified === 'boolean' && { isVerified })
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user?.userId;

    // 관리자가 자신을 삭제하려고 하는지 확인
    if (id === currentAdminId) {
      res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
      return;
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Trades Management
export const getAllTrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (status && ['AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN'].includes(status as string)) {
      where.status = status;
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { username: true, email: true, tier: true } }
        }
      }),
      prisma.trade.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
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

export const updateTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const trade = await prisma.trade.update({
      where: { id },
      data: { status },
      include: {
        seller: { select: { username: true } }
      }
    });

    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: trade
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
    const { id } = req.params;

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

// Transactions Management
export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && ['REQUESTED', 'CONDITIONS_AGREED', 'ITEM_DELIVERED', 'PAYMENT_COMPLETED', 'COMPLETED', 'CANCELLED'].includes(status as string)) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          trade: { select: { title: true, price: true } },
          buyer: { select: { username: true, email: true } },
          seller: { select: { username: true, email: true } }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
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

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && !req.body.completedAt && { completedAt: new Date() })
      },
      include: {
        trade: { select: { title: true } },
        buyer: { select: { username: true } },
        seller: { select: { username: true } }
      }
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
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

// Reviews Management
export const getAllReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { username: true, email: true } },
          reviewee: { select: { username: true, email: true } },
          transaction: {
            select: {
              trade: { select: { title: true } }
            }
          }
        }
      }),
      prisma.review.count()
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.review.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Reports Management
export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status = '', type = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) {
      where.status = status as ReportStatus;
    }
    if (type) {
      where.type = type;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
            }
          },
          reportedUser: {
            select: {
              id: true,
              username: true,
              email: true,
              tier: true,
              isBanned: true,
            }
          },
          processor: {
            select: {
              id: true,
              username: true,
            }
          }
        }
      }),
      prisma.report.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const processReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { id } = req.params;
    const { status, adminNote, banUser, banDuration } = req.body;

    if (!status || !adminNote) {
      res.status(400).json({
        success: false,
        message: 'Status and admin note are required'
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id },
        select: { reportedUserId: true }
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // 신고 처리
      const updatedReport = await tx.report.update({
        where: { id },
        data: {
          status: status as ReportStatus,
          adminNote,
          processedBy: adminId!,
          processedAt: new Date()
        },
        include: {
          reporter: {
            select: { id: true, username: true }
          },
          reportedUser: {
            select: { id: true, username: true, tier: true }
          },
          processor: {
            select: { id: true, username: true }
          }
        }
      });

      // 사용자 제재
      if (banUser) {
        let bannedUntil: Date | null = null;

        if (banDuration) {
          bannedUntil = new Date();
          bannedUntil.setDate(bannedUntil.getDate() + parseInt(banDuration));
        }

        await tx.user.update({
          where: { id: report.reportedUserId },
          data: {
            isBanned: true,
            bannedUntil,
            bannedReason: adminNote
          }
        });
      }

      return updatedReport;
    });

    res.json({
      success: true,
      message: 'Report processed successfully',
      data: { report: result }
    });
  } catch (error) {
    console.error('Process report error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process report';
    res.status(400).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
