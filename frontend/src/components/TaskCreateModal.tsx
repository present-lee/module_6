'use client';

import { useState, useEffect } from 'react';
import { Category, Priority, TaskCreateRequest, PRIORITY_CONFIG } from '@/types/kanban';
import { User } from '@/types/auth';
import { createTask, getUsers } from '@/lib/api';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: Category[];
  defaultCategoryId?: number;
}

export default function TaskCreateModal({
  isOpen,
  onClose,
  onCreated,
  categories,
  defaultCategoryId,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(defaultCategoryId || 0);
  const [assignedTo, setAssignedTo] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 사용자 목록 로드
  useEffect(() => {
    if (isOpen) {
      getUsers()
        .then(setUsers)
        .catch((err) => console.error('사용자 목록 로드 실패:', err));
    }
  }, [isOpen]);

  // 모달 열릴 때 기본값 설정
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setCategoryId(defaultCategoryId || categories[0]?.id || 0);
      setAssignedTo('');
      setStartDate('');
      setDueDate('');
      setPriority('medium');
      setError(null);
    }
  }, [isOpen, defaultCategoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    if (!categoryId) {
      setError('카테고리를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: TaskCreateRequest = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        assigned_to: assignedTo || null,
        start_date: startDate ? `${startDate}T00:00:00` : null,
        due_date: dueDate ? `${dueDate}T23:59:59` : null,
        priority,
      };

      await createTask(data);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일감 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">새 일감 생성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="일감 제목을 입력하세요"
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="일감에 대한 상세 설명을 입력하세요"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value={0}>카테고리 선택</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 담당자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">담당자 선택 (선택사항)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                마감일
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <div className="flex gap-2">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    priority === p
                      ? `${PRIORITY_CONFIG[p].bgColor} ${PRIORITY_CONFIG[p].color} ring-2 ring-offset-1 ring-current`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
