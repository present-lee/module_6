'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ProtectedRoute from '@/components/ProtectedRoute';
import TaskCard, { TaskCardOverlay } from '@/components/TaskCard';
import TaskCreateModal from '@/components/TaskCreateModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { getCategories, getTasks, moveTask } from '@/lib/api';
import { Category, Task } from '@/types/kanban';

// 드롭 가능한 카테고리 컨테이너 컴포넌트
function DroppableCategory({
  category,
  children,
  isOver,
}: {
  category: Category;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `category-${category.id}`,
    data: {
      type: 'category',
      category,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] transition-colors duration-200 ${
        isOver ? 'bg-indigo-100 rounded-lg' : ''
      }`}
    >
      {children}
    </div>
  );
}

function BoardContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 드래그 상태
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { user, logout } = useAuth();
  const router = useRouter();

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작 (클릭과 구분)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [categoriesData, tasksData] = await Promise.all([
        getCategories(),
        getTasks(),
      ]);
      setCategories(categoriesData.sort((a, b) => a.order - b.order));
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 카테고리별 일감 필터링 (메모이제이션)
  const tasksByCategory = useMemo(() => {
    const map = new Map<number, Task[]>();
    categories.forEach((category) => {
      const categoryTasks = tasks
        .filter((task) => task.category_id === category.id)
        .sort((a, b) => a.order - b.order);
      map.set(category.id, categoryTasks);
    });
    return map;
  }, [categories, tasks]);

  // 카테고리별 task id 목록 (SortableContext용)
  const taskIdsByCategory = useMemo(() => {
    const map = new Map<number, string[]>();
    tasksByCategory.forEach((tasks, categoryId) => {
      map.set(categoryId, tasks.map((task) => `task-${task.id}`));
    });
    return map;
  }, [tasksByCategory]);

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'task') {
      setActiveTask(activeData.task);
      setIsDragging(true);
    }
  };

  // 드래그 중 (다른 컨테이너 위로 이동)
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id?.toString() ?? null);
  };

  // 드래그 종료
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);
    setOverId(null);
    setIsDragging(false);

    if (!over || !active) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'task') return;

    const draggedTask = activeData.task as Task;
    let targetCategoryId: number;
    let targetOrder: number;

    // 드롭 위치 결정
    if (overData?.type === 'category') {
      // 빈 카테고리에 드롭
      targetCategoryId = overData.category.id;
      const categoryTasks = tasksByCategory.get(targetCategoryId) || [];
      targetOrder = categoryTasks.length;
    } else if (overData?.type === 'task') {
      // 다른 태스크 위에 드롭
      const overTask = overData.task as Task;
      targetCategoryId = overTask.category_id;
      const categoryTasks = tasksByCategory.get(targetCategoryId) || [];
      const overIndex = categoryTasks.findIndex((t) => t.id === overTask.id);
      targetOrder = overIndex >= 0 ? overIndex : categoryTasks.length;
    } else {
      return;
    }

    // 같은 위치면 무시
    if (
      draggedTask.category_id === targetCategoryId &&
      draggedTask.order === targetOrder
    ) {
      return;
    }

    // Optimistic UI 업데이트
    const previousTasks = [...tasks];

    // 새로운 tasks 상태 계산
    const newTasks = tasks.map((task) => {
      if (task.id === draggedTask.id) {
        return {
          ...task,
          category_id: targetCategoryId,
          order: targetOrder,
        };
      }

      // 같은 카테고리 내 다른 태스크들의 order 재조정
      if (task.category_id === targetCategoryId) {
        // 같은 카테고리 내 이동
        if (draggedTask.category_id === targetCategoryId) {
          if (draggedTask.order < targetOrder) {
            // 아래로 이동: 드래그된 위치와 목표 위치 사이의 태스크들 order -1
            if (task.order > draggedTask.order && task.order <= targetOrder) {
              return { ...task, order: task.order - 1 };
            }
          } else if (draggedTask.order > targetOrder) {
            // 위로 이동: 목표 위치와 드래그된 위치 사이의 태스크들 order +1
            if (task.order >= targetOrder && task.order < draggedTask.order) {
              return { ...task, order: task.order + 1 };
            }
          }
        } else {
          // 다른 카테고리에서 이동해옴: targetOrder 이상의 태스크들 order +1
          if (task.order >= targetOrder) {
            return { ...task, order: task.order + 1 };
          }
        }
      }

      // 원래 카테고리에서 나감: 원래 order 이후의 태스크들 order -1
      if (
        task.category_id === draggedTask.category_id &&
        draggedTask.category_id !== targetCategoryId &&
        task.order > draggedTask.order
      ) {
        return { ...task, order: task.order - 1 };
      }

      return task;
    });

    setTasks(newTasks);

    // API 호출
    try {
      await moveTask(draggedTask.id, {
        category_id: targetCategoryId,
        order: targetOrder,
      });
    } catch (err) {
      // 실패 시 롤백
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : '일감 이동에 실패했습니다.');

      // 3초 후 에러 메시지 제거
      setTimeout(() => setError(null), 3000);
    }
  };

  // 드래그 취소
  const handleDragCancel = () => {
    setActiveTask(null);
    setOverId(null);
    setIsDragging(false);
  };

  // 일감 생성 모달 열기
  const handleOpenCreateModal = (categoryId?: number) => {
    setSelectedCategoryId(categoryId);
    setIsCreateModalOpen(true);
  };

  // 일감 상세 모달 열기
  const handleOpenDetailModal = (task: Task) => {
    if (!isDragging) {
      setSelectedTask(task);
      setIsDetailModalOpen(true);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Kanban Board</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + 새 일감
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 에러 메시지 */}
      {error && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* 보드 컨테이너 */}
      <main className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 min-h-[calc(100vh-120px)]">
            {categories.map((category) => {
              const categoryTasks = tasksByCategory.get(category.id) || [];
              const taskIds = taskIdsByCategory.get(category.id) || [];
              const isOverCategory = overId === `category-${category.id}`;

              return (
                <div
                  key={category.id}
                  className="flex-shrink-0 w-80 bg-gray-200 rounded-lg flex flex-col"
                >
                  {/* 카테고리 헤더 */}
                  <div
                    className="p-3 rounded-t-lg flex items-center justify-between"
                    style={{ backgroundColor: category.color || '#6b7280' }}
                  >
                    <h2 className="font-semibold text-white flex items-center gap-2">
                      {category.name}
                      <span className="bg-white bg-opacity-30 text-white text-xs px-2 py-0.5 rounded-full">
                        {categoryTasks.length}
                      </span>
                    </h2>
                    <button
                      onClick={() => handleOpenCreateModal(category.id)}
                      className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
                      title="이 카테고리에 일감 추가"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* 일감 목록 (드롭 가능 영역) */}
                  <SortableContext
                    items={taskIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCategory category={category} isOver={isOverCategory}>
                      {categoryTasks.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">
                          일감이 없습니다
                          <p className="text-xs mt-1 text-gray-400">
                            여기로 드래그하여 일감을 이동하세요
                          </p>
                        </div>
                      ) : (
                        categoryTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => handleOpenDetailModal(task)}
                            isDragging={activeTask?.id === task.id}
                          />
                        ))
                      )}
                    </DroppableCategory>
                  </SortableContext>

                  {/* 하단 추가 버튼 */}
                  <div className="p-2">
                    <button
                      onClick={() => handleOpenCreateModal(category.id)}
                      className="w-full py-2 text-gray-500 text-sm hover:bg-gray-300 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      일감 추가
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 카테고리가 없는 경우 */}
            {categories.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="mb-2">카테고리가 없습니다.</p>
                  <p className="text-sm">백엔드에서 기본 카테고리를 생성해주세요.</p>
                </div>
              </div>
            )}
          </div>

          {/* 드래그 오버레이 */}
          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* 일감 생성 모달 */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadData}
        categories={categories}
        defaultCategoryId={selectedCategoryId}
      />

      {/* 일감 상세 모달 */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdated={loadData}
        onDeleted={loadData}
        task={selectedTask}
        categories={categories}
      />
    </div>
  );
}

export default function BoardPage() {
  return (
    <ProtectedRoute>
      <BoardContent />
    </ProtectedRoute>
  );
}
