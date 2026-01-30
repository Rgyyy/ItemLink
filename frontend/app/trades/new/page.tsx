'use client';

import React, { useEffect, useState, FormEvent, ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getSecureImageUrl } from '@/lib/imageUtils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { GAME_CATEGORIES } from '@/constants/games';
import { compressImage, formatFileSize } from '@/utils/imageCompression';

function NewTradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [boardType, setBoardType] = useState<string>('TRADE');
  const [loading, setLoading] = useState(false);
  const [showCustomGame, setShowCustomGame] = useState(false);
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

    // 쿼리 파라미터에서 boardType과 gameCategory 가져오기
    const boardTypeFromUrl = searchParams.get('boardType') || 'TRADE';
    setBoardType(boardTypeFromUrl);

    const gameCategoryFromUrl = searchParams.get('gameCategory');
    if (gameCategoryFromUrl) {
      setFormData((prev) => ({ ...prev, gameCategory: gameCategoryFromUrl }));
    }
  }, [isAuthenticated, router, searchParams]);

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

  // description이 변경되면 에디터 업데이트 (초기 로드 시)
  React.useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      updateEditorContent(formData.description);
    }
  }, []);

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

    // TRADE 타입인 경우에만 게임 선택 검증
    const finalGameCategory = showCustomGame ? formData.customGame.trim() : formData.gameCategory;

    if (boardType === 'TRADE' && !finalGameCategory) {
      alert('게임을 선택하거나 입력해주세요.');
      return;
    }

    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!formData.description.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const tradeData: any = {
        boardType: boardType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        images: [], // 이미지는 본문에 마크다운으로 포함됨
      };

      // TRADE 타입인 경우에만 게임 카테고리와 거래 구분 추가
      if (boardType === 'TRADE') {
        tradeData.gameCategory = finalGameCategory;
        tradeData.tradeType = formData.tradeType;
      }

      console.log('Submitting trade data:', tradeData);

      const response: any = await api.createTrade(tradeData);
      console.log('Create trade response:', response);

      if (response?.data?.trade?.id) {
        alert('거래글이 등록되었습니다!');
        router.push(`/trades/${response.data.trade.id}`);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Failed to create trade:', error);
      alert(error.message || '거래글 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/trades">
          <Button variant="outline" size="sm">← 목록으로</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">
            {boardType === 'TRADE' && '거래글 등록'}
            {boardType === 'FREE' && '자유게시판 글쓰기'}
            {boardType === 'SUGGESTION' && '건의글 작성'}
            {boardType === 'REPORT' && '신고글 작성'}
          </h1>
          <p className="text-gray-600 mt-2">
            {boardType === 'TRADE' && '거래 정보를 입력해주세요'}
            {boardType === 'FREE' && '자유롭게 의견을 나눠보세요'}
            {boardType === 'SUGGESTION' && '개선 제안 및 건의사항을 작성해주세요'}
            {boardType === 'REPORT' && '신고할 내용을 작성해주세요'}
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 팝니다/삽니다 구분 - TRADE만 */}
            {boardType === 'TRADE' && (
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
            )}

            {/* Game Selection - TRADE만 */}
            {boardType === 'TRADE' && (
              <>
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
              </>
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
                  {boardType === 'TRADE' ? '상세 설명' : '본문'} <span className="text-red-500">*</span>
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
                data-placeholder={
                  boardType === 'TRADE'
                    ? '가격, 수량, 서버, 거래 방법 등 상세한 내용을 자유롭게 작성해주세요.\n\n이미지는 "이미지 삽입" 버튼을 눌러 원하는 위치에 추가할 수 있습니다.'
                    : '내용을 입력해주세요.\n\n이미지는 "이미지 삽입" 버튼을 눌러 원하는 위치에 추가할 수 있습니다.'
                }
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

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Link href="/trades" className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  취소
                </Button>
              </Link>
              <Button
                variant="primary"
                className="flex-1"
                type="submit"
                disabled={loading || uploadingImage}
              >
                {uploadingImage ? '이미지 업로드 중...' : loading ? '등록 중...' : '거래글 등록'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Tips */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardBody>
          <h3 className="font-semibold text-blue-900 mb-2">💡 등록 팁</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>팝니다</strong>: 판매하려는 물품을 등록할 때 선택</li>
            <li>• <strong>삽니다</strong>: 구매하고 싶은 물품을 찾을 때 선택</li>
            <li>• 상세 설명에 가격, 수량, 서버, 거래 방법을 모두 작성해주세요</li>
            <li>• 정확한 정보를 제공하면 거래 성사율이 높아집니다</li>
            <li>• 거래 전 상대방의 평점과 등급을 꼭 확인하세요</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

export default function NewTradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    }>
      <NewTradePageContent />
    </Suspense>
  );
}
