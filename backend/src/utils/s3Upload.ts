import { PutObjectCommand, DeleteObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME, getCdnUrl, isS3Enabled } from '../config/s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * S3에 파일 업로드
 * @param file Multer 파일 객체
 * @param folder S3 내 폴더 경로 (예: 'trade-images')
 * @returns S3 URL
 */
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = 'trade-images'
): Promise<string> => {
  if (!isS3Enabled()) {
    throw new Error('S3 is not configured. Please set AWS environment variables.');
  }

  // 고유한 파일명 생성 (충돌 방지)
  const fileExtension = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExtension}`;
  const key = `${folder}/${fileName}`;

  // S3 업로드 파라미터
  const uploadParams: PutObjectCommandInput = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer || fs.createReadStream(file.path),
    ContentType: file.mimetype,
    // ACL을 'public-read'로 설정하여 공개 접근 허용
    // 주의: 최신 AWS 정책에서는 ACL 대신 버킷 정책 사용 권장
    // ACL: 'public-read', // 버킷 정책으로 대체됨
  };

  try {
    // S3에 업로드
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // 로컬 파일 삭제 (multer가 디스크 저장을 사용한 경우)
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // S3 URL 반환
    return getCdnUrl(key);
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * S3에서 파일 삭제
 * @param fileUrl S3 파일 URL 또는 key
 */
export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  if (!isS3Enabled()) {
    throw new Error('S3 is not configured.');
  }

  try {
    // URL에서 key 추출
    let key: string;

    if (fileUrl.startsWith('http')) {
      // URL인 경우 key 추출
      const urlObj = new URL(fileUrl);
      key = urlObj.pathname.substring(1); // 첫 번째 '/' 제거
    } else {
      // 이미 key인 경우
      key = fileUrl;
    }

    const deleteParams = {
      Bucket: S3_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

/**
 * 로컬 파일을 S3로 마이그레이션
 * @param localPath 로컬 파일 경로
 * @param folder S3 폴더
 */
export const migrateLocalToS3 = async (
  localPath: string,
  folder: string = 'trade-images'
): Promise<string> => {
  if (!isS3Enabled()) {
    throw new Error('S3 is not configured.');
  }

  if (!fs.existsSync(localPath)) {
    throw new Error('Local file does not exist');
  }

  // 파일 정보 읽기
  const fileName = path.basename(localPath);
  const fileExtension = path.extname(fileName);
  const mimeType = getMimeType(fileExtension);
  const key = `${folder}/${fileName}`;

  const uploadParams: PutObjectCommandInput = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentType: mimeType,
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // 업로드 성공 후 로컬 파일 삭제 (선택사항)
    // fs.unlinkSync(localPath);

    return getCdnUrl(key);
  } catch (error) {
    console.error('Migration to S3 error:', error);
    throw new Error('Failed to migrate file to S3');
  }
};

/**
 * MIME 타입 가져오기
 */
const getMimeType = (extension: string): string => {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};
