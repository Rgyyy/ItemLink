'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

interface Trade {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    username: string;
    tier: string;
  };
}

function FreeBoardContent() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: any = { boardType: 'FREE', limit: 50 };
      const response: any = await api.getTrades(params);
      setPosts(response.data?.trades || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post =>
    searchTerm === '' ||
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header Section */}
      <section className="bg-white border-b py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">자유게시판</h1>
            {isAuthenticated && (
              <Link href="/trades/new?boardType=FREE">
                <Button variant="primary">+ 글쓰기</Button>
              </Link>
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Post List Section */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : filteredPosts.length > 0 ? (
            <>
              {/* PC: List View */}
              <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-3/5">제목</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">작성자</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">작성일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/trades/${post.id}`}>
                            <p className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">
                              {post.title}
                            </p>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{post.seller.username}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Card View */}
              <div className="md:hidden grid gap-4">
                {filteredPosts.map((post) => (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    <CardBody>
                      <Link href={`/trades/${post.id}`}>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                          {post.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{post.seller.username}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </Link>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              등록된 게시글이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function FreeBoard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    }>
      <FreeBoardContent />
    </Suspense>
  );
}
