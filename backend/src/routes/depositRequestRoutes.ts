import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBankAccountInfo,
  createDepositRequest,
  getDepositRequests,
  getDepositRequestById,
  getAllDepositRequests,
  approveDepositRequest,
  rejectDepositRequest,
  triggerAutoDepositMatching
} from '../controllers/depositRequestController';

const router = express.Router();

router.get('/bank-info', authenticate, getBankAccountInfo);

router.post('/', authenticate, createDepositRequest);

router.get('/', authenticate, getDepositRequests);

router.get('/all', authenticate, getAllDepositRequests);

router.get('/:id', authenticate, getDepositRequestById);

router.post('/:id/approve', authenticate, approveDepositRequest);

router.post('/:id/reject', authenticate, rejectDepositRequest);

router.post('/auto-match', authenticate, triggerAutoDepositMatching);

export default router;
