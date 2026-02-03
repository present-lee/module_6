'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // 인증 상태에 따라 리다이렉트
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // 로그인된 경우 보드 페이지로
        router.push('/board');
      } else {
        // 로그인 안 된 경우 로그인 페이지로
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // 리다이렉트 중 로딩 표시
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-600">로딩 중...</p>
      </div>
    </main>
  );
}
