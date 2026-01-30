'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

interface Report {
  id: string;
  type: string;
  reason: string;
  evidence: string | null;
  status: string;
  createdAt: string;
  reportedUser: {
    username: string;
    tier: string;
  };
  transaction: {
    id: string;
    trade: {
      title: string;
    };
  } | null;
}

const REPORT_TYPES = [
  { value: 'SCAM', label: '사기' },
  { value: 'ITEM_NOT_SENT', label: '아이템 미전달' },
  { value: 'PAYMENT_NOT_SENT', label: '입금 미완료' },
  { value: 'ABUSE', label: '욕설/비방' },
  { value: 'OTHER', label: '기타' },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기중',
  REVIEWING: '검토중',
  RESOLVED: '처리완료',
  REJECTED: '반려됨',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWING: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reportedUserId: '',
    reportedUsername: '',
    transactionId: '',
    type: 'SCAM',
    reason: '',
    evidence: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    fetchReports();
  }, [isAuthenticated, router]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response: any = await api.getMyReports();
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reportedUserId || !formData.reason.trim()) {
      alert('피신고자와 신고 사유를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createReport({
        reportedUserId: formData.reportedUserId,
        transactionId: formData.transactionId || undefined,
        type: formData.type,
        reason: formData.reason.trim(),
        evidence: formData.evidence.trim() || undefined,
      });

      alert('신고가 접수되었습니다.');
      setShowNewReportForm(false);
      setFormData({
        reportedUserId: '',
        reportedUsername: '',
        transactionId: '',
        type: 'SCAM',
        reason: '',
        evidence: '',
      });
      fetchReports();
    } catch (error: any) {
      alert(error.message || '신고 접수에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">신고 관리</h1>
        <Button
          variant="primary"
          onClick={() => setShowNewReportForm(!showNewReportForm)}
        >
          {showNewReportForm ? '취소' : '신고하기'}
        </Button>
      </div>

      {/* New Report Form */}
      {showNewReportForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">신고 접수</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ 허위 신고는 제재 대상이 될 수 있습니다. 정확한 정보를 입력해주세요.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  피신고자 사용자 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reportedUserId}
                  onChange={(e) =>
                    setFormData({ ...formData, reportedUserId: e.target.value })
                  }
                  placeholder="피신고자의 사용자 ID를 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  거래 페이지 또는 프로필에서 확인할 수 있습니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  거래 ID (선택사항)
                </label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionId: e.target.value })
                  }
                  placeholder="관련 거래 ID가 있다면 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  신고 유형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  신고 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="신고 사유를 자세히 작성해주세요"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  증거 자료 (선택사항)
                </label>
                <textarea
                  value={formData.evidence}
                  onChange={(e) =>
                    setFormData({ ...formData, evidence: e.target.value })
                  }
                  placeholder="증거 자료나 참고 사항을 입력하세요 (스크린샷 링크, 채팅 내용 등)"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewReportForm(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? '접수 중...' : '신고 접수'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">내 신고 내역</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">신고 내역이 없습니다.</p>
              <Button
                variant="primary"
                onClick={() => setShowNewReportForm(true)}
              >
                첫 신고 접수하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {REPORT_TYPES.find((t) => t.value === report.type)?.label ||
                            report.type}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_COLORS[report.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        피신고자: {report.reportedUser.username}
                      </p>
                      {report.transaction && (
                        <p className="text-sm text-gray-600">
                          관련 거래: {report.transaction.trade.title}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded p-3 mb-2">
                    <p className="text-sm text-gray-700">{report.reason}</p>
                  </div>

                  {report.evidence && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">증거 자료:</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                        {report.evidence}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Info */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardBody>
          <h3 className="font-semibold text-blue-900 mb-2">💡 신고 안내</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 신고는 관리자가 검토 후 처리합니다</li>
            <li>• 처리 결과는 신고 내역에서 확인할 수 있습니다</li>
            <li>• 허위 신고 시 제재를 받을 수 있습니다</li>
            <li>• 긴급한 경우 고객센터로 문의해주세요</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
