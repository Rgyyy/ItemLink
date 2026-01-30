'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      // 에러 발생
      setError(
        errorParam === 'authentication_failed'
          ? '소셜 로그인에 실패했습니다.'
          : '서버 오류가 발생했습니다.'
      );
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    if (token) {
      // 토큰 저장
      localStorage.setItem('token', token);

      // 사용자 정보를 가져와서 AuthContext 업데이트
      // (AuthContext에서 토큰으로 자동으로 사용자 정보를 가져옴)

      // 홈으로 리다이렉트
      router.push('/');
    } else {
      setError('인증 정보가 없습니다.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {error ? (
            <>
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                로그인 실패
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">로그인 페이지로 이동합니다...</p>
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                로그인 중...
              </h2>
              <p className="text-gray-600">잠시만 기다려주세요.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              로그인 중...
            </h2>
            <p className="text-gray-600">잠시만 기다려주세요.</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
