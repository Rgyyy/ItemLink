import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateToken } from '../utils/jwt';
import { emailService } from '../services/emailService';
import { validatePassword } from '../utils/passwordValidator';
import { AuthRequest } from '../types';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, fullName, phone } = req.body;

    // Validation
    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'Email, username, and password are required'
      });
      return;
    }

    // 이메일 인증 확인
    const isEmailVerified = await emailService.isEmailVerified(email);
    if (!isEmailVerified) {
      res.status(400).json({
        success: false,
        message: 'Email not verified. Please verify your email first.'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Email or username already exists'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        fullName: fullName || null,
        phone: phone || null,
        isVerified: true, // 이메일 인증 완료
        provider: 'LOCAL',
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
      }
    });

    // 인증 완료된 verification 레코드 삭제
    await prisma.emailVerification.deleteMany({
      where: { email, verified: true },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
      return;
    }

    // Verify password
    if (!user.passwordHash) {
      res.status(401).json({
        success: false,
        message: 'This account uses social login. Please login with your social account.'
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { username, fullName, phone, avatarUrl } = req.body;

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
        return;
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(fullName !== undefined && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
      return;
    }

    // Password strength validation
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
      return;
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify current password
    if (!user.passwordHash) {
      res.status(400).json({
        success: false,
        message: 'This account uses social login and cannot change password.'
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 이메일 인증번호 발송
export const sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    // 이미 가입된 이메일 체크
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
      return;
    }

    await emailService.sendVerificationCode(email);

    res.json({
      success: true,
      message: 'Verification code sent successfully',
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// 인증번호 확인
export const verifyEmailCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: 'Email and code are required',
      });
      return;
    }

    const isValid = await emailService.verifyCode(email, code);

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email code error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// 회원 탈퇴
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    if (!password) {
      res.status(400).json({
        success: false,
        message: 'Password is required for account deletion'
      });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // 소셜 로그인 사용자 체크
    if (!user.passwordHash) {
      res.status(400).json({
        success: false,
        message: 'Social login accounts cannot be deleted with password verification'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
      return;
    }

    // 계정 비활성화 + 개인정보 익명화
    const randomHash = await bcrypt.hash(Math.random().toString(), 10);
    const deletedEmail = `deleted_user_${user.id}@deleted.com`;
    const deletedUsername = `${user.username} (탈퇴한 사용자)`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: deletedEmail,
        username: deletedUsername,
        fullName: null,
        phone: null,
        avatarUrl: null,
        passwordHash: randomHash,
      }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
