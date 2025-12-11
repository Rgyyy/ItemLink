import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';

// Send Message
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { transactionId, receiverId, content } = req.body;

    // Validation
    if (!transactionId || !receiverId || !content) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID, receiver ID, and content are required'
      });
      return;
    }

    // Check if transaction exists and user is part of it
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You are not part of this transaction'
      });
      return;
    }

    // Validate receiver is the other party
    const validReceiverId = transaction.buyerId === userId
      ? transaction.sellerId
      : transaction.buyerId;

    if (receiverId !== validReceiverId) {
      res.status(400).json({
        success: false,
        message: 'Invalid receiver'
      });
      return;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        transactionId,
        senderId: userId,
        receiverId,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Messages for Transaction
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { transactionId } = req.params;

    // Check if transaction exists and user is part of it
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You are not part of this transaction'
      });
      return;
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Mark messages as read where current user is receiver
    await prisma.message.updateMany({
      where: {
        transactionId,
        receiverId: userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Unread Message Count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Mark Message as Read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Check if message exists and user is receiver
    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found'
      });
      return;
    }

    if (message.receiverId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You are not the receiver of this message'
      });
      return;
    }

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { message: updatedMessage }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
