/**
 * 이미지 URL을 안전한 경로로 변환하는 유틸리티 함수
 *
 * 기존 데이터베이스의 /uploads/... 경로를
 * 보안 강화된 /api/trades/images/... 경로로 변환합니다.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * 이미지 URL을 보안 경로로 변환
 * @param imageUrl - 원본 이미지 URL
 * @returns 변환된 이미지 URL
 */
export function getSecureImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';

  // 이미 전체 URL인 경우 그대로 반환
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 기존 /uploads/trade-images/ 경로를 새로운 보안 경로로 변환
  if (imageUrl.startsWith('/uploads/trade-images/')) {
    const filename = imageUrl.replace('/uploads/trade-images/', '');
    return `${API_BASE_URL}/api/trades/images/${filename}`;
  }

  // 이미 새로운 보안 경로인 경우
  if (imageUrl.startsWith('/api/trades/images/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  // 파일명만 있는 경우
  if (!imageUrl.startsWith('/')) {
    return `${API_BASE_URL}/api/trades/images/${imageUrl}`;
  }

  // 기타 경로는 그대로 API URL 추가
  return `${API_BASE_URL}${imageUrl}`;
}

/**
 * 이미지 URL 배열을 보안 경로로 변환
 * @param imageUrls - 원본 이미지 URL 배열
 * @returns 변환된 이미지 URL 배열
 */
export function getSecureImageUrls(imageUrls: string[]): string[] {
  return imageUrls.map(getSecureImageUrl);
}
