import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { PaymentType, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import openBankingService, { OpenBankingError } from '../services/openBankingService';
import {
  validateAmount,
  validatePagination,
  validateUserId,
  validateBalance,
  maskAccountNumber,
  validateBankAccountFields,
  PaymentValidationError
} from '../utils/paymentValidator';

export const getBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
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
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

async function processPaymentTransaction(
  userId: string,
  type: PaymentType,
  amount: number,
  paymentMethod: PaymentMethod,
  bankAccountId?: string
) {
  let bankTransactionId: string | undefined;
  let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
  let failureReason: string | undefined;

  // 외부 API 호출은 트랜잭션 밖에서 처리
  if (paymentMethod === PaymentMethod.OPEN_BANKING) {
    try {
      const transferResult = type === PaymentType.DEPOSIT
        ? await openBankingService.depositToUser(amount, `Mileage ${type}`)
        : await openBankingService.withdrawFromUser(amount, `Mileage ${type}`);

      if (transferResult.status === 'SUCCESS') {
        bankTransactionId = transferResult.transactionId;
        paymentStatus = PaymentStatus.COMPLETED;
      } else {
        paymentStatus = PaymentStatus.FAILED;
        failureReason = transferResult.message || 'Transfer failed';
      }
    } catch (error) {
      paymentStatus = PaymentStatus.FAILED;
      if (error instanceof OpenBankingError) {
        failureReason = error.message;
      } else if (error instanceof Error) {
        failureReason = error.message;
      } else {
        failureReason = 'Unknown error occurred';
      }
    }
  }

  // 데이터베이스 트랜잭션
  const result = await prisma.$transaction(async (tx) => {
    const paymentTransaction = await tx.paymentTransaction.create({
      data: {
        userId,
        type,
        amount,
        status: paymentStatus,
        paymentMethod,
        bankTransactionId,
        bankAccountId,
        description: `Mileage ${type.toLowerCase()}`,
        failureReason,
        completedAt: paymentStatus === PaymentStatus.COMPLETED ? new Date() : null,
      },
    });

    if (paymentStatus === PaymentStatus.COMPLETED) {
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            [type === PaymentType.DEPOSIT ? 'increment' : 'decrement']: amount
          }
        }
      });
    }

    return paymentTransaction;
  });

  return result;
}

export const depositMileage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { amount, paymentMethod = PaymentMethod.OPEN_BANKING, bankAccountId } = req.body;

    const validatedAmount = validateAmount(amount, 'deposit');

    const result = await processPaymentTransaction(
      userId,
      PaymentType.DEPOSIT,
      validatedAmount,
      paymentMethod as PaymentMethod,
      bankAccountId
    );

    if (result.status === PaymentStatus.COMPLETED) {
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      });

      res.status(201).json({
        success: true,
        message: 'Mileage deposited successfully',
        data: {
          transaction: {
            ...result,
            bankTransactionId: result.bankTransactionId
          },
          newBalance: updatedUser?.balance
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.failureReason || 'Failed to deposit mileage',
        data: {
          transaction: {
            id: result.id,
            status: result.status,
            failureReason: result.failureReason
          }
        }
      });
    }
  } catch (error) {
    console.error('Deposit mileage error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to deposit mileage',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const withdrawMileage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { amount, paymentMethod = PaymentMethod.OPEN_BANKING, bankAccountId } = req.body;

    const validatedAmount = validateAmount(amount, 'withdrawal');

    if (!bankAccountId) {
      res.status(400).json({
        success: false,
        message: 'Bank account is required for withdrawal'
      });
      return;
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId }
    });

    if (!bankAccount || bankAccount.userId !== userId) {
      res.status(400).json({
        success: false,
        message: 'Invalid bank account'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    validateBalance(user.balance, validatedAmount);

    const result = await processPaymentTransaction(
      userId,
      PaymentType.WITHDRAWAL,
      validatedAmount,
      paymentMethod as PaymentMethod,
      bankAccountId
    );

    if (result.status === PaymentStatus.COMPLETED) {
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      });

      res.status(201).json({
        success: true,
        message: 'Mileage withdrawn successfully',
        data: {
          transaction: {
            ...result,
            bankTransactionId: result.bankTransactionId
          },
          newBalance: updatedUser?.balance
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.failureReason || 'Failed to withdraw mileage',
        data: {
          transaction: {
            id: result.id,
            status: result.status,
            failureReason: result.failureReason
          }
        }
      });
    }
  } catch (error) {
    console.error('Withdraw mileage error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to withdraw mileage',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPaymentTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { type, status, page = '1', limit = '20' } = req.query;

    const { pageNum, limitNum, skip } = validatePagination(page, limit);

    const where: Prisma.PaymentTransactionWhereInput = {
      userId
    };

    if (type && Object.values(PaymentType).includes(type as PaymentType)) {
      where.type = type as PaymentType;
    }

    if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      where.status = status as PaymentStatus;
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountNumber: true,
              accountHolderName: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.paymentTransaction.count({ where })
    ]);

    const maskedTransactions = transactions.map(transaction => ({
      ...transaction,
      bankAccount: transaction.bankAccount ? {
        ...transaction.bankAccount,
        accountNumber: maskAccountNumber(transaction.bankAccount.accountNumber)
      } : null
    }));

    res.json({
      success: true,
      data: {
        transactions: maskedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get payment transactions error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get payment transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPaymentTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
      return;
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        bankAccount: {
          select: {
            bankName: true,
            accountNumber: true,
            accountHolderName: true,
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
      return;
    }

    if (transaction.userId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment transaction'
      });
      return;
    }

    const maskedTransaction = {
      ...transaction,
      bankAccount: transaction.bankAccount ? {
        ...transaction.bankAccount,
        accountNumber: maskAccountNumber(transaction.bankAccount.accountNumber)
      } : null
    };

    res.json({
      success: true,
      data: { transaction: maskedTransaction }
    });
  } catch (error) {
    console.error('Get payment transaction error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get payment transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const addBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { bankCode, bankName, accountNumber, accountHolderName, isDefault = false } = req.body;

    validateBankAccountFields(bankCode, bankName, accountNumber, accountHolderName);

    const existingAccount = await prisma.bankAccount.findUnique({
      where: {
        userId_accountNumber: {
          userId,
          accountNumber: accountNumber.trim()
        }
      }
    });

    if (existingAccount) {
      res.status(400).json({
        success: false,
        message: 'Bank account already exists'
      });
      return;
    }

    const bankAccount = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      return await tx.bankAccount.create({
        data: {
          userId,
          bankCode: bankCode.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          isDefault,
          isVerified: false,
        }
      });
    });

    const maskedBankAccount = {
      ...bankAccount,
      accountNumber: maskAccountNumber(bankAccount.accountNumber)
    };

    res.status(201).json({
      success: true,
      message: 'Bank account added successfully',
      data: { bankAccount: maskedBankAccount }
    });
  } catch (error) {
    console.error('Add bank account error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add bank account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getBankAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const maskedBankAccounts = bankAccounts.map(account => ({
      ...account,
      accountNumber: maskAccountNumber(account.accountNumber)
    }));

    res.json({
      success: true,
      data: { bankAccounts: maskedBankAccounts }
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get bank accounts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { id } = req.params;
    const { isDefault } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Bank account ID is required'
      });
      return;
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id }
    });

    if (!bankAccount) {
      res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
      return;
    }

    if (bankAccount.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this bank account'
      });
      return;
    }

    const updatedAccount = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      return await tx.bankAccount.update({
        where: { id },
        data: { isDefault }
      });
    });

    const maskedAccount = {
      ...updatedAccount,
      accountNumber: maskAccountNumber(updatedAccount.accountNumber)
    };

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: { bankAccount: maskedAccount }
    });
  } catch (error) {
    console.error('Update bank account error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update bank account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUserId(req.user?.userId);
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Bank account ID is required'
      });
      return;
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            paymentTransactions: true
          }
        }
      }
    });

    if (!bankAccount) {
      res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
      return;
    }

    if (bankAccount.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this bank account'
      });
      return;
    }

    if (bankAccount._count.paymentTransactions > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete bank account with existing payment transactions'
      });
      return;
    }

    await prisma.bankAccount.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    console.error('Delete bank account error:', error);

    if (error instanceof PaymentValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
