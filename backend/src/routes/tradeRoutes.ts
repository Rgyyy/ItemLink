import { Router } from 'express';
import {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade
} from '../controllers/tradeController';
import { uploadTradeImage, uploadTradeImages, serveTradeImage } from '../controllers/uploadController';
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

// 이미지 제공 라우트 (보안 강화: 접근 제어)
router.get('/images/:filename', serveTradeImage);

export default router;
