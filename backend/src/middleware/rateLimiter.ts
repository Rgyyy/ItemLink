import rateLimit from 'express-rate-limit';

// 이메일 인증번호 발송 제한 (개발: 1분에 10회, 프로덕션: 1시간에 3회)
export const emailVerificationLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 60 * 1000, // 프로덕션: 1시간, 개발: 1분
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 프로덕션: 3회, 개발: 10회
  message: {
    success: false,
    message: '인증번호 요청 횟수를 초과했습니다. 1시간 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 로그인 제한 (15분에 5회)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5,
  message: {
    success: false,
    message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 회원가입 제한 (1시간에 3회)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: '회원가입 시도 횟수를 초과했습니다. 1시간 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
