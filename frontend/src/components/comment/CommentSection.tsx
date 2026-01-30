'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface CommentSectionProps {
  tradeId: string;
}

export default function CommentSection({ tradeId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments();
  }, [tradeId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response: any = await api.getCommentsByTradeId(tradeId);
      setComments(response.data?.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await api.createComment({
        tradeId,
        content: newComment.trim(),
      });
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      alert(error.message || '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await api.updateComment(commentId, editContent.trim());
      setEditingId(null);
      setEditContent('');
      fetchComments();
    } catch (error: any) {
      alert(error.message || '댓글 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await api.deleteComment(commentId);
      fetchComments();
    } catch (error: any) {
      alert(error.message || '댓글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">댓글 ({comments.length})</h2>

      {/* 댓글 작성 폼 */}
      {isAuthenticated ? (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={submitting}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? '작성 중...' : '댓글 작성'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardBody>
            <p className="text-gray-600 text-center">
              댓글을 작성하려면 <a href="/login" className="text-blue-600 hover:underline">로그인</a>해주세요.
            </p>
          </CardBody>
        </Card>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {comment.user.avatarUrl ? (
                        <img
                          src={comment.user.avatarUrl}
                          alt={comment.user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-sm">👤</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{comment.user.username}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('ko-KR')}
                        {comment.createdAt !== comment.updatedAt && ' (수정됨)'}
                      </p>
                    </div>
                  </div>
                  {user?.id === comment.user.id && (
                    <div className="flex gap-2">
                      {editingId === comment.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            저장
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(comment)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {editingId === comment.id ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <p className="text-center text-gray-500">첫 댓글을 작성해보세요!</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
