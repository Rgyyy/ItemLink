'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getSecureImageUrl } from '@/lib/imageUtils';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import CommentSection from '@/components/comment/CommentSection';

interface Trade {
  id: string;
  title: string;
  description: string;
  server: string | null;
  itemType: string;
  tradeType: string | null;
  status: string;
  views: number;
  images: string[];
  createdAt: string;
  gameCategory: string;
  seller: {
    id: string;
    username: string;
    avatarUrl: string | null;
    tier: string;
  };
}

const TIER_BADGES = {
  NEWBIE: { label: '🆕 뉴비', color: 'bg-gray-100 text-gray-700' },
  NORMAL: { label: '⭐ 일반', color: 'bg-green-100 text-green-700' },
  TRUSTED: { label: '🏅 신뢰', color: 'bg-blue-100 text-blue-700' },
  VETERAN: { label: '👑 베테랑', color: 'bg-purple-100 text-purple-700' },
};

export default function TradeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const tradeId = params.id as string;

    // Only fetch if we haven't fetched this specific trade yet
    if (tradeId && hasFetchedRef.current !== tradeId) {
      hasFetchedRef.current = tradeId;
      fetchTrade(tradeId);
    }
  }, [params.id]);

  const fetchTrade = async (id: string) => {
    try {
      const response: any = await api.getTradeById(id);
      setTrade(response.data.trade);
    } catch (error) {
      console.error('Failed to fetch trade:', error);
      alert('거래글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/trades/${trade?.id}/edit`);
  };

  const handleCloseTrade = async () => {
    if (!trade) return;

    if (!confirm('거래를 종료하시겠습니까?\n거래 종료 후에는 다시 판매중으로 변경할 수 있습니다.')) {
      return;
    }

    try {
      await api.updateTrade(trade.id, { status: 'CLOSED' });
      alert('거래가 종료되었습니다.');
      fetchTrade(trade.id);
    } catch (error: any) {
      console.error('Close trade failed:', error);
      alert(error.message || '거래 종료에 실패했습니다.');
    }
  };

  const handleReopenTrade = async () => {
    if (!trade) return;

    if (!confirm('거래를 다시 시작하시겠습니까?')) {
      return;
    }

    try {
      await api.updateTrade(trade.id, { status: 'AVAILABLE' });
      alert('거래가 다시 시작되었습니다.');
      fetchTrade(trade.id);
    } catch (error: any) {
      console.error('Reopen trade failed:', error);
      alert(error.message || '거래 재개에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!trade) return;

    if (trade.status !== 'AVAILABLE') {
      alert('판매중이 아닌 거래글은 삭제할 수 없습니다.');
      return;
    }

    if (!confirm('정말로 이 거래글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteTrade(trade.id);
      alert('거래글이 삭제되었습니다.');
      router.push('/trades');
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(error.message || '삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">거래글을 찾을 수 없습니다.</p>
          <Link href="/trades">
            <Button variant="outline">목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnTrade = user?.id === trade.seller.id;
  const isAvailable = trade.status === 'AVAILABLE';
  const isClosed = trade.status === 'CLOSED';
  const tierBadge = TIER_BADGES[trade.seller.tier as keyof typeof TIER_BADGES] || TIER_BADGES.NEWBIE;

  // 마크다운 이미지를 렌더링하는 함수
  const renderDescription = (text: string) => {
    // 마크다운 이미지 패턴: ![alt text](image url)
    const parts = text.split(/!\[([^\]]*)\]\(([^)]+)\)/g);

    return parts.map((part, index) => {
      // 패턴에 매칭되면 3개씩 그룹으로 나뉨: [텍스트, alt, url, 텍스트, alt, url, ...]
      // index % 3 === 0: 일반 텍스트
      // index % 3 === 1: alt text
      // index % 3 === 2: image url
      if (index % 3 === 2) {
        const altText = parts[index - 1] || '이미지';
        const imageUrl = part;
        const fullUrl = getSecureImageUrl(imageUrl);

        return (
          <img
            key={index}
            src={fullUrl}
            alt={altText}
            className="max-w-full h-auto rounded-lg my-4 border border-gray-200"
            style={{ maxHeight: '500px', objectFit: 'contain' }}
          />
        );
      } else if (index % 3 === 1) {
        // alt text는 이미 img 태그에서 사용했으므로 null 반환
        return null;
      } else {
        // 일반 텍스트는 줄바꿈 유지
        return part.split('\n').map((line, i) => (
          <span key={`${index}-${i}`}>
            {line}
            {i < part.split('\n').length - 1 && <br />}
          </span>
        ));
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/trades">
          <Button variant="outline" size="sm">← 목록으로</Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-sm text-blue-600 font-medium">
                  {trade.gameCategory}
                </span>
                <h1 className="text-3xl font-bold mt-2">{trade.title}</h1>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isAvailable
                    ? 'bg-green-100 text-green-800'
                    : isClosed
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isAvailable ? '판매중' : isClosed ? '거래종료' : '판매완료'}
              </span>
            </div>

            {/* 글쓴이 정보 */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                {trade.seller.avatarUrl ? (
                  <img
                    src={trade.seller.avatarUrl}
                    alt={trade.seller.username}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <span className="text-xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{trade.seller.username}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tierBadge.color}`}>
                    {tierBadge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(trade.createdAt).toLocaleDateString('ko-KR')} · 조회 {trade.views}회
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {/* 이미지 갤러리 */}
            {trade.images && trade.images.length > 0 && (
              <div className="mb-6">
                <div className={`grid gap-3 ${
                  trade.images.length === 1 ? 'grid-cols-1' :
                  trade.images.length === 2 ? 'grid-cols-2' :
                  'grid-cols-3'
                }`}>
                  {trade.images.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${imageUrl}`}
                        alt={`${trade.title} - 이미지 ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          // 이미지 확대 보기 (간단한 방법)
                          window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${imageUrl}`, '_blank');
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">상품 설명</h2>
              <div className="text-gray-700">
                {renderDescription(trade.description)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-600">거래 유형</span>
                <p className="font-medium">
                  {trade.tradeType === 'SELL' ? '팝니다' : trade.tradeType === 'BUY' ? '삽니다' : '직거래'}
                </p>
              </div>
              {trade.server && (
                <div>
                  <span className="text-sm text-gray-600">서버</span>
                  <p className="font-medium">{trade.server}</p>
                </div>
              )}
            </div>

            {/* 작성자 액션 버튼 */}
            {isOwnTrade && (
              <div className="flex gap-2 pt-4 border-t">
                {isAvailable ? (
                  <Button
                    variant="outline"
                    onClick={handleCloseTrade}
                  >
                    거래 종료
                  </Button>
                ) : isClosed ? (
                  <Button
                    variant="outline"
                    onClick={handleReopenTrade}
                  >
                    거래 재개
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={handleEdit}
                >
                  수정하기
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                >
                  삭제하기
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 댓글 섹션 */}
        <div className="mt-8">
          <CommentSection tradeId={trade.id} />
        </div>
      </div>
    </div>
  );
}
