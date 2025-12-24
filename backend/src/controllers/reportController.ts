import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { ReportType, ReportStatus } from '@prisma/client';

// 신고 생성
export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { reportedUserId, transactionId, type, reason, evidence } = req.body;

    // Validation
    if (!reportedUserId || !type || !reason) {
      res.status(400).json({
        success: false,
        message: 'Reported user ID, type, and reason are required'
      });
      return;
    }

    // 자기 자신 신고 방지
    if (userId === reportedUserId) {
      res.status(400).json({
        success: false,
        message: 'Cannot report yourself'
      });
      return;
    }

    // 중복 신고 체크
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId!,
        reportedUserId,
        transactionId: transactionId || null,
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWING] }
      }
    });

    if (existingReport) {
      res.status(409).json({
        success: false,
        message: 'You have already reported this user for this transaction'
      });
      return;
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId!,
        reportedUserId,
        transactionId: transactionId || null,
        type: type as ReportType,
        reason,
        evidence: evidence || null,
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
          }
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            tier: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 내가 작성한 신고 목록
export const getMyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      reporterId: userId
    };

    if (status) {
      where.status = status as ReportStatus;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reportedUser: {
            select: {
              id: true,
              username: true,
              tier: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.report.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 신고 상세 조회
export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
          }
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            tier: true,
            rating: true,
          }
        },
        processor: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'Report not found'
      });
      return;
    }

    // 권한 확인: 신고자, 피신고자, 관리자만 조회 가능
    if (
      report.reporterId !== userId &&
      report.reportedUserId !== userId &&
      req.user?.role !== 'ADMIN'
    ) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this report'
      });
      return;
    }

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
