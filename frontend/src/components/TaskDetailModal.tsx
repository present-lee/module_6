'use client';

import { useState, useEffect } from 'react';
import { Category, Task, Priority, TaskUpdateRequest, PRIORITY_CONFIG } from '@/types/kanban';
import { User } from '@/types/auth';
import { updateTask, deleteTask, moveTask, getUsers } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  task: Task | null;
  categories: Category[];
}

// 날짜 포맷 (YYYY-MM-DD)
function formatDateForInput(dateString: string | null): string {
  if (!dateString) return '';
  return dateString.split('T')[0];
}

// 날짜 표시 형식
function formatDateDisplay(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  task,
  categories,
}: TaskDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [assignedTo, setAssignedTo] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { canEdit, isAdmin, user: currentUser } = useAuth();

  // 사용자 목록 로드
  useEffect(() => {
    if (isOpen) {
      getUsers()
        .then(setUsers)
        .catch((err) => console.error('사용자 목록 로드 실패:', err));
    }
  }, [isOpen]);

  // task가 변경될 때 폼 초기화
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setCategoryId(task.category_id);
      setAssignedTo(task.assigned_to || '');
      setStartDate(formatDateForInput(task.start_date));
      setDueDate(formatDateForInput(task.due_date));
      setPriority(task.priority);
      setIsEditMode(false);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [task]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!task) return;

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: TaskUpdateRequest = {
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo || null,
        start_date: startDate ? `${startDate}T00:00:00` : null,
        due_date: dueDate ? `${dueDate}T23:59:59` : null,
        priority,
      };

      // 카테고리가 변경된 경우 move API 호출
      if (categoryId !== task.category_id) {
        await moveTask(task.id, { category_id: categoryId });
      }

      await updateTask(task.id, data);
      onUpdated();
      setIsEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '일감 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteTask(task.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일감 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setIsEditMode(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen || !task) return null;

  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditMode ? '일감 수정' : '일감 상세'}
          </h2>
          <button
            onClick={handleClose}
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

        {/* 본문 */}
        <div className="p-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {isEditMode ? (
            // 수정 모드
            <form onSubmit={handleUpdate} className="space-y-4">
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
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
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
                  <option value="">담당자 없음</option>
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
                  onClick={() => setIsEditMode(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          ) : (
            // 보기 모드
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
              </div>

              {/* 설명 */}
              {task.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">설명</label>
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* 정보 그리드 */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* 카테고리 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">카테고리</label>
                  <span
                    className="inline-block px-2 py-1 rounded text-sm"
                    style={{
                      backgroundColor: task.category?.color
                        ? `${task.category.color}20`
                        : '#f3f4f6',
                      color: task.category?.color || '#374151',
                    }}
                  >
                    {task.category?.name || '알 수 없음'}
                  </span>
                </div>

                {/* 우선순위 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">우선순위</label>
                  <span
                    className={`inline-block px-2 py-1 rounded text-sm ${priorityConfig.bgColor} ${priorityConfig.color}`}
                  >
                    {priorityConfig.label}
                  </span>
                </div>

                {/* 담당자 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">담당자</label>
                  <p className="text-gray-700">
                    {task.assignee?.username || '미지정'}
                  </p>
                </div>

                {/* 생성자 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">생성자</label>
                  <p className="text-gray-700">
                    {task.creator?.username || '알 수 없음'}
                  </p>
                </div>

                {/* 시작일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">시작일</label>
                  <p className="text-gray-700">{formatDateDisplay(task.start_date)}</p>
                </div>

                {/* 마감일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">마감일</label>
                  <p className="text-gray-700">{formatDateDisplay(task.due_date)}</p>
                </div>
              </div>

              {/* 생성일/수정일 */}
              <div className="pt-4 border-t text-xs text-gray-400">
                <p>생성: {formatDateDisplay(task.created_at)}</p>
                <p>수정: {formatDateDisplay(task.updated_at)}</p>
              </div>

              {/* 버튼 (권한에 따라 표시) */}
              {canEdit && (
                <div className="flex gap-3 pt-4">
                  {showDeleteConfirm ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? '삭제 중...' : '삭제 확인'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 삭제: Admin/Member 또는 본인만 */}
                      {(isAdmin || task.created_by === currentUser?.id) && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="py-2 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        수정
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
