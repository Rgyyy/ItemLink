import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransactionStatus,
  cancelTransaction
} from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createTransaction);
router.get('/', authenticate, getTransactions);
router.get('/:id', authenticate, getTransactionById);
router.patch('/:id/status', authenticate, updateTransactionStatus);
router.post('/:id/cancel', authenticate, cancelTransaction);

export default router;
