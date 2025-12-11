import { Decimal } from '@prisma/client/runtime/library';

export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

export const PAYMENT_LIMITS = {
  MIN_DEPOSIT: 1000,
  MAX_DEPOSIT: 10000000,
  MIN_WITHDRAWAL: 1000,
  MAX_WITHDRAWAL: 10000000,
  MIN_PAGE: 1,
  MAX_PAGE: 10000,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
};

export function validateAmount(amount: any, type: 'deposit' | 'withdrawal'): number {
  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);

  if (isNaN(parsedAmount)) {
    throw new PaymentValidationError('Amount must be a valid number');
  }

  if (parsedAmount <= 0) {
    throw new PaymentValidationError('Amount must be greater than 0');
  }

  if (!Number.isFinite(parsedAmount)) {
    throw new PaymentValidationError('Amount must be a finite number');
  }

  if (parsedAmount !== Math.floor(parsedAmount)) {
    throw new PaymentValidationError('Amount must be a whole number (no decimals)');
  }

  const minAmount = type === 'deposit' ? PAYMENT_LIMITS.MIN_DEPOSIT : PAYMENT_LIMITS.MIN_WITHDRAWAL;
  const maxAmount = type === 'deposit' ? PAYMENT_LIMITS.MAX_DEPOSIT : PAYMENT_LIMITS.MAX_WITHDRAWAL;

  if (parsedAmount < minAmount) {
    throw new PaymentValidationError(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} amount must be at least ${minAmount.toLocaleString()}`);
  }

  if (parsedAmount > maxAmount) {
    throw new PaymentValidationError(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} amount cannot exceed ${maxAmount.toLocaleString()}`);
  }

  return parsedAmount;
}

export function validatePagination(page: any, limit: any): { pageNum: number; limitNum: number; skip: number } {
  let pageNum = parseInt(page as string) || 1;
  let limitNum = parseInt(limit as string) || 20;

  if (isNaN(pageNum) || pageNum < PAYMENT_LIMITS.MIN_PAGE) {
    pageNum = 1;
  }

  if (pageNum > PAYMENT_LIMITS.MAX_PAGE) {
    pageNum = PAYMENT_LIMITS.MAX_PAGE;
  }

  if (isNaN(limitNum) || limitNum < PAYMENT_LIMITS.MIN_LIMIT) {
    limitNum = 20;
  }

  if (limitNum > PAYMENT_LIMITS.MAX_LIMIT) {
    limitNum = PAYMENT_LIMITS.MAX_LIMIT;
  }

  const skip = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skip };
}

export function validateUserId(userId: string | undefined): string {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new PaymentValidationError('User ID is required');
  }
  return userId;
}

export function validateBalance(currentBalance: Decimal | number, requestedAmount: number): void {
  const balance = typeof currentBalance === 'number' ? currentBalance : Number(currentBalance);

  if (balance < requestedAmount) {
    throw new PaymentValidationError(
      `Insufficient balance. Available: ${balance.toLocaleString()}, Requested: ${requestedAmount.toLocaleString()}`
    );
  }
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }

  const visibleStart = Math.min(4, Math.floor(accountNumber.length / 3));
  const visibleEnd = Math.min(4, Math.floor(accountNumber.length / 3));
  const maskLength = accountNumber.length - visibleStart - visibleEnd;

  if (maskLength <= 0) {
    return accountNumber.substring(0, 2) + '**';
  }

  return (
    accountNumber.substring(0, visibleStart) +
    '*'.repeat(maskLength) +
    accountNumber.substring(accountNumber.length - visibleEnd)
  );
}

export function validateBankAccountFields(
  bankCode: string,
  bankName: string,
  accountNumber: string,
  accountHolderName: string
): void {
  if (!bankCode || typeof bankCode !== 'string' || bankCode.trim().length === 0) {
    throw new PaymentValidationError('Bank code is required');
  }

  if (!bankName || typeof bankName !== 'string' || bankName.trim().length === 0) {
    throw new PaymentValidationError('Bank name is required');
  }

  if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length === 0) {
    throw new PaymentValidationError('Account number is required');
  }

  if (!/^\d+$/.test(accountNumber.trim())) {
    throw new PaymentValidationError('Account number must contain only digits');
  }

  if (accountNumber.length < 10 || accountNumber.length > 14) {
    throw new PaymentValidationError('Account number must be between 10 and 14 digits');
  }

  if (!accountHolderName || typeof accountHolderName !== 'string' || accountHolderName.trim().length === 0) {
    throw new PaymentValidationError('Account holder name is required');
  }

  if (accountHolderName.trim().length < 2 || accountHolderName.trim().length > 50) {
    throw new PaymentValidationError('Account holder name must be between 2 and 50 characters');
  }
}
