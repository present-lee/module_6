import { User } from './auth';

// 카테고리 타입
export interface Category {
  id: number;
  name: string;
  order: number;
  color: string;
  created_at: string;
}

// 우선순위 타입
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// 일감 타입
export interface Task {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  assigned_to: number | null;
  created_by: number;
  start_date: string | null;
  due_date: string | null;
  priority: Priority;
  order: number;
  created_at: string;
  updated_at: string;
  // 관계
  category?: Category;
  assignee?: User | null;
  creator?: User;
}

// 일감 생성 요청 타입
export interface TaskCreateRequest {
  title: string;
  description?: string | null;
  category_id: number;
  assigned_to?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  priority?: Priority;
}

// 일감 수정 요청 타입
export interface TaskUpdateRequest {
  title?: string;
  description?: string | null;
  category_id?: number;
  assigned_to?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  priority?: Priority;
}

// 일감 이동 요청 타입
export interface TaskMoveRequest {
  category_id: number;
  order?: number;
}

// 일감 필터 타입
export interface TaskFilter {
  category_id?: number;
  assigned_to?: number;
  priority?: Priority;
  created_by?: number;
}

// 우선순위 라벨 및 색상 매핑
export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
  low: { label: '낮음', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: '보통', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: '높음', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: '긴급', color: 'text-red-600', bgColor: 'bg-red-100' },
};
