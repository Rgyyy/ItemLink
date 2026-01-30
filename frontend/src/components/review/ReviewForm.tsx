import React, { useState } from 'react';
import StarRating from './StarRating';
import Button from '../ui/Button';

interface ReviewFormProps {
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  onCancel?: () => void;
  initialRating?: number;
  initialComment?: string;
  isEdit?: boolean;
}

export default function ReviewForm({
  onSubmit,
  onCancel,
  initialRating = 0,
  initialComment = '',
  isEdit = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('별점을 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({ rating, comment });
      if (!isEdit) {
        setRating(0);
        setComment('');
      }
    } catch (err: any) {
      setError(err.message || '리뷰 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          별점 <span className="text-red-500">*</span>
        </label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
      </div>

      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          리뷰 내용 (선택사항)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="거래 경험을 공유해주세요..."
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={loading}
        >
          {loading ? '저장 중...' : isEdit ? '리뷰 수정' : '리뷰 작성'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
