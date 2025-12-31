import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

export const handleSocialAuthCallback = (req: Request, res: Response) => {
  try {
    const user = req.user as JWTPayload;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // 프론트엔드로 리다이렉트 (토큰 전달)
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Social auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};
