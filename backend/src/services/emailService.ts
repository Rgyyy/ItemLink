import prisma from '../config/prisma';
import { sendVerificationEmail } from '../config/email';
import { generateVerificationCode } from '../utils/codeGenerator';

export class EmailService {
  // 인증번호 발송
  async sendVerificationCode(email: string): Promise<void> {
    // 기존 미인증 코드 삭제
    await prisma.emailVerification.deleteMany({
      where: { email, verified: false },
    });

    // 새 인증번호 생성
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

    // DB에 저장
    await prisma.emailVerification.create({
      data: { email, code, expiresAt },
    });

    // 이메일 발송
    await sendVerificationEmail(email, code);
  }

  // 인증번호 확인
  async verifyCode(email: string, code: string): Promise<boolean> {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      return false;
    }

    // 시도 횟수 증가
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { attempts: verification.attempts + 1 },
    });

    // 최대 시도 횟수 체크 (5회)
    if (verification.attempts >= 5) {
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      return false;
    }

    // 인증 성공
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    return true;
  }

  // 인증 완료 여부 확인
  async isEmailVerified(email: string): Promise<boolean> {
    const verification = await prisma.emailVerification.findFirst({
      where: { email, verified: true },
      orderBy: { createdAt: 'desc' },
    });

    return !!verification;
  }
}

export const emailService = new EmailService();
