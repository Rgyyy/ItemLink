# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

### 1.1 회원가입 및 로그인
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인 (또는 이메일로 가입)

### 1.2 새 프로젝트 생성
1. 대시보드에서 "New project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `itemlink` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (복사해두세요!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서버)
   - **Pricing Plan**: Free 선택
3. "Create new project" 클릭
4. 프로젝트 생성 대기 (약 2-3분 소요)

## 2. 데이터베이스 연결 정보 가져오기

### 2.1 Connection String 복사
1. 프로젝트 대시보드에서 좌측 메뉴의 ⚙️ **Settings** 클릭
2. **Database** 메뉴 클릭
3. "Connection string" 섹션에서 **URI** 선택
4. **Connection string** 복사
   - 예시: `postgresql://postgres.xxxxx:password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`

### 2.2 비밀번호 교체
복사한 Connection String에서 `[YOUR-PASSWORD]`를 실제 비밀번호로 교체

예시:
```
변경 전:
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

변경 후:
postgresql://postgres.xxxxx:your_actual_password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

## 3. 환경 변수 설정

`backend/.env` 파일을 열고 `DATABASE_URL`을 수정:

```env
# Supabase PostgreSQL Connection
DATABASE_URL="postgresql://postgres.xxxxx:your_password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
```

**중요!**
- Direct Connection이 아닌 **Connection Pooling** URL 사용
- URL 전체를 큰따옴표("")로 감싸기
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요

## 4. Prisma 마이그레이션 실행

### 4.1 데이터베이스에 스키마 적용

```bash
cd backend
npx prisma migrate dev --name init
```

이 명령어는:
1. Supabase 데이터베이스에 연결
2. Prisma 스키마를 기반으로 테이블 생성
3. Prisma Client 코드 자동 생성

### 4.2 초기 데이터 시드 (선택사항)

`backend/prisma/seed.ts` 파일 생성:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 게임 데이터 삽입
  const games = await prisma.game.createMany({
    data: [
      { name: '리그 오브 레전드', slug: 'league-of-legends', description: 'MOBA 게임' },
      { name: '메이플스토리', slug: 'maplestory', description: 'MMORPG 게임' },
      { name: '로스트아크', slug: 'lost-ark', description: 'MMORPG 게임' },
      { name: '던전앤파이터', slug: 'dungeon-fighter', description: 'MMORPG 게임' },
      { name: '피파온라인4', slug: 'fifa-online-4', description: '축구 게임' },
    ],
  })

  console.log('✅ Seeded games:', games)

  // 카테고리 추가 (리그 오브 레전드)
  const lol = await prisma.game.findUnique({ where: { slug: 'league-of-legends' } })

  if (lol) {
    await prisma.itemCategory.createMany({
      data: [
        { gameId: lol.id, name: '게임 머니', slug: 'game-money', description: 'RP, 블루 에센스 등' },
        { gameId: lol.id, name: '계정', slug: 'account', description: '레벨업된 계정' },
      ],
    })
    console.log('✅ Seeded categories for LoL')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

`package.json`에 seed 스크립트 추가:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

실행:
```bash
npx prisma db seed
```

## 5. Prisma Studio로 데이터베이스 확인

```bash
npx prisma studio
```

브라우저에서 http://localhost:5555 열림
- 모든 테이블 확인 가능
- GUI로 데이터 편집 가능

## 6. 백엔드 서버 실행

```bash
cd backend
npm run dev
```

서버가 http://localhost:5000 에서 실행됩니다.

### 6.1 API 테스트

```bash
# 헬스 체크
curl http://localhost:5000/health

# 데이터베이스 연결 테스트
curl http://localhost:5000/api/test-db

# 게임 목록 조회
curl http://localhost:5000/api/games
```

## 7. Supabase 대시보드 활용

### 7.1 Table Editor
- 좌측 메뉴 **Table Editor**에서 테이블 확인
- GUI로 데이터 추가/수정/삭제

### 7.2 SQL Editor
- 좌측 메뉴 **SQL Editor**에서 SQL 직접 실행
- 복잡한 쿼리나 데이터 분석에 유용

### 7.3 Database Backups
- Settings > Backups에서 자동 백업 확인
- 무료 플랜: 7일간 백업 보관

## 8. 문제 해결

### "Can't reach database server"
- Supabase 프로젝트가 활성화되어 있는지 확인
- DATABASE_URL이 올바른지 확인
- 인터넷 연결 확인

### "Password authentication failed"
- DATABASE_URL의 비밀번호가 정확한지 확인
- Supabase 대시보드에서 비밀번호 재설정 가능

### "Too many connections"
- Connection Pooling URL 사용 (port 6543)
- Direct Connection 대신 Transaction Mode 사용

### Prisma 마이그레이션 실패
```bash
# 마이그레이션 초기화
npx prisma migrate reset

# 스키마 강제 푸시 (개발 환경에만)
npx prisma db push
```

## 9. 유용한 Prisma 명령어

```bash
# Prisma Client 재생성
npx prisma generate

# 데이터베이스 스키마 확인
npx prisma db pull

# 스키마 포맷팅
npx prisma format

# 마이그레이션 상태 확인
npx prisma migrate status
```

## 10. 프로덕션 배포 시 주의사항

1. **환경 변수 보호**: `.env` 파일을 절대 커밋하지 마세요
2. **Connection Pooling**: 프로덕션에서는 반드시 Pooling URL 사용
3. **백업**: 중요한 데이터는 정기적으로 백업
4. **모니터링**: Supabase 대시보드에서 사용량 모니터링

## 11. 다음 단계

Supabase 설정이 완료되면:
1. ✅ Prisma로 코드 리팩토링
2. ✅ 프론트엔드 개발 시작
3. ✅ 인증, 아이템, 거래 기능 구현

축하합니다! 🎉 이제 Supabase + Prisma로 개발을 시작할 수 있습니다!
