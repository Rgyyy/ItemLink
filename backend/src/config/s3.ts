import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// AWS S3 클라이언트 설정
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// S3 버킷 이름
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET || '';

// S3 업로드가 활성화되어 있는지 확인
export const isS3Enabled = (): boolean => {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
};

// S3 URL 생성
export const getS3Url = (key: string): string => {
  // 직접 S3 URL 생성 (퍼블릭 버킷)
  return `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

// CloudFront URL이 있다면 사용 (옵션)
export const getCdnUrl = (key: string): string => {
  if (process.env.AWS_CLOUDFRONT_DOMAIN) {
    return `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${key}`;
  }
  return getS3Url(key);
};
