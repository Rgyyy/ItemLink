import nodemailer from 'nodemailer';

// 개발 환경 체크
const isDevelopment = process.env.NODE_ENV === 'development';
const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD;

// 이메일 설정
let emailTransporter: nodemailer.Transporter;

if (!isDevelopment && hasEmailConfig) {
  // 프로덕션 환경: 실제 Gmail 사용
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
} else if (isDevelopment && hasEmailConfig) {
  // 개발 환경에 이메일 설정이 있으면 실제 이메일 발송
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
  console.log('📧 Email configured for development with actual sending');
} else {
  // 개발 환경: 이메일 설정 없으면 콘솔 출력용 테스트 모드
  emailTransporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
  console.log('📧 Email running in DEVELOPMENT mode (console only)');
  console.log('⚠️  To send real emails, set EMAIL_USER and EMAIL_APP_PASSWORD in .env');
}

export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@itemlink.com',
    to: email,
    subject: 'ItemLink 이메일 인증번호',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4F46E5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              color: #4F46E5;
              text-align: center;
              padding: 20px;
              background-color: white;
              border-radius: 8px;
              margin: 20px 0;
              letter-spacing: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ItemLink 회원가입 인증</h1>
            </div>
            <div class="content">
              <p>안녕하세요,</p>
              <p>ItemLink 회원가입을 위한 인증번호입니다.</p>
              <p>아래 인증번호를 입력하여 회원가입을 완료해주세요.</p>

              <div class="code">${code}</div>

              <p><strong>이 코드는 5분간 유효합니다.</strong></p>
              <p>본인이 요청하지 않은 인증번호라면 이 이메일을 무시하셔도 됩니다.</p>

              <div class="footer">
                <p>© 2025 ItemLink. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);

    // 개발 환경에서 이메일 설정이 없는 경우 콘솔에 출력
    if (isDevelopment && !hasEmailConfig) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL VERIFICATION CODE (Development Mode)');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Code: ${code}`);
      console.log('='.repeat(60) + '\n');
    } else {
      console.log(`✅ Verification email sent to ${email}`);
    }
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);

    // 개발 환경에서는 에러를 던지지 않고 콘솔에 코드 출력
    if (isDevelopment) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL VERIFICATION CODE (Fallback - Email Failed)');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Code: ${code}`);
      console.log('='.repeat(60) + '\n');
      // 개발 환경에서는 성공으로 처리
      return;
    }

    throw error;
  }
};

export { emailTransporter };
