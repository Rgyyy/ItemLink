import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { UserTier } from '@prisma/client';

// Create Review
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { transactionId, revieweeId, rating, comment } = req.body;

    // Validation
    if (!transactionId || !revieweeId || !rating) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID, reviewee ID, and rating are required'
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
      return;
    }

    // Check if transaction exists and is completed
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { trade: true }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    if (transaction.status !== 'COMPLETED') {
      res.status(400).json({
        success: false,
        message: 'Can only review completed transactions'
      });
      return;
    }

    // Check if user is part of the transaction
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only review transactions you are part of'
      });
      return;
    }

    // Check if reviewee is the other party
    const validRevieweeId = transaction.buyerId === userId
      ? transaction.sellerId
      : transaction.buyerId;

    if (revieweeId !== validRevieweeId) {
      res.status(400).json({
        success: false,
        message: 'Invalid reviewee'
      });
      return;
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: {
        transactionId_reviewerId: {
          transactionId,
          reviewerId: userId
        }
      }
    });

    if (existingReview) {
      res.status(409).json({
        success: false,
        message: 'You have already reviewed this transaction'
      });
      return;
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        transactionId,
        reviewerId: userId,
        revieweeId,
        rating,
        comment: comment || null
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        reviewee: {
          select: {
            id: true,
            username: true
          }
        },
        transaction: {
          select: {
            id: true,
            trade: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    // Update UserRating
    await updateUserRating(revieweeId);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Reviews
export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, transactionId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (userId) {
      where.revieweeId = userId as string;
    }

    if (transactionId) {
      where.transactionId = transactionId as string;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          reviewee: {
            select: {
              id: true,
              username: true
            }
          },
          transaction: {
            select: {
              id: true,
              item: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.review.count({ where })
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

// Get Review by ID
export const getReviewById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        reviewee: {
          select: {
            id: true,
            username: true
          }
        },
        transaction: {
          select: {
            id: true,
            trade: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found'
      });
      return;
    }

    res.json({
      success: true,
      data: { review }
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get review',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update Review
export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });

    if (!existingReview) {
      res.status(404).json({
        success: false,
        message: 'Review not found'
      });
      return;
    }

    // Check if user is the reviewer
    if (existingReview.reviewerId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
      return;
    }

    // Validation
    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
      return;
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        ...(rating && { rating }),
        ...(comment !== undefined && { comment })
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        reviewee: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    // Update UserRating if rating changed
    if (rating && rating !== existingReview.rating) {
      await updateUserRating(existingReview.revieweeId);
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: { review: updatedReview }
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete Review
export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { id } = req.params;

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });

    if (!existingReview) {
      res.status(404).json({
        success: false,
        message: 'Review not found'
      });
      return;
    }

    // Check if user is the reviewer
    if (existingReview.reviewerId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
      return;
    }

    const revieweeId = existingReview.revieweeId;

    // Delete review
    await prisma.review.delete({
      where: { id }
    });

    // Update UserRating
    await updateUserRating(revieweeId);

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

// Helper function to update UserRating and User Tier
async function updateUserRating(userId: string): Promise<void> {
  try {
    // Get all reviews for the user
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId }
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    // Get transaction counts (including cancelled transactions)
    const [totalSales, totalPurchases, cancelledSales, cancelledPurchases] = await Promise.all([
      prisma.transaction.count({
        where: {
          sellerId: userId,
          status: 'COMPLETED'
        }
      }),
      prisma.transaction.count({
        where: {
          buyerId: userId,
          status: 'COMPLETED'
        }
      }),
      prisma.transaction.count({
        where: {
          sellerId: userId,
          status: 'CANCELLED',
          cancelledBy: 'seller'
        }
      }),
      prisma.transaction.count({
        where: {
          buyerId: userId,
          status: 'CANCELLED',
          cancelledBy: 'buyer'
        }
      })
    ]);

    const totalTrades = totalSales + totalPurchases;
    const cancelledTrades = cancelledSales + cancelledPurchases;

    // Calculate user tier based on trades and rating
    let tier = UserTier.NEWBIE;
    if (totalTrades >= 51 && averageRating >= 4.5) {
      tier = UserTier.VETERAN;
    } else if (totalTrades >= 21 && averageRating >= 4.0) {
      tier = UserTier.TRUSTED;
    } else if (totalTrades >= 6 && averageRating >= 3.0) {
      tier = UserTier.NORMAL;
    }

    // Upsert UserRating with cancel statistics
    await prisma.userRating.upsert({
      where: { userId },
      create: {
        userId,
        totalReviews,
        averageRating,
        totalSales,
        totalPurchases,
        cancelledSales,
        cancelledPurchases
      },
      update: {
        totalReviews,
        averageRating,
        totalSales,
        totalPurchases,
        cancelledSales,
        cancelledPurchases
      }
    });

    // Update User tier and total trades
    await prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        totalTrades,
        cancelledTrades
      }
    });
  } catch (error) {
    console.error('Update user rating error:', error);
    throw error;
  }
}

// Get User Rating
export const getUserRating = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const userRating = await prisma.userRating.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!userRating) {
      // Return default rating if not found
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          avatarUrl: true
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          rating: {
            userId,
            totalReviews: 0,
            averageRating: 0,
            totalSales: 0,
            totalPurchases: 0,
            user
          }
        }
      });
      return;
    }

    res.json({
      success: true,
      data: { rating: userRating }
    });
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user rating',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
