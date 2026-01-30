/**
 * 이미지 압축 유틸리티
 * Canvas API를 사용하여 화질 손실을 최소화하면서 이미지를 압축합니다.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 ~ 1.0
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85, // 화질 85% (좋은 품질 유지)
  maxSizeMB: 5,
};

/**
 * 이미지 파일을 압축합니다
 * @param file 원본 이미지 파일
 * @param options 압축 옵션
 * @returns 압축된 이미지 파일
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 이미지가 아니면 그대로 반환
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // GIF는 압축하지 않음 (애니메이션 손실 방지)
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // 원본 크기
        let width = img.width;
        let height = img.height;

        // 비율 유지하면서 리사이징
        if (width > opts.maxWidth! || height > opts.maxHeight!) {
          const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Canvas 생성
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 고품질 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // Blob으로 변환 (JPEG로 압축)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }

            // 압축된 파일이 원본보다 크면 원본 반환
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }

            // File 객체 생성
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.\w+$/, '.jpg'), // 확장자를 jpg로 변경
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          opts.quality
        );
      };

      img.onerror = () => {
        reject(new Error('Image load failed'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('File read failed'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
