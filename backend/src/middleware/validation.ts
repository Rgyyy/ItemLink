import { Request, Response, NextFunction } from 'express';
import { validatePassword } from '../utils/passwordValidator';

export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, username, password } = req.body;

  // 이메일 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      message: 'Invalid email format',
    });
    return;
  }

  // 사용자명 검증
  if (!username || username.trim().length < 2) {
    res.status(400).json({
      success: false,
      message: 'Username must be at least 2 characters long',
    });
    return;
  }

  // 비밀번호 검증
  if (!password) {
    res.status(400).json({
      success: false,
      message: 'Password is required',
    });
    return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    res.status(400).json({
      success: false,
      message: 'Password validation failed',
      errors: passwordValidation.errors,
    });
    return;
  }

  next();
};
