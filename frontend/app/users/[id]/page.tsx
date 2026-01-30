'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface UserProfile {
  id: string;
  username: string;
  tier: string;
  createdAt: string;
}

interface Trade {
  id: string;
  title: string;
  description: string;
  gameCategory: string;
  tradeType: string;
  status: string;
  createdAt: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // 사용자 정보 조회 (프로필 API 사용 - 임시)
      // 실제로는 백엔드에 GET /api/users/:id 엔드포인트가 필요합니다
      const tradesResponse = await api.getTrades({ limit: 100 });

      // 해당 유저의 거래글만 필터링
      const allTrades = (tradesResponse as any).data?.trades || [];
      const userTrades = allTrades.filter((trade: any) => trade.seller?.id === userId);
      setTrades(userTrades);

      // 사용자 정보 (첫 번째 거래에서 추출)
      if (userTrades.length > 0) {
        setUser({
          id: userId,
          username: userTrades[0].seller.username,
          tier: userTrades[0].seller.tier,
          createdAt: userTrades[0].seller.createdAt || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInKorean = (tier: string) => {
    const tierMap: Record<string, string> = {
      'NEWBIE': '뉴비',
      'NORMAL': '일반',
      'TRUSTED': '신뢰',
      'VETERAN': '베테랑',
      'EXPERT': '전문가'
    };
    return tierMap[tier] || tier;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">사용자를 찾을 수 없습니다.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline" size="sm">← 목록으로</Button>
        </Link>
      </div>

      {/* User Info Card */}
      <Card className="mb-6">
        <CardBody>
          <div>
            <h1 className="text-3xl font-bold mb-2">{user.username}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                {getTierInKorean(user.tier)}
              </span>
              <span>가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Trades List */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">등록한 거래글 ({trades.length})</h2>
      </div>
      <div className="space-y-4">
        {trades.length > 0 ? (
            trades.map((trade) => (
              <Link key={trade.id} href={`/trades/${trade.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            trade.tradeType === 'SELL'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {trade.tradeType === 'SELL' ? '팝니다' : '삽니다'}
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {trade.gameCategory}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            trade.status === 'AVAILABLE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {trade.status === 'AVAILABLE' ? '거래가능' : '거래완료'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{trade.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{trade.description}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500 ml-4">
                        {new Date(trade.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록한 거래글이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
