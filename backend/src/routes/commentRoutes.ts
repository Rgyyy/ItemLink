import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createComment,
  getCommentsByTradeId,
  updateComment,
  deleteComment,
} from '../controllers/commentController';

const router = express.Router();

// 댓글 생성 (인증 필요)
router.post('/', authenticate, createComment);

// 거래글의 댓글 목록 조회 (공개)
router.get('/trade/:tradeId', getCommentsByTradeId);

// 댓글 수정 (인증 필요)
router.put('/:id', authenticate, updateComment);

// 댓글 삭제 (인증 필요)
router.delete('/:id', authenticate, deleteComment);

export default router;
