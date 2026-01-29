import { Response, Request } from 'express';
import { AuthRequest } from '../types';
import path from 'path';
import fs from 'fs';

// 단일 이미지 업로드
export const uploadTradeImage = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    // 업로드된 파일의 URL 생성 (보안 강화된 경로)
    const imageUrl = `/api/trades/images/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 다중 이미지 업로드
export const uploadTradeImages = async (req: AuthRequest & { files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } }, res: Response): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
      return;
    }

    // 업로드된 파일들의 URL 생성 (보안 강화된 경로)
    const imageUrls = req.files.map(file => `/api/trades/images/${file.filename}`);

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        imageUrls,
        count: req.files.length,
        files: req.files.map(file => ({
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        }))
      }
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 안전한 파일 제공 (접근 제어)
export const serveTradeImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    // 파일명 검증 (디렉토리 탐색 공격 방지)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
      return;
    }

    // 허용된 확장자 검증
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
      return;
    }

    // 파일 경로 생성
    const filePath = path.join(process.cwd(), 'uploads', 'trade-images', filename);

    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // 파일이 실제로 uploads/trade-images 디렉토리 내에 있는지 확인 (경로 탐색 공격 방지)
    const realPath = fs.realpathSync(filePath);
    const uploadsDir = fs.realpathSync(path.join(process.cwd(), 'uploads', 'trade-images'));
    if (!realPath.startsWith(uploadsDir)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
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
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
