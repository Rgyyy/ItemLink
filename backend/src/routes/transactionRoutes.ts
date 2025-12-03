import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransactionStatus
} from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createTransaction);
router.get('/', authenticate, getTransactions);
router.get('/:id', authenticate, getTransactionById);
router.patch('/:id/status', authenticate, updateTransactionStatus);

export default router;
