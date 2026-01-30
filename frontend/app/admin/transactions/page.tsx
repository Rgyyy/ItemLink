'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Transaction {
  id: string;
  totalPrice: string;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
  completedAt: string | null;
  item: {
    title: string;
    price: string;
  };
  buyer: {
    username: string;
    email: string;
  };
  seller: {
    username: string;
    email: string;
  };
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAdminTransactions({
        page,
        limit: 20,
        status: statusFilter
      });
      if (response.success) {
        setTransactions(response.data.transactions);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (transactionId: string, status: string) => {
    try {
      await api.updateAdminTransaction(transactionId, { status });
      alert('거래 상태가 업데이트되었습니다.');
      fetchTransactions();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      alert('거래 상태 업데이트에 실패했습니다.');
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '대기 중',
      PAYMENT_WAITING: '결제 대기',
      PAYMENT_COMPLETED: '결제 완료',
      IN_DELIVERY: '배송 중',
      DELIVERED: '배송 완료',
      COMPLETED: '완료',
      CANCELLED: '취소됨',
      REFUNDED: '환불됨'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAYMENT_WAITING: 'bg-orange-100 text-orange-800',
      PAYMENT_COMPLETED: 'bg-blue-100 text-blue-800',
      IN_DELIVERY: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">거래 관리</h1>

      <div className="bg-white rounded-lg shadow mb-6 p-6">
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
            <option value="PENDING">대기 중</option>
            <option value="PAYMENT_WAITING">결제 대기</option>
            <option value="PAYMENT_COMPLETED">결제 완료</option>
            <option value="IN_DELIVERY">배송 중</option>
            <option value="DELIVERED">배송 완료</option>
            <option value="COMPLETED">완료</option>
            <option value="CANCELLED">취소됨</option>
            <option value="REFUNDED">환불됨</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">아이템</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">구매자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">총액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">결제 방법</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">거래일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{transaction.item.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{transaction.buyer.username}</div>
                      <div className="text-xs text-gray-400">{transaction.buyer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{transaction.seller.username}</div>
                      <div className="text-xs text-gray-400">{transaction.seller.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {Number(transaction.totalPrice).toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.paymentMethod || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={transaction.status}
                        onChange={(e) => handleUpdateStatus(transaction.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(transaction.status)}`}
                      >
                        <option value="PENDING">대기 중</option>
                        <option value="PAYMENT_WAITING">결제 대기</option>
                        <option value="PAYMENT_COMPLETED">결제 완료</option>
                        <option value="IN_DELIVERY">배송 중</option>
                        <option value="DELIVERED">배송 완료</option>
                        <option value="COMPLETED">완료</option>
                        <option value="CANCELLED">취소됨</option>
                        <option value="REFUNDED">환불됨</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{new Date(transaction.createdAt).toLocaleDateString('ko-KR')}</div>
                      {transaction.completedAt && (
                        <div className="text-xs text-gray-400">
                          완료: {new Date(transaction.completedAt).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                거래가 없습니다.
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
