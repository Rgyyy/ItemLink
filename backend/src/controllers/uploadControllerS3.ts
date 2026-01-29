import { Response, Request } from 'express';
import { AuthRequest } from '../types';
import path from 'path';
import fs from 'fs';
import { uploadToS3, deleteFromS3, isS3Enabled } from '../utils/s3Upload';

/**
 * 단일 이미지 업로드 (S3 또는 로컬)
 */
export const uploadTradeImage = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    let imageUrl: string;

    // S3 업로드 활성화 여부 확인
    if (isS3Enabled()) {
      // S3에 업로드
      imageUrl = await uploadToS3(req.file, 'trade-images');
      console.log('File uploaded to S3:', imageUrl);
    } else {
      // 로컬에 저장 (기존 방식)
      imageUrl = `/api/trades/images/${req.file.filename}`;
      console.log('File uploaded locally:', imageUrl);
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 다중 이미지 업로드 (S3 또는 로컬)
 */
export const uploadTradeImages = async (
  req: AuthRequest & { files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } },
  res: Response
): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
      return;
    }

    let imageUrls: string[];

    // S3 업로드 활성화 여부 확인
    if (isS3Enabled()) {
      // S3에 업로드
      const uploadPromises = req.files.map((file) => uploadToS3(file, 'trade-images'));
      imageUrls = await Promise.all(uploadPromises);
      console.log('Files uploaded to S3:', imageUrls.length);
    } else {
      // 로컬에 저장 (기존 방식)
      imageUrls = req.files.map((file) => `/api/trades/images/${file.filename}`);
      console.log('Files uploaded locally:', imageUrls.length);
    }

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        imageUrls,
        count: req.files.length,
        files: req.files.map((file, index) => ({
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          url: imageUrls[index],
        })),
      },
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 안전한 파일 제공 (로컬 파일만)
 * S3를 사용하는 경우 이 엔드포인트는 사용하지 않음
 */
export const serveTradeImage = async (req: Request, res: Response): Promise<void> => {
  try {
    // S3 사용 시 리다이렉트
    if (isS3Enabled()) {
      res.status(410).json({
        success: false,
        message: 'This endpoint is deprecated. Images are now served from S3.',
      });
      return;
    }

    const { filename } = req.params;

    // 파일명 검증 (디렉토리 탐색 공격 방지)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename',
      });
      return;
    }

    // 허용된 확장자 검증
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file type',
      });
      return;
    }

    // 파일 경로 생성
    const filePath = path.join(process.cwd(), 'uploads', 'trade-images', filename);

    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }

    // 파일이 실제로 uploads/trade-images 디렉토리 내에 있는지 확인
    const realPath = fs.realpathSync(filePath);
    const uploadsDir = fs.realpathSync(path.join(process.cwd(), 'uploads', 'trade-images'));
    if (!realPath.startsWith(uploadsDir)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // 보안 헤더 설정
    res.setHeader('Content-Type', `image/${ext.substring(1)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년 캐싱

    // 파일 전송
    res.sendFile(realPath);
  } catch (error) {
    console.error('Serve image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * S3 이미지 삭제
 */
export const deleteTradeImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        message: 'Image URL is required',
      });
      return;
    }

    // S3에서 삭제
    if (isS3Enabled() && imageUrl.includes('s3.amazonaws.com')) {
      await deleteFromS3(imageUrl);
      res.status(200).json({
        success: true,
        message: 'Image deleted from S3 successfully',
      });
    } else {
      // 로컬 파일 삭제
      const filename = path.basename(imageUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'trade-images', filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.status(200).json({
          success: true,
          message: 'Image deleted locally successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Image not found',
        });
      }
    }
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
