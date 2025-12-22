import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { DepositRequestStatus, DepositMatchStatus, Prisma } from '@prisma/client';
import {
  validateAmount,
  validatePagination,
  validateUserId,
  PaymentValidationError
} from '../utils/paymentValidator';
import { createPayActionService } from '../services/payactionService';

export const getBankAccountInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bankAccountInfo = {
      bankName: process.env.ADMIN_BANK_NAME || '농협은행',
      accountNumber: process.env.ADMIN_ACCOUNT_NUMBER || '352-1234-5678-90',
      accountHolder: process.env.ADMIN_ACCOUNT_HOLDER || '아이템링크',
      notice: '입금 후 입금자명, 금액, 입금일시를 정확히 입력해주세요. 관리자 확인 후 마일리지가 충전됩니다.'
    };

    res.json({
      success: true,
      data: bankAccountInfo
    });
  } catch (error) {
    console.error('Get bank account info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bank account info',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createDepositRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { amount, depositorName, depositDate, receiptImage, ordererPhone, ordererEmail } = req.body;

    if (!depositorName || typeof depositorName !== 'string' || depositorName.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Depositor name is required'
      });
      return;
    }

    if (!depositDate) {
      res.status(400).json({
        success: false,
        message: 'Deposit date is required'
      });
      return;
    }

    const validatedAmount = validateAmount(amount, 'deposit');
    const depositDateObj = new Date(depositDate);

    if (isNaN(depositDateObj.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid deposit date'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        fullName: true,
        phone: true,
        email: true
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const depositRequest = await prisma.depositRequest.create({
      data: {
        userId,
        amount: validatedAmount,
        depositorName: depositorName.trim(),
        depositDate: depositDateObj,
        receiptImage: receiptImage || null,
      }
    });

    let payactionOrderNumber: string | null = null;
    let payactionError: string | null = null;

    try {
      const payactionService = createPayActionService();
      const orderNumber = payactionService.generateOrderNumber(depositRequest.id);
      const orderDate = payactionService.formatOrderDate(depositDateObj);

      const payactionRequest: any = {
        order_number: orderNumber,
        order_amount: parseFloat(validatedAmount.toString()),
        order_date: orderDate,
        billing_name: depositorName.trim(),
        orderer_name: user.fullName || user.username
      };

      if (ordererPhone || user.phone) {
        payactionRequest.orderer_phone_number = payactionService.formatPhoneNumber(
          ordererPhone || user.phone
        );
      }

      if (ordererEmail || user.email) {
        payactionRequest.orderer_email = ordererEmail || user.email;
      }

      console.log('🚀 PayAction 주문 요청:', JSON.stringify(payactionRequest, null, 2));

      const payactionResponse = await payactionService.createOrder(payactionRequest);

      console.log('📥 PayAction 응답:', JSON.stringify(payactionResponse, null, 2));

      if (payactionResponse.status === 'success') {
        await prisma.depositRequest.update({
          where: { id: depositRequest.id },
          data: {
            bankdaOrderId: orderNumber
          }
        });

        payactionOrderNumber = orderNumber;
        console.log(`✅ PayAction order created: ${orderNumber}`);
      } else {
        const errorMsg = payactionResponse.response?.message || 'Unknown error';
        payactionError = errorMsg;
        console.error('❌ PayAction order creation failed:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      payactionError = errorMsg;
      console.error('❌ PayAction integration error:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Deposit request created successfully. Please transfer the amount to the provided account.',
      data: {
        depositRequest,
        payaction: {
          orderNumber: payactionOrderNumber,
          status: payactionOrderNumber ? 'registered' : 'failed',
          error: payactionError
        }
      }
    });
  } catch (error) {
    console.error('Create deposit request error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create deposit request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getDepositRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { status, page = '1', limit = '20' } = req.query;

    const { pageNum, limitNum, skip } = validatePagination(page, limit);

    const where: Prisma.DepositRequestWhereInput = {
      userId
    };

    if (status && Object.values(DepositRequestStatus).includes(status as DepositRequestStatus)) {
      where.status = status as DepositRequestStatus;
    }

    const [depositRequests, total] = await Promise.all([
      prisma.depositRequest.findMany({
        where,
        include: {
          processor: {
            select: {
              id: true,
              username: true,
              fullName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.depositRequest.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        depositRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get deposit requests error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get deposit requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getDepositRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Deposit request ID is required'
      });
      return;
    }

    const depositRequest = await prisma.depositRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        processor: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });

    if (!depositRequest) {
      res.status(404).json({
        success: false,
        message: 'Deposit request not found'
      });
      return;
    }

    if (depositRequest.userId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this deposit request'
      });
      return;
    }

    res.json({
      success: true,
      data: { depositRequest }
    });
  } catch (error) {
    console.error('Get deposit request error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get deposit request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllDepositRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { status, page = '1', limit = '20' } = req.query;

    const { pageNum, limitNum, skip } = validatePagination(page, limit);

    const where: Prisma.DepositRequestWhereInput = {};

    if (status && Object.values(DepositRequestStatus).includes(status as DepositRequestStatus)) {
      where.status = status as DepositRequestStatus;
    }

    const [depositRequests, total] = await Promise.all([
      prisma.depositRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              phone: true,
              balance: true
            }
          },
          processor: {
            select: {
              id: true,
              username: true,
              fullName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.depositRequest.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        depositRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get all deposit requests error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get deposit requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const approveDepositRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const adminId = validateUserId(req.user?.userId);
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Deposit request ID is required'
      });
      return;
    }

    const depositRequest = await prisma.depositRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            balance: true
          }
        }
      }
    });

    if (!depositRequest) {
      res.status(404).json({
        success: false,
        message: 'Deposit request not found'
      });
      return;
    }

    if (depositRequest.status !== DepositRequestStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: `Cannot approve deposit request with status: ${depositRequest.status}`
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.depositRequest.update({
        where: { id },
        data: {
          status: DepositRequestStatus.APPROVED,
          processedBy: adminId,
          processedAt: new Date(),
          adminNote: adminNote || null
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              balance: true
            }
          },
          processor: {
            select: {
              id: true,
              username: true,
              fullName: true
            }
          }
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: depositRequest.userId },
        data: {
          balance: {
            increment: depositRequest.amount
          }
        },
        select: {
          balance: true
        }
      });

      await tx.paymentTransaction.create({
        data: {
          userId: depositRequest.userId,
          type: 'DEPOSIT',
          amount: depositRequest.amount,
          status: 'COMPLETED',
          paymentMethod: 'BANK_TRANSFER',
          description: `Manual deposit approved - Depositor: ${depositRequest.depositorName}`,
          completedAt: new Date(),
          metadata: {
            depositRequestId: depositRequest.id,
            depositorName: depositRequest.depositorName,
            depositDate: depositRequest.depositDate,
            approvedBy: adminId
          }
        }
      });

      return {
        depositRequest: updatedRequest,
        newBalance: updatedUser.balance
      };
    });

    res.json({
      success: true,
      message: 'Deposit request approved successfully',
      data: result
    });
  } catch (error) {
    console.error('Approve deposit request error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to approve deposit request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const rejectDepositRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const adminId = validateUserId(req.user?.userId);
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Deposit request ID is required'
      });
      return;
    }

    if (!adminNote || typeof adminNote !== 'string' || adminNote.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Admin note is required for rejection'
      });
      return;
    }

    const depositRequest = await prisma.depositRequest.findUnique({
      where: { id }
    });

    if (!depositRequest) {
      res.status(404).json({
        success: false,
        message: 'Deposit request not found'
      });
      return;
    }

    if (depositRequest.status !== DepositRequestStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: `Cannot reject deposit request with status: ${depositRequest.status}`
      });
      return;
    }

    const updatedRequest = await prisma.depositRequest.update({
      where: { id },
      data: {
        status: DepositRequestStatus.REJECTED,
        processedBy: adminId,
        processedAt: new Date(),
        adminNote: adminNote.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            balance: true
          }
        },
        processor: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Deposit request rejected',
      data: { depositRequest: updatedRequest }
    });
  } catch (error) {
    console.error('Reject deposit request error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to reject deposit request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export async function processAutoDepositMatching(): Promise<{
  success: number;
  failed: number;
  details: Array<{ depositRequestId: string; status: string; message: string }>;
}> {
  const results: Array<{ depositRequestId: string; status: string; message: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  try {
    const bankdaService = createBankdaService();

    const pendingRequests = await prisma.depositRequest.findMany({
      where: {
        status: DepositRequestStatus.PENDING,
        autoMatched: false
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            balance: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (pendingRequests.length === 0) {
      console.log('No pending deposit requests to process');
      return { success: 0, failed: 0, details: [] };
    }

    const now = new Date();
    const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = now;

    const transactions = await bankdaService.getTransactionHistory(dateFrom, dateTo);

    for (const request of pendingRequests) {
      try {
        const depositDateTime = new Date(request.depositDate);
        const requestAmount = parseFloat(request.amount.toString());
        const requestDepositorName = request.depositorName.trim();

        const matchingTransaction = transactions.find(tx => {
          if (tx.type !== 'DEPOSIT') return false;

          const timeDiff = Math.abs(depositDateTime.getTime() - tx.dateTime.getTime());
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          const amountMatch = Math.abs(tx.amount - requestAmount) < 1;
          const timeMatch = hoursDiff <= 48;
          const nameMatch = tx.depositorName.includes(requestDepositorName) ||
                           requestDepositorName.includes(tx.depositorName);

          return amountMatch && timeMatch && nameMatch;
        });

        if (matchingTransaction) {
          await prisma.$transaction(async (tx) => {
            await tx.depositRequest.update({
              where: { id: request.id },
              data: {
                status: DepositRequestStatus.APPROVED,
                autoMatched: true,
                processedAt: new Date()
              }
            });

            await tx.user.update({
              where: { id: request.userId },
              data: {
                balance: {
                  increment: request.amount
                }
              }
            });

            await tx.paymentTransaction.create({
              data: {
                userId: request.userId,
                type: 'DEPOSIT',
                amount: request.amount,
                status: 'COMPLETED',
                paymentMethod: 'BANK_TRANSFER',
                description: `Auto-matched deposit - Depositor: ${request.depositorName}`,
                completedAt: new Date(),
                metadata: {
                  depositRequestId: request.id,
                  depositorName: request.depositorName,
                  depositDate: request.depositDate,
                  autoMatched: true,
                  bankTransaction: {
                    date: matchingTransaction.date,
                    time: matchingTransaction.time,
                    depositorName: matchingTransaction.depositorName
                  }
                }
              }
            });

            await tx.depositMatchingLog.create({
              data: {
                depositRequestId: request.id,
                bankTransactionDate: matchingTransaction.dateTime,
                amount: request.amount,
                depositorName: matchingTransaction.depositorName,
                matchStatus: DepositMatchStatus.CONFIRMED,
                matchedAt: new Date(),
                metadata: {
                  bankTransaction: {
                    date: matchingTransaction.date,
                    time: matchingTransaction.time,
                    amount: matchingTransaction.amount,
                    depositorName: matchingTransaction.depositorName
                  },
                  requestData: {
                    amount: requestAmount,
                    depositorName: requestDepositorName,
                    depositDate: request.depositDate
                  }
                }
              }
            });
          });

          successCount++;
          results.push({
            depositRequestId: request.id,
            status: 'success',
            message: `Matched and approved - Amount: ${requestAmount}, Depositor: ${requestDepositorName}`
          });

          console.log(`✅ Auto-matched deposit request ${request.id} for user ${request.user.username}`);
        } else {
          await prisma.depositMatchingLog.create({
            data: {
              depositRequestId: request.id,
              amount: request.amount,
              depositorName: request.depositorName,
              matchStatus: DepositMatchStatus.PENDING,
              failureReason: 'No matching transaction found in bank records',
              metadata: {
                searchCriteria: {
                  amount: requestAmount,
                  depositorName: requestDepositorName,
                  depositDate: request.depositDate,
                  dateRange: {
                    from: dateFrom,
                    to: dateTo
                  }
                }
              }
            }
          });

          results.push({
            depositRequestId: request.id,
            status: 'pending',
            message: 'No matching transaction found'
          });
        }
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await prisma.depositMatchingLog.create({
          data: {
            depositRequestId: request.id,
            amount: request.amount,
            depositorName: request.depositorName,
            matchStatus: DepositMatchStatus.FAILED,
            failureReason: errorMessage,
            metadata: {
              error: errorMessage
            }
          }
        });

        results.push({
          depositRequestId: request.id,
          status: 'failed',
          message: errorMessage
        });

        console.error(`❌ Failed to process deposit request ${request.id}:`, error);
      }
    }

    console.log(`✅ Auto deposit matching completed - Success: ${successCount}, Failed: ${failedCount}, Total: ${pendingRequests.length}`);

    return {
      success: successCount,
      failed: failedCount,
      details: results
    };
  } catch (error) {
    console.error('Auto deposit matching error:', error);
    throw error;
  }
}

export const triggerAutoDepositMatching = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const result = await processAutoDepositMatching();

    res.json({
      success: true,
      message: 'Auto deposit matching completed',
      data: result
    });
  } catch (error) {
    console.error('Trigger auto deposit matching error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to trigger auto deposit matching',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
