'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Stats {
  users: number;
  trades: number;
  transactions: number;
  reviews: number;
  pendingReports: number;
  bannedUsers: number;
}

interface Transaction {
  id: string;
  totalPrice: string;
  status: string;
  createdAt: string;
  trade: {
    title: string;
  };
  buyer: {
    username: string;
  };
  seller: {
    username: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response: any = await api.getAdminDashboardStats();
      if (response.success) {
        setStats(response.data.stats);
        setRecentTransactions(response.data.recentTransactions);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">총 사용자</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.users || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">총 거래글</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats?.trades || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">총 거래</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{stats?.transactions || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">총 리뷰</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats?.reviews || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">대기 중 신고</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats?.pendingReports || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">차단된 사용자</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats?.bannedUsers || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">최근 거래</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">아이템</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">구매자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.trade.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.buyer.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.seller.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Number(transaction.totalPrice).toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        transaction.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    최근 거래가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
