'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">관리자 페이지</h1>
        </div>
        <nav className="mt-6">
          <Link
            href="/admin"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            대시보드
          </Link>
          <Link
            href="/admin/users"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            사용자 관리
          </Link>
          <Link
            href="/admin/items"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            아이템 관리
          </Link>
          <Link
            href="/admin/games"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            게임 관리
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
