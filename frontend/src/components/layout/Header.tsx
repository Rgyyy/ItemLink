'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              ItemLink
            </Link>
            <span className="text-sm text-gray-500 hidden md:inline-block">
              게이머들을 위한 직거래 매칭 플랫폼
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
              홈
            </Link>
            <Link href="/games" className="text-gray-700 hover:text-blue-600 font-medium">
              게임 목록
            </Link>
            <Link href="/boards/free" className="text-gray-700 hover:text-blue-600 font-medium">
              자유게시판
            </Link>
            <Link href="/boards/suggestion" className="text-gray-700 hover:text-blue-600 font-medium">
              건의게시판
            </Link>
            <Link href="/boards/report" className="text-gray-700 hover:text-blue-600 font-medium">
              신고하기
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm">👤</span>
                    </div>
                    <span className="hidden md:inline">{user?.username}</span>
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout}>
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    로그인
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    회원가입
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
