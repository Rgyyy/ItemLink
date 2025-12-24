import { Router } from 'express';
import {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade
} from '../controllers/tradeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getTrades);
router.get('/:id', getTradeById);
router.post('/', authenticate, createTrade);
router.put('/:id', authenticate, updateTrade);
router.delete('/:id', authenticate, deleteTrade);

export default router;
