import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';

// 댓글 생성
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { tradeId, content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.',
      });
    }

    if (!tradeId || !content) {
      return res.status(400).json({
        success: false,
        message: '거래 ID와 댓글 내용은 필수입니다.',
      });
    }

    // 거래글 존재 확인
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: '거래글을 찾을 수 없습니다.',
      });
    }

    const comment = await prisma.comment.create({
      data: {
        tradeId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { comment },
      message: '댓글이 작성되었습니다.',
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: '댓글 작성 중 오류가 발생했습니다.',
    });
  }
};

// 거래글의 댓글 목록 조회
export const getCommentsByTradeId = async (req: AuthRequest, res: Response) => {
  try {
    const { tradeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { tradeId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: { tradeId } }),
    ]);

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: '댓글 조회 중 오류가 발생했습니다.',
    });
  }
};

// 댓글 수정
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.',
      });
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '댓글 수정 권한이 없습니다.',
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { comment: updatedComment },
      message: '댓글이 수정되었습니다.',
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: '댓글 수정 중 오류가 발생했습니다.',
    });
  }
};

// 댓글 삭제
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.',
      });
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '댓글 삭제 권한이 없습니다.',
      });
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '댓글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: '댓글 삭제 중 오류가 발생했습니다.',
    });
  }
};
