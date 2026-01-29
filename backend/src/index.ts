import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import helmet from 'helmet';
import prisma from './config/prisma';
import passport from './config/passport';
import authRoutes from './routes/authRoutes';
import socialAuthRoutes from './routes/socialAuthRoutes';
import tradeRoutes from './routes/tradeRoutes';
import commentRoutes from './routes/commentRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

// 환경 변수 필수 검증
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['SESSION_SECRET', 'JWT_SECRET', 'DATABASE_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Helmet 보안 헤더 적용
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // 이미지 로딩을 위해 필요
}));

// CORS 설정 (JWT 기반이므로 credentials 불필요)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: false, // CSRF 공격 방지를 위해 비활성화
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 직접 제공 제거 - 컨트롤러를 통한 접근 제어로 변경
// app.use('/uploads', express.static('uploads')); // 보안 위험으로 제거됨

// Session 미들웨어 (소셜 로그인용)
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  console.warn('⚠️  WARNING: Using default session secret in development. Set SESSION_SECRET in .env for production.');
}

app.use(
  session({
    secret: sessionSecret || 'dev-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, // XSS 방지
      sameSite: 'lax', // CSRF 방지
      maxAge: 24 * 60 * 60 * 1000, // 24시간
    },
  })
);

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'ItemLink API is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT NOW()`;
    const tradesCount = await prisma.trade.count();
    const usersCount = await prisma.user.count();
    res.json({
      success: true,
      message: 'Database connected successfully',
      tradesCount,
      usersCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', socialAuthRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Server error:', err.stack);

  // 프로덕션에서는 민감한 정보 노출 방지
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDevelopment && { error: err.message, stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🎮 ItemLink Direct Trade Platform`);
});

export default app;
