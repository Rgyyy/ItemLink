'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    username: string;
    email: string;
  };
  reviewee: {
    username: string;
    email: string;
  };
  transaction: {
    item: {
      title: string;
    };
  };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAdminReviews({ page, limit: 20 });
      if (response.success) {
        setReviews(response.data.reviews);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteAdminReview(reviewId);
      alert('리뷰가 삭제되었습니다.');
      fetchReviews();
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert('리뷰 삭제에 실패했습니다.');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">리뷰 관리</h1>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">아이템</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">평가자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">피평가자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">평점</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">코멘트</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{review.transaction.item.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{review.reviewer.username}</div>
                      <div className="text-xs text-gray-400">{review.reviewer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{review.reviewee.username}</div>
                      <div className="text-xs text-gray-400">{review.reviewee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-medium text-gray-900">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="max-w-md">
                        {review.comment || (
                          <span className="text-gray-400 italic">코멘트 없음</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reviews.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                리뷰가 없습니다.
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
