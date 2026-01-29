import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';

// S3 사용 여부 확인
const useS3 = !!(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
);

// S3 사용 시 메모리 스토리지, 로컬 사용 시 디스크 스토리지
const storage = useS3
  ? multer.memoryStorage() // S3 업로드를 위해 메모리에 저장
  : multer.diskStorage({
      destination: (req: Request, file: Express.Multer.File, cb) => {
        const uploadDir = 'uploads/trade-images';
        // 디렉토리가 없으면 생성
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req: Request, file: Express.Multer.File, cb) => {
        // 파일명: timestamp-랜덤문자열.확장자
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    });

// 파일 필터: 이미지만 허용
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer 설정
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: fileFilter,
});

// S3 사용 여부를 export (다른 모듈에서 사용 가능)
export const isUsingS3 = useS3;

console.log(`📦 Upload configuration: ${useS3 ? 'S3 (Memory Storage)' : 'Local (Disk Storage)'}`);
