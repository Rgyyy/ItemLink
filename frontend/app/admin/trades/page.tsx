'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Trade {
  id: string;
  title: string;
  description: string;
  status: string;
  views: number;
  createdAt: string;
  gameCategory: string;
  seller: {
    username: string;
    email: string;
    tier: string;
  };
}

const TIER_LABELS = {
  NEWBIE: '🆕 뉴비',
  NORMAL: '⭐ 일반',
  TRUSTED: '🏅 신뢰',
  VETERAN: '👑 베테랑',
};

export default function AdminTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTrades();
  }, [page, statusFilter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAdminTrades({
        page,
        limit: 20,
        search,
        status: statusFilter
      });
      if (response.success) {
        setTrades(response.data.trades);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTrades();
  };

  const handleUpdateTrade = async (tradeId: string, status: string) => {
    try {
      await api.updateAdminTrade(tradeId, { status });
      alert('거래글이 업데이트되었습니다.');
      fetchTrades();
    } catch (error) {
      console.error('Failed to update trade:', error);
      alert('거래글 업데이트에 실패했습니다.');
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('정말로 이 거래글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteAdminTrade(tradeId);
      alert('거래글이 삭제되었습니다.');
      fetchTrades();
    } catch (error) {
      console.error('Failed to delete trade:', error);
      alert('거래글 삭제에 실패했습니다.');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">거래글 관리</h1>

      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목 또는 설명 검색"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            검색
          </button>
        </form>

        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 상태</option>
            <option value="AVAILABLE">판매 중</option>
            <option value="RESERVED">예약됨</option>
            <option value="SOLD">판매 완료</option>
            <option value="HIDDEN">숨김</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">게임</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">조회수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{trade.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trade.gameCategory}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-900">{trade.seller.username}</span>
                        <span className="text-xs text-gray-500">
                          {TIER_LABELS[trade.seller.tier as keyof typeof TIER_LABELS]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trade.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={trade.status}
                        onChange={(e) => handleUpdateTrade(trade.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="AVAILABLE">판매 중</option>
                        <option value="RESERVED">예약됨</option>
                        <option value="SOLD">판매 완료</option>
                        <option value="HIDDEN">숨김</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(trade.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {trades.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                거래글이 없습니다.
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-6 border-t">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-4 py-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
