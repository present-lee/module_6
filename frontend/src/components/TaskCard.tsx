'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, PRIORITY_CONFIG } from '@/types/kanban';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
  disabled?: boolean;  // 드래그 비활성화 (viewer용)
}

// 마감일이 임박했는지 확인 (3일 이내)
function isDueSoon(dueDate: string): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 3 && diffDays >= 0;
}

// 마감일이 지났는지 확인
function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  return due < now;
}

// 날짜 포맷
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

export default function TaskCard({ task, onClick, isDragging: externalIsDragging, disabled = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: {
      type: 'task',
      task,
    },
    disabled,  // viewer는 드래그 불가
  });

  const isDragging = externalIsDragging || sortableIsDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // 마감일 스타일 결정
  let dueDateStyle = 'text-gray-500';
  if (task.due_date) {
    if (isOverdue(task.due_date)) {
      dueDateStyle = 'text-red-600 font-semibold';
    } else if (isDueSoon(task.due_date)) {
      dueDateStyle = 'text-orange-600 font-medium';
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 ${
        disabled ? 'cursor-pointer' : 'cursor-grab'
      } hover:shadow-md hover:border-gray-300 transition-all ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-indigo-500 rotate-2' : ''
      }`}
      {...attributes}
      {...(!disabled && listeners)}  // disabled가 아닐 때만 listeners 적용
      onClick={(e) => {
        // 드래그가 아닌 경우에만 클릭 이벤트 처리
        if (!isDragging) {
          onClick();
        }
      }}
    >
      {/* 드래그 핸들 아이콘 (편집 가능한 경우만 표시) */}
      <div className="flex items-start gap-2">
        {!disabled && (
          <div className="text-gray-400 hover:text-gray-600 pt-1 cursor-grab">
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
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* 제목 */}
          <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">
            {task.title}
          </h4>

          {/* 설명 (있는 경우) */}
          {task.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* 하단 정보 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* 우선순위 뱃지 */}
            <span
              className={`text-xs px-2 py-1 rounded-full ${priorityConfig.bgColor} ${priorityConfig.color}`}
            >
              {priorityConfig.label}
            </span>

            <div className="flex items-center gap-2">
              {/* 마감일 (있는 경우) */}
              {task.due_date && (
                <span className={`text-xs flex items-center gap-1 ${dueDateStyle}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(task.due_date)}
                </span>
              )}

              {/* 담당자 (있는 경우) */}
              {task.assignee && (
                <span
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full truncate max-w-[80px]"
                  title={task.assignee.username}
                >
                  {task.assignee.username}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 드래그 오버레이용 컴포넌트 (드래그 중 미리보기)
export function TaskCardOverlay({ task }: { task: Task }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // 마감일 스타일 결정
  let dueDateStyle = 'text-gray-500';
  if (task.due_date) {
    if (isOverdue(task.due_date)) {
      dueDateStyle = 'text-red-600 font-semibold';
    } else if (isDueSoon(task.due_date)) {
      dueDateStyle = 'text-orange-600 font-medium';
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-xl border-2 border-indigo-500 p-3 w-72 rotate-3 opacity-90">
      <div className="flex items-start gap-2">
        <div className="text-gray-400 pt-1">
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
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">
            {task.title}
          </h4>

          {task.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${priorityConfig.bgColor} ${priorityConfig.color}`}
            >
              {priorityConfig.label}
            </span>

            <div className="flex items-center gap-2">
              {task.due_date && (
                <span className={`text-xs flex items-center gap-1 ${dueDateStyle}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(task.due_date)}
                </span>
              )}

              {task.assignee && (
                <span
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full truncate max-w-[80px]"
                  title={task.assignee.username}
                >
                  {task.assignee.username}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
