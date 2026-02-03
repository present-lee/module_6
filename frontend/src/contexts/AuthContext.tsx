'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  User,
  AuthContextType,
} from '@/types/auth';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from '@/lib/api';

// 기본값으로 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 인증 상태 확인
  const isAuthenticated = !!user && !!token;

  // 역할 기반 권한 확인
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const isViewer = user?.role === 'viewer';
  const canEdit = isAdmin || isMember;  // admin 또는 member는 편집 가능

  // 초기 로드 시 토큰 확인 및 사용자 정보 가져오기
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();

      if (storedToken) {
        try {
          const userData = await getCurrentUser(storedToken);
          setUser(userData);
          setToken(storedToken);
        } catch (error) {
          // 토큰이 유효하지 않으면 제거
          console.error('토큰 검증 실패:', error);
          removeStoredToken();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // 로그인 함수
  const login = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Starting login...');
    const response = await loginUser({ email, password });
    const { access_token } = response;
    console.log('[Auth] Received token:', access_token ? `${access_token.substring(0, 20)}...` : 'null');

    // 토큰 저장
    setStoredToken(access_token);
    setToken(access_token);
    console.log('[Auth] Token stored in localStorage');

    // 사용자 정보 가져오기
    const userData = await getCurrentUser(access_token);
    setUser(userData);
    console.log('[Auth] Login successful, user:', userData.username);
  }, []);

  // 회원가입 함수
  const register = useCallback(async (username: string, email: string, password: string) => {
    await registerUser({ username, email, password });
    // 회원가입 성공 후 자동 로그인하지 않음
    // 사용자가 로그인 페이지로 이동하도록 함
  }, []);

  // 로그아웃 함수
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    isMember,
    isViewer,
    canEdit,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth 훅
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  }

  return context;
}
