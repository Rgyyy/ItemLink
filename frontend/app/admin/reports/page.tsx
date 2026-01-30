'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Report {
  id: string;
  type: string;
  reason: string;
  evidence: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
  reporter: {
    id: string;
    username: string;
    email: string;
  };
  reportedUser: {
    id: string;
    username: string;
    email: string;
    tier: string;
    isBanned: boolean;
  };
  processor: {
    id: string;
    username: string;
  } | null;
  transaction: {
    id: string;
    trade: {
      title: string;
    };
  } | null;
}

const REPORT_TYPES: Record<string, string> = {
  SCAM: '사기',
  ITEM_NOT_SENT: '아이템 미전달',
  PAYMENT_NOT_SENT: '입금 미완료',
  ABUSE: '욕설/비방',
  OTHER: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기중',
  REVIEWING: '검토중',
  RESOLVED: '처리완료',
  REJECTED: '반려됨',
};

const TIER_LABELS = {
  NEWBIE: '🆕 뉴비',
  NORMAL: '⭐ 일반',
  TRUSTED: '🏅 신뢰',
  VETERAN: '👑 베테랑',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, typeFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAdminReports({
        page,
        limit: 20,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      if (response.success) {
        setReports(response.data.reports);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReport = async (
    reportId: string,
    status: string,
    banUser: boolean = false
  ) => {
    const adminNote = prompt(
      '처리 내용을 입력하세요 (필수):'
    );

    if (!adminNote || !adminNote.trim()) {
      alert('처리 내용을 입력해야 합니다.');
      return;
    }

    let banDuration: number | undefined;
    if (banUser) {
      const durationStr = prompt(
        '제재 기간을 입력하세요 (일 단위, 영구 제재는 0 입력):'
      );
      if (durationStr === null) return;
      banDuration = parseInt(durationStr);
      if (isNaN(banDuration) || banDuration < 0) {
        alert('올바른 제재 기간을 입력하세요.');
        return;
      }
    }

    setProcessingId(reportId);
    try {
      await api.processReport(reportId, {
        status,
        adminNote: adminNote.trim(),
        banUser,
        banDuration,
      });
      alert('신고가 처리되었습니다.');
      fetchReports();
    } catch (error: any) {
      alert(error.message || '신고 처리에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">신고 관리</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="PENDING">대기중</option>
              <option value="REVIEWING">검토중</option>
              <option value="RESOLVED">처리완료</option>
              <option value="REJECTED">반려됨</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">신고 유형</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 유형</option>
              <option value="SCAM">사기</option>
              <option value="ITEM_NOT_SENT">아이템 미전달</option>
              <option value="PAYMENT_NOT_SENT">입금 미완료</option>
              <option value="ABUSE">욕설/비방</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    신고 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    신고자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    피신고자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    신고 사유
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    신고일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {REPORT_TYPES[report.type] || report.type}
                      </span>
                      {report.transaction && (
                        <p className="text-xs text-gray-500 mt-1">
                          거래: {report.transaction.trade.title.substring(0, 20)}...
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.reporter.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.reporter.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">
                            {report.reportedUser.username}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                            {TIER_LABELS[report.reportedUser.tier as keyof typeof TIER_LABELS]}
                          </span>
                          {report.reportedUser.isBanned && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                              제재중
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.reportedUser.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 line-clamp-2">
                          {report.reason}
                        </p>
                        {report.evidence && (
                          <p className="text-xs text-gray-500 mt-1">
                            증거: {report.evidence.substring(0, 50)}...
                          </p>
                        )}
                        {report.adminNote && (
                          <p className="text-xs text-blue-600 mt-1">
                            처리: {report.adminNote}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          report.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'REVIEWING'
                            ? 'bg-blue-100 text-blue-800'
                            : report.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {STATUS_LABELS[report.status]}
                      </span>
                      {report.processor && (
                        <p className="text-xs text-gray-500 mt-1">
                          처리자: {report.processor.username}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                      {report.processedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          처리: {new Date(report.processedAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {report.status === 'PENDING' || report.status === 'REVIEWING' ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() =>
                              handleProcessReport(report.id, 'RESOLVED', false)
                            }
                            disabled={processingId === report.id}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            해결
                          </button>
                          <button
                            onClick={() =>
                              handleProcessReport(report.id, 'RESOLVED', true)
                            }
                            disabled={processingId === report.id}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            제재 + 해결
                          </button>
                          <button
                            onClick={() =>
                              handleProcessReport(report.id, 'REJECTED', false)
                            }
                            disabled={processingId === report.id}
                            className="text-gray-600 hover:text-gray-800 text-xs"
                          >
                            반려
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">처리됨</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reports.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                신고가 없습니다.
              </div>
            )}

            {/* Pagination */}
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

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm text-yellow-800 font-medium mb-1">대기중</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {reports.filter((r) => r.status === 'PENDING').length}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm text-blue-800 font-medium mb-1">검토중</h3>
          <p className="text-2xl font-bold text-blue-900">
            {reports.filter((r) => r.status === 'REVIEWING').length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm text-green-800 font-medium mb-1">처리완료</h3>
          <p className="text-2xl font-bold text-green-900">
            {reports.filter((r) => r.status === 'RESOLVED').length}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm text-red-800 font-medium mb-1">반려됨</h3>
          <p className="text-2xl font-bold text-red-900">
            {reports.filter((r) => r.status === 'REJECTED').length}
          </p>
        </div>
      </div>
    </div>
  );
}
