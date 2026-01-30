'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAdminUsers({
        page,
        limit: 20,
        search,
        role: roleFilter
      });
      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      await api.updateAdminUser(userId, updates);
      alert('사용자가 업데이트되었습니다.');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('사용자 업데이트에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteAdminUser(userId);
      alert('사용자가 삭제되었습니다.');
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      const errorMessage = error?.message || '사용자 삭제에 실패했습니다.';
      alert(errorMessage);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">사용자 관리</h1>

      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이메일 또는 사용자명 검색"
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 권한</option>
            <option value="USER">사용자</option>
            <option value="ADMIN">관리자</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">권한</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">인증</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.fullName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="USER">사용자</option>
                        <option value="ADMIN">관리자</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleUpdateUser(user.id, { isVerified: !user.isVerified })}
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.isVerified ? '인증됨' : '미인증'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleUpdateUser(user.id, { isActive: !user.isActive })}
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.isActive ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {currentUser?.id === user.id ? (
                        <span className="text-gray-400 cursor-not-allowed" title="자신의 계정은 삭제할 수 없습니다">
                          삭제
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                사용자가 없습니다.
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
