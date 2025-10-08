import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import apiClient from '@/services/api';
import { jwtDecode } from 'jwt-decode'; 


interface DecodedToken {
  sub: string; 
  exp: number;
  userId: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userId: number | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);

        if (decodedToken.exp * 1000 > Date.now()) {
        setUserEmail(decodedToken.sub);
        setUserId(decodedToken.userId);
        setIsAuthenticated(true);
        } else {
          localStorage.removeItem('authToken'); 
        }
      } catch (error) {
        console.error("Token inválido:", error);
        localStorage.removeItem('authToken');
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    const decodedToken: DecodedToken = jwtDecode(token);
    setUserEmail(decodedToken.sub);
    setUserId(decodedToken.userId);
    setIsAuthenticated(true);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUserEmail(null);
    setUserId(null);
    setIsAuthenticated(false);
    setToken(null);
    window.location.href = '/auth';
  };

  const value = {
    isAuthenticated,
    userEmail,
    userId,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}