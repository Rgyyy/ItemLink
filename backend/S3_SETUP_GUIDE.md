# S3 이미지 업로드 설정 가이드

이 가이드는 ItemLink 백엔드에서 AWS S3를 사용한 이미지 업로드를 설정하는 방법을 설명합니다.

## 📋 목차
1. [필요한 패키지 설치](#필요한-패키지-설치)
2. [환경 변수 설정](#환경-변수-설정)
3. [코드 적용](#코드-적용)
4. [로컬에서 S3로 마이그레이션](#로컬에서-s3로-마이그레이션)
5. [테스트](#테스트)

---

## 📦 필요한 패키지 설치

```bash
cd backend

# AWS S3 SDK 설치
npm install @aws-sdk/client-s3

# UUID 생성 라이브러리 (고유 파일명 생성용)
npm install uuid
npm install --save-dev @types/uuid
```

---

## 🔐 환경 변수 설정

### 1. `.env` 파일에 AWS 설정 추가

`backend/.env` 파일을 열고 다음 환경 변수를 추가합니다:

```env
# AWS S3 설정
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=itemlink-trade-images
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# (선택) CloudFront CDN 사용 시
AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

### 2. AWS 액세스 키 생성

1. AWS Console → IAM → 사용자 → "사용자 추가"
2. 사용자 이름: `itemlink-s3-uploader`
3. 권한 설정: 다음 정책 생성
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Effect": "Allow",
               "Action": [
                   "s3:PutObject",
                   "s3:GetObject",
                   "s3:DeleteObject",
                   "s3:ListBucket"
               ],
               "Resource": [
                   "arn:aws:s3:::itemlink-trade-images/*",
                   "arn:aws:s3:::itemlink-trade-images"
               ]
           }
       ]
   }
   ```
4. 액세스 키 생성 → CSV 다운로드

### 3. `.env.example` 업데이트

```env
# AWS S3 Configuration
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_CLOUDFRONT_DOMAIN=
```

---

## 🔧 코드 적용

### 옵션 1: 새 컨트롤러 사용 (권장)

`tradeRoutes.ts`를 수정하여 S3 지원 컨트롤러를 사용:

```typescript
// Before
import { uploadTradeImage, uploadTradeImages, serveTradeImage } from '../controllers/uploadController';

// After
import { uploadTradeImage, uploadTradeImages, serveTradeImage, deleteTradeImage } from '../controllers/uploadControllerS3';
```

### 옵션 2: 새 Multer 설정 사용

`tradeRoutes.ts`에서 upload 설정 변경:

```typescript
// Before
import { upload } from '../config/upload';

// After
import { upload } from '../config/uploadS3';
```

### 전체 변경사항

`backend/src/routes/tradeRoutes.ts`:
```typescript
import { Router } from 'express';
import {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade
} from '../controllers/tradeController';
import {
  uploadTradeImage,
  uploadTradeImages,
  serveTradeImage,
  deleteTradeImage
} from '../controllers/uploadControllerS3'; // ✅ 변경
import { authenticate } from '../middleware/auth';
import { upload } from '../config/uploadS3'; // ✅ 변경

const router = Router();

router.get('/', getTrades);
router.get('/:id', getTradeById);
router.post('/', authenticate, createTrade);
router.put('/:id', authenticate, updateTrade);
router.delete('/:id', authenticate, deleteTrade);

// 이미지 업로드 라우트
router.post('/upload/image', authenticate, upload.single('image'), uploadTradeImage);
router.post('/upload/images', authenticate, upload.array('images', 5), uploadTradeImages);

// 이미지 삭제 라우트 (새로 추가)
router.delete('/images', authenticate, deleteTradeImage);

// 이미지 제공 라우트 (S3 사용 시 deprecated)
router.get('/images/:filename', serveTradeImage);

export default router;
```

---

## 📤 로컬에서 S3로 마이그레이션

기존에 로컬에 저장된 이미지를 S3로 마이그레이션하는 스크립트:

### 1. 마이그레이션 스크립트 생성

`backend/scripts/migrateToS3.ts`:
```typescript
import { migrateLocalToS3 } from '../src/utils/s3Upload';
import prisma from '../src/config/prisma';
import fs from 'fs';
import path from 'path';

async function migrateImagesToS3() {
  console.log('🚀 Starting migration to S3...');

  const uploadsDir = path.join(process.cwd(), 'uploads', 'trade-images');

  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ No local uploads directory found');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  console.log(`📂 Found ${files.length} files to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const localPath = path.join(uploadsDir, file);
      const s3Url = await migrateLocalToS3(localPath, 'trade-images');

      // 데이터베이스에서 해당 파일 URL 업데이트
      const oldUrl = `/api/trades/images/${file}`;

      await prisma.trade.updateMany({
        where: {
          images: {
            has: oldUrl
          }
        },
        data: {
          images: {
            set: s3Url // 배열 업데이트는 Prisma 버전에 따라 다를 수 있음
          }
        }
      });

      console.log(`✅ Migrated: ${file} → ${s3Url}`);
      successCount++;

      // 성공 시 로컬 파일 삭제 (선택사항)
      // fs.unlinkSync(localPath);
    } catch (error) {
      console.error(`❌ Failed to migrate ${file}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✨ Migration completed: ${successCount} success, ${errorCount} errors`);
  await prisma.$disconnect();
}

migrateImagesToS3().catch(console.error);
```

### 2. 스크립트 실행

```bash
npx ts-node scripts/migrateToS3.ts
```

---

## 🧪 테스트

### 1. 환경 변수 확인

```bash
# Node.js 콘솔에서 확인
node -e "console.log(process.env.AWS_S3_BUCKET)"
```

### 2. 서버 시작

```bash
npm run dev
```

서버 로그에서 다음 메시지 확인:
```
📦 Upload configuration: S3 (Memory Storage)
```

### 3. API 테스트

#### 단일 이미지 업로드
```bash
curl -X POST http://localhost:5000/api/trades/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "imageUrl": "https://itemlink-trade-images.s3.ap-northeast-2.amazonaws.com/trade-images/uuid.jpg",
    "filename": "uuid.jpg",
    "size": 123456,
    "mimetype": "image/jpeg"
  }
}
```

#### 다중 이미지 업로드
```bash
curl -X POST http://localhost:5000/api/trades/upload/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

#### 이미지 삭제
```bash
curl -X DELETE http://localhost:5000/api/trades/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://itemlink-trade-images.s3.ap-northeast-2.amazonaws.com/trade-images/uuid.jpg"}'
```

---

## 🔄 로컬 저장소로 되돌리기

S3 사용을 중지하고 로컬 저장소로 되돌리려면:

1. `.env`에서 AWS 환경 변수 제거 또는 주석 처리
2. `tradeRoutes.ts`에서 import 변경:
   ```typescript
   // S3 컨트롤러 대신 기존 컨트롤러 사용
   import { uploadTradeImage, uploadTradeImages, serveTradeImage } from '../controllers/uploadController';
   import { upload } from '../config/upload';
   ```
3. 서버 재시작

---

## ⚙️ 프로덕션 설정

### 1. 환경 변수는 절대 Git에 커밋하지 마세요

`.gitignore`에 다음 추가:
```
.env
.env.local
.env.production
```

### 2. EC2에서 환경 변수 설정

```bash
# EC2 서버에서
cd ~/itemlink/backend
nano .env
```

환경 변수를 입력하고 서버 재시작:
```bash
pm2 restart itemlink-backend
```

### 3. CloudFront CDN 사용 (선택사항)

성능 향상을 위해 CloudFront를 S3 앞에 배치:

1. AWS Console → CloudFront → "Create Distribution"
2. Origin Domain: S3 버킷 선택
3. Origin Access: Public
4. Default Cache Behavior: Compress objects automatically
5. 배포 완료 후 도메인 복사

`.env`에 추가:
```env
AWS_CLOUDFRONT_DOMAIN=d123456789abcd.cloudfront.net
```

---

## 🐛 문제 해결

### S3 업로드 실패: "Access Denied"

**원인**: IAM 권한 부족

**해결**:
1. IAM 사용자 권한 확인
2. S3 버킷 정책 확인
3. 버킷이 퍼블릭 액세스를 차단하고 있는지 확인

### 이미지가 브라우저에 표시되지 않음

**원인**: CORS 설정 문제

**해결**:
S3 버킷 → 권한 → CORS 구성:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 로컬 저장소와 S3 혼용

**권장하지 않음**. 한 가지 방식만 사용하세요.

환경 변수가 설정되어 있으면 S3가 자동으로 활성화됩니다.

---

## 💡 팁

1. **개발 환경**: 로컬 저장소 사용 (빠르고 무료)
2. **프로덕션**: S3 사용 (확장 가능, 안정적)
3. **비용 절감**:
   - S3 수명 주기 정책으로 오래된 이미지 자동 삭제
   - CloudFront 캐싱으로 S3 요청 감소
4. **보안**:
   - 절대 AWS 키를 Git에 커밋하지 마세요
   - IAM 권한을 최소화하세요

---

**다음 단계**: [AWS_DEPLOYMENT_GUIDE.md](../AWS_DEPLOYMENT_GUIDE.md)로 전체 배포 진행
