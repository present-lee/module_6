'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole } from '@/types/auth';
import { getUsers, updateUserRole, deleteUser } from '@/lib/api';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string }> = {
  admin: { label: '관리자', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  member: { label: '멤버', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  viewer: { label: '뷰어', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // 인증 및 권한 확인
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/board');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // 사용자 목록 로드
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: number) => {
    try {
      await updateUserRole(userId, selectedRole);
      await loadUsers();
      setEditingUserId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await deleteUser(userId);
      await loadUsers();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 삭제에 실패했습니다.');
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/board')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-sm ${ROLE_CONFIG.admin.bgColor} ${ROLE_CONFIG.admin.color}`}>
                {ROLE_CONFIG.admin.label}
              </span>
              <span className="text-gray-700">{currentUser?.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-400 hover:text-red-600">
              &times;
            </button>
          </div>
        )}

        {/* 사용자 테이블 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">전체 사용자 ({users.length}명)</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={user.id === currentUser?.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.username}</span>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-indigo-600">(나)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUserId === user.id ? (
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                          className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="admin">관리자</option>
                          <option value="member">멤버</option>
                          <option value="viewer">뷰어</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-sm ${ROLE_CONFIG[user.role].bgColor} ${ROLE_CONFIG[user.role].color}`}>
                          {ROLE_CONFIG[user.role].label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {user.id === currentUser?.id ? (
                        <span className="text-gray-400">-</span>
                      ) : editingUserId === user.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            저장
                          </button>
                        </div>
                      ) : deleteConfirmId === user.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제확인
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditing(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            역할변경
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 역할 설명 */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">역할별 권한</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-purple-50">
              <div className={`font-medium ${ROLE_CONFIG.admin.color} mb-2`}>관리자 (Admin)</div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>- 모든 일감 조회/생성/수정/삭제</li>
                <li>- 사용자 관리 (역할 변경, 삭제)</li>
                <li>- 시스템 설정 관리</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-blue-50">
              <div className={`font-medium ${ROLE_CONFIG.member.color} mb-2`}>멤버 (Member)</div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>- 모든 일감 조회/생성/수정</li>
                <li>- 본인 생성 일감 삭제</li>
                <li>- 담당자로 할당 가능</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className={`font-medium ${ROLE_CONFIG.viewer.color} mb-2`}>뷰어 (Viewer)</div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>- 모든 일감 조회만 가능</li>
                <li>- 생성/수정/삭제 불가</li>
                <li>- 읽기 전용 접근</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
