import { Response } from 'express';
import { AuthRequest } from '../types';

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

    // 업로드된 파일의 URL 생성
    const imageUrl = `/uploads/trade-images/${req.file.filename}`;

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

    // 업로드된 파일들의 URL 생성
    const imageUrls = req.files.map(file => `/uploads/trade-images/${file.filename}`);

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
