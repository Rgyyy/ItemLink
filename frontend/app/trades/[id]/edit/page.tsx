'use client';

import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getSecureImageUrl } from '@/lib/imageUtils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { GAME_CATEGORIES } from '@/constants/games';
import { compressImage, formatFileSize } from '@/utils/imageCompression';

export default function EditTradePage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomGame, setShowCustomGame] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]); // 기존 이미지 URL
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]); // 새로 추가할 이미지 파일
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]); // 새 이미지 미리보기
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [totalImageSize, setTotalImageSize] = useState<number>(0); // 총 이미지 용량 (bytes)
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    gameCategory: '',
    customGame: '',
    title: '',
    description: '',
    tradeType: 'SELL', // SELL or BUY
  });

  useEffect(() => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (params.id) {
      fetchTrade(params.id as string);
    }
  }, [isAuthenticated, router, params.id]);

  const fetchTrade = async (id: string) => {
    try {
      const response: any = await api.getTradeById(id);
      const trade = response.data.trade;

      // Check if user is the seller
      if (trade.seller.id !== user?.id) {
        alert('본인이 등록한 거래글만 수정할 수 있습니다.');
        router.push(`/trades/${id}`);
        return;
      }

      // 게임 카테고리가 하드코딩된 목록에 있는지 확인
      const isCustomGame = !(GAME_CATEGORIES as readonly string[]).includes(trade.gameCategory);

      setFormData({
        gameCategory: isCustomGame ? '' : trade.gameCategory,
        customGame: isCustomGame ? trade.gameCategory : '',
        title: trade.title,
        description: trade.description,
        tradeType: trade.tradeType || 'SELL',
      });

      // 기존 이미지 설정
      if (trade.images && Array.isArray(trade.images)) {
        setExistingImages(trade.images);
      }

      setShowCustomGame(isCustomGame);
    } catch (error: any) {
      console.error('Failed to fetch trade:', error);
      alert(error.message || '거래글을 불러오는데 실패했습니다.');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // 게임 선택 시 "직접 입력" 처리
    if (name === 'gameCategory') {
      if (value === 'CUSTOM') {
        setShowCustomGame(true);
        setFormData((prev) => ({ ...prev, gameCategory: '', customGame: '' }));
      } else {
        setShowCustomGame(false);
        setFormData((prev) => ({ ...prev, gameCategory: value, customGame: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 기존 이미지 삭제
  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // 새 이미지 선택
  const handleNewImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const totalImages = existingImages.length + newImageFiles.length + fileArray.length;

    // 최대 5개까지만 허용
    if (totalImages > 5) {
      alert('이미지는 최대 5개까지 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 체크 (각 5MB 이하)
    const invalidFiles = fileArray.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert('각 이미지는 5MB 이하여야 합니다.');
      return;
    }

    setNewImageFiles(prev => [...prev, ...fileArray]);

    // 미리보기 생성
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 새 이미지 삭제
  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // contentEditable div의 내용을 description으로 동기화
  const handleEditorInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      // img 태그를 마크다운으로 변환
      const markdownContent = htmlContent.replace(
        /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g,
        '![$2]($1)'
      ).replace(/<div>/g, '\n').replace(/<\/div>/g, '').replace(/<br>/g, '\n').replace(/&nbsp;/g, ' ');

      // HTML 태그 제거
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = markdownContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      setFormData(prev => ({ ...prev, description: textContent }));
    }
  };

  // description이 변경되면 에디터 업데이트
  React.useEffect(() => {
    if (editorRef.current && formData.description) {
      updateEditorContent(formData.description);
    }
  }, [loading]); // loading이 끝난 후 에디터 업데이트

  // 마크다운을 HTML로 변환하여 에디터에 표시
  const updateEditorContent = (text: string) => {
    if (!editorRef.current) return;

    // 마크다운 이미지를 img 태그로 변환
    let html = text.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, alt, url) => {
        const fullUrl = getSecureImageUrl(url);
        return `<img src="${fullUrl}" alt="${alt}" class="max-w-full h-auto rounded-lg my-2 border border-gray-200" style="max-height: 400px; object-fit: contain;" />`;
      }
    );

    // 줄바꿈을 <br>로 변환
    html = html.replace(/\n/g, '<br>');

    editorRef.current.innerHTML = html;
  };

  // 이미지 업로드 및 삽입 핸들러
  const handleImageInsert = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let file = files[0];
    const originalSize = file.size;

    // 파일 크기 체크 (5MB 이하)
    if (file.size > 5 * 1024 * 1024) {
      alert('개별 이미지는 5MB 이하여야 합니다.');
      return;
    }

    setUploadingImage(true);

    try {
      // 이미지 압축 (화질 손실 최소화)
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      // 압축 결과 로깅
      const compressionRatio = ((1 - compressedFile.size / originalSize) * 100).toFixed(1);
      console.log(`이미지 압축: ${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)} (${compressionRatio}% 감소)`);

      file = compressedFile;

      // 총 이미지 용량 체크 (20MB 이하) - 압축된 크기로
      const maxTotalSize = 20 * 1024 * 1024; // 20MB
      if (totalImageSize + file.size > maxTotalSize) {
        const remainingMB = ((maxTotalSize - totalImageSize) / (1024 * 1024)).toFixed(1);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        alert(`전체 이미지 용량은 20MB를 초과할 수 없습니다.\n현재 남은 용량: ${remainingMB}MB\n업로드하려는 이미지: ${fileSizeMB}MB`);
        setUploadingImage(false);
        e.target.value = '';
        return;
      }

      // 이미지 업로드
      const uploadResult = await api.uploadTradeImage(file);
      const imageUrl = uploadResult.data.imageUrl;
      const fullUrl = getSecureImageUrl(imageUrl);

      // contentEditable div에 이미지 삽입
      if (editorRef.current) {
        editorRef.current.focus();

        // 현재 커서 위치에 img 태그 삽입
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          const img = document.createElement('img');
          img.src = fullUrl;
          img.alt = '이미지';
          img.className = 'max-w-full h-auto rounded-lg my-2 border border-gray-200';
          img.style.maxHeight = '400px';
          img.style.objectFit = 'contain';

          range.insertNode(img);

          // 이미지 뒤에 커서 이동
          range.setStartAfter(img);
          range.setEndAfter(img);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // description 업데이트
        handleEditorInput();
      }

      // 총 이미지 용량 업데이트
      setTotalImageSize(prev => prev + file.size);

      // 성공 시 알림 제거 (자동으로 삽입됨)
    } catch (error: any) {
      console.error('Image upload failed:', error);
      alert(error.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
      // input 초기화
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 게임 선택 검증
    const finalGameCategory = showCustomGame ? formData.customGame.trim() : formData.gameCategory;

    if (!finalGameCategory) {
      alert('게임을 선택하거나 입력해주세요.');
      return;
    }

    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!formData.description.trim()) {
      alert('설명을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 새 이미지 업로드 (있는 경우)
      let newImageUrls: string[] = [];
      if (newImageFiles.length > 0) {
        setUploadingImages(true);
        try {
          const uploadResult = await api.uploadTradeImages(newImageFiles);
          newImageUrls = uploadResult.data.imageUrls;
        } catch (error: any) {
          console.error('Image upload failed:', error);
          alert('이미지 업로드에 실패했습니다. 이미지 없이 수정하시겠습니까?');
          const proceed = confirm('계속 진행하시겠습니까?');
          if (!proceed) {
            setSubmitting(false);
            setUploadingImages(false);
            return;
          }
        } finally {
          setUploadingImages(false);
        }
      }

      // 기존 이미지 + 새 이미지 URL 합치기
      const allImages = [...existingImages, ...newImageUrls];

      const tradeData = {
        gameCategory: finalGameCategory,
        title: formData.title.trim(),
        description: formData.description.trim(),
        tradeType: formData.tradeType,
        images: allImages,
      };

      await api.updateTrade(params.id as string, tradeData);
      alert('거래글이 수정되었습니다!');
      router.push(`/trades/${params.id}`);
    } catch (error: any) {
      console.error('Failed to update trade:', error);
      alert(error.message || '거래글 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href={`/trades/${params.id}`}>
          <Button variant="outline" size="sm">← 뒤로가기</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">거래글 수정</h1>
          <p className="text-gray-600 mt-2">
            거래글 정보를 수정할 수 있습니다
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 팝니다/삽니다 구분 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                거래 구분 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex-1">
                  <input
                    type="radio"
                    name="tradeType"
                    value="SELL"
                    checked={formData.tradeType === 'SELL'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-blue-600 font-semibold">팝니다</span>
                </label>
                <label className="flex-1">
                  <input
                    type="radio"
                    name="tradeType"
                    value="BUY"
                    checked={formData.tradeType === 'BUY'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-green-600 font-semibold">삽니다</span>
                </label>
              </div>
            </div>

            {/* Game Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                게임 <span className="text-red-500">*</span>
              </label>
              <select
                name="gameCategory"
                value={showCustomGame ? 'CUSTOM' : formData.gameCategory}
                onChange={handleChange}
                required={!showCustomGame}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">게임을 선택하세요</option>
                {GAME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="CUSTOM">직접 입력</option>
              </select>
            </div>

            {/* Custom Game Input */}
            {showCustomGame && (
              <Input
                label="게임 이름 직접 입력"
                type="text"
                name="customGame"
                value={formData.customGame}
                onChange={handleChange}
                required
                placeholder="게임 이름을 입력하세요"
              />
            )}

            {/* Title */}
            <Input
              label="제목"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="예: 던파 골드 1억 팝니다 / 로아 골드 100만 삽니다"
            />

            {/* Description with Image Insert */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  상세 설명 <span className="text-red-500">*</span>
                </label>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    className="flex items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploadingImage ? '업로드 중...' : '이미지 삽입'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageInsert}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </div>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="w-full min-h-[300px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm overflow-y-auto"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
                data-placeholder="가격, 수량, 서버, 거래 방법 등 상세한 내용을 자유롭게 작성해주세요.&#10;&#10;이미지는 &quot;이미지 삽입&quot; 버튼을 눌러 원하는 위치에 추가할 수 있습니다."
              />
              <style jsx>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                  pointer-events: none;
                  white-space: pre-wrap;
                }
              `}</style>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  💡 이미지 삽입: 커서를 원하는 위치에 놓고 &quot;이미지 삽입&quot; 버튼을 클릭하세요
                </p>
                <p className="text-xs text-gray-500">
                  이미지 용량: <span className={totalImageSize > 15 * 1024 * 1024 ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                    {(totalImageSize / (1024 * 1024)).toFixed(1)}MB
                  </span> / 20MB
                </p>
              </div>
            </div>

            {/* Image Management */}
            <div>
              <label className="block text-sm font-medium mb-2">
                이미지 (선택)
              </label>
              <div className="space-y-4">
                {/* 기존 이미지 */}
                {existingImages.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">기존 이미지</p>
                    <div className="grid grid-cols-3 gap-3">
                      {existingImages.map((imageUrl, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          <img
                            src={getSecureImageUrl(imageUrl)}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 새 이미지 미리보기 */}
                {newImagePreviews.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">새 이미지</p>
                    <div className="grid grid-cols-3 gap-3">
                      {newImagePreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative group">
                          <img
                            src={preview}
                            alt={`New ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 이미지 추가 버튼 */}
                {(existingImages.length + newImageFiles.length) < 5 && (
                  <div>
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          클릭하여 이미지 추가 (최대 5개, 각 5MB 이하)
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          PNG, JPG, GIF, WebP
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        multiple
                        onChange={handleNewImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  {existingImages.length + newImageFiles.length}/5 이미지
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Link href={`/trades/${params.id}`} className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  취소
                </Button>
              </Link>
              <Button
                variant="primary"
                className="flex-1"
                type="submit"
                disabled={submitting || uploadingImages || uploadingImage}
              >
                {uploadingImage ? '이미지 삽입 중...' : uploadingImages ? '이미지 업로드 중...' : submitting ? '수정 중...' : '수정 완료'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
