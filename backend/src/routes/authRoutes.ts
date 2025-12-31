import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  sendVerificationCode,
  verifyEmailCode,
  deleteAccount,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRegistration } from '../middleware/validation';
import {
  emailVerificationLimiter,
  loginLimiter,
  registerLimiter,
} from '../middleware/rateLimiter';

const router = Router();

// 이메일 인증
router.post('/send-verification', emailVerificationLimiter, sendVerificationCode);
router.post('/verify-email', verifyEmailCode);

// 기존 라우트
router.post('/register', registerLimiter, validateRegistration, register);
router.post('/login', loginLimiter, login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);

export default router;
