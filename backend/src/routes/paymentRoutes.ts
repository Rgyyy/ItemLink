import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBalance,
  depositMileage,
  withdrawMileage,
  getPaymentTransactions,
  getPaymentTransactionById,
  addBankAccount,
  getBankAccounts,
  updateBankAccount,
  deleteBankAccount
} from '../controllers/paymentController';

const router = express.Router();

router.get('/balance', authenticate, getBalance);

router.post('/deposit', authenticate, depositMileage);

router.post('/withdraw', authenticate, withdrawMileage);

router.get('/transactions', authenticate, getPaymentTransactions);

router.get('/transactions/:id', authenticate, getPaymentTransactionById);

router.post('/bank-accounts', authenticate, addBankAccount);

router.get('/bank-accounts', authenticate, getBankAccounts);

router.patch('/bank-accounts/:id', authenticate, updateBankAccount);

router.delete('/bank-accounts/:id', authenticate, deleteBankAccount);

export default router;
