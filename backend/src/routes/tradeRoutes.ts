import { Router } from 'express';
import {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade
} from '../controllers/tradeController';
import { uploadTradeImage, uploadTradeImages } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();

router.get('/', getTrades);
router.get('/:id', getTradeById);
router.post('/', authenticate, createTrade);
router.put('/:id', authenticate, updateTrade);
router.delete('/:id', authenticate, deleteTrade);

// 이미지 업로드 라우트
router.post('/upload/image', authenticate, upload.single('image'), uploadTradeImage);
router.post('/upload/images', authenticate, upload.array('images', 5), uploadTradeImages);

export default router;
