import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { PrismaClient, AuthProvider } from '@prisma/client';

const prisma = new PrismaClient();

// Google OAuth 전략
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('이메일 정보를 가져올 수 없습니다.'));
          }

          // 기존 사용자 찾기
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // 기존 이메일 계정이 있으면 소셜 정보 연동
            if (user.provider === AuthProvider.LOCAL) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  provider: AuthProvider.GOOGLE,
                  providerId: profile.id,
                },
              });
            }
          } else {
            // 신규 사용자 생성
            user = await prisma.user.create({
              data: {
                email,
                username: profile.displayName || `google_${profile.id}`,
                fullName: profile.displayName || '',
                provider: AuthProvider.GOOGLE,
                providerId: profile.id,
                isVerified: true, // 소셜 로그인은 자동 인증
                avatarUrl: profile.photos?.[0]?.value,
              },
            });
          }

          // Convert to JWTPayload format
          const jwtUser = {
            userId: user.id,
            email: user.email,
            role: user.role,
          };
          return done(null, jwtUser);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Naver OAuth 전략
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  passport.use(
    new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/naver/callback`,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.email;
          if (!email) {
            return done(new Error('이메일 정보를 가져올 수 없습니다.'));
          }

          // 기존 사용자 찾기
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // 기존 이메일 계정이 있으면 소셜 정보 연동
            if (user.provider === AuthProvider.LOCAL) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  provider: AuthProvider.NAVER,
                  providerId: profile.id,
                },
              });
            }
          } else {
            // 신규 사용자 생성
            user = await prisma.user.create({
              data: {
                email,
                username: profile.name || `naver_${profile.id}`,
                fullName: profile.name || '',
                provider: AuthProvider.NAVER,
                providerId: profile.id,
                isVerified: true, // 소셜 로그인은 자동 인증
                avatarUrl: profile.profile_image,
                phone: profile.mobile,
              },
            });
          }

          // Convert to JWTPayload format
          const jwtUser = {
            userId: user.id,
            email: user.email,
            role: user.role,
          };
          return done(null, jwtUser);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Kakao OAuth 전략
if (process.env.KAKAO_CLIENT_ID) {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/kakao/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json.kakao_account?.email;
          if (!email) {
            return done(new Error('이메일 정보를 가져올 수 없습니다.'));
          }

          // 기존 사용자 찾기
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // 기존 이메일 계정이 있으면 소셜 정보 연동
            if (user.provider === AuthProvider.LOCAL) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  provider: AuthProvider.KAKAO,
                  providerId: profile.id,
                },
              });
            }
          } else {
            // 신규 사용자 생성
            const nickname = profile._json.kakao_account?.profile?.nickname;
            user = await prisma.user.create({
              data: {
                email,
                username: nickname || `kakao_${profile.id}`,
                fullName: nickname || '',
                provider: AuthProvider.KAKAO,
                providerId: profile.id,
                isVerified: true, // 소셜 로그인은 자동 인증
                avatarUrl: profile._json.kakao_account?.profile?.profile_image_url,
              },
            });
          }

          // Convert to JWTPayload format
          const jwtUser = {
            userId: user.id,
            email: user.email,
            role: user.role,
          };
          return done(null, jwtUser);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Serialize/Deserialize (세션 사용 시)
passport.serializeUser((user: any, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return done(null, false);
    }
    // Convert Prisma User to JWTPayload
    const jwtUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    done(null, jwtUser);
  } catch (error) {
    done(error);
  }
});

export default passport;
