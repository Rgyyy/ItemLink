import React from 'react';
import StarRating from './StarRating';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  transaction?: {
    item: {
      title: string;
    };
  };
}

interface ReviewCardProps {
  review: Review;
  showItem?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  canModify?: boolean;
}

export default function ReviewCard({
  review,
  showItem = false,
  onEdit,
  onDelete,
  canModify = false,
}: ReviewCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {review.reviewer.avatarUrl ? (
              <img
                src={review.reviewer.avatarUrl}
                alt={review.reviewer.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-semibold text-sm">
                  {review.reviewer.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">
                {review.reviewer.username}
              </span>
              <StarRating rating={review.rating} size="sm" />
            </div>

            {showItem && review.transaction?.item && (
              <p className="text-sm text-gray-500 mb-2">
                상품: {review.transaction.item.title}
              </p>
            )}

            {review.comment && (
              <p className="text-gray-700 mt-2">{review.comment}</p>
            )}

            <p className="text-sm text-gray-500 mt-2">
              {new Date(review.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        {canModify && (
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                수정
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-sm text-red-600 hover:text-red-700"
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
