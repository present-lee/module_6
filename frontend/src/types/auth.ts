// 사용자 정보 타입
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

// 로그인 요청 타입
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청 타입
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 로그인 응답 타입
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// API 에러 응답 타입
export interface ApiError {
  detail: string;
}

// 인증 컨텍스트 타입
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}
