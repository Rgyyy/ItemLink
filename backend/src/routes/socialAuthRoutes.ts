import { Router } from 'express';
import passport from '../config/passport';
import { handleSocialAuthCallback } from '../controllers/socialAuthController';

const router = Router();

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  handleSocialAuthCallback
);

// Naver OAuth
router.get(
  '/naver',
  passport.authenticate('naver', { session: false })
);

router.get(
  '/naver/callback',
  passport.authenticate('naver', { session: false, failureRedirect: '/login' }),
  handleSocialAuthCallback
);

// Kakao OAuth
router.get(
  '/kakao',
  passport.authenticate('kakao', { session: false })
);

router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { session: false, failureRedirect: '/login' }),
  handleSocialAuthCallback
);

export default router;
