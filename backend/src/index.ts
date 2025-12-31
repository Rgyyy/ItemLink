import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import prisma from './config/prisma';
import passport from './config/passport';
import authRoutes from './routes/authRoutes';
import socialAuthRoutes from './routes/socialAuthRoutes';
import tradeRoutes from './routes/tradeRoutes';
import commentRoutes from './routes/commentRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (업로드된 이미지)
app.use('/uploads', express.static('uploads'));

// Session 미들웨어 (소셜 로그인용)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
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
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🎮 ItemLink Direct Trade Platform`);
});

export default app;
