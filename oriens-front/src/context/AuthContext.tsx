import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import apiClient from '@/services/api';
import { jwtDecode } from 'jwt-decode'; 


interface DecodedToken {
  sub: string;
  exp: number;
  userId: number;
  username: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  username: string | null;
  userId: number | null;
  profileImageUrl: string | null;
  token: string | null;
  role: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  updateProfileImage: (newUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);

        if (decodedToken.exp * 1000 > Date.now()) {
          const userResponse = await apiClient.get(`/user/${decodedToken.userId}`);
            const user = userResponse.data;

        setUserEmail(decodedToken.sub);
        setUserId(decodedToken.userId);
        setUsername(decodedToken.username);
        setRole(decodedToken.role);
        setProfileImageUrl(user.profileImageUrl);
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
    };
    initializeAuth();
  }, [token]);

  const login = async (token: string) => {
    localStorage.setItem('authToken', token);
    const decodedToken: DecodedToken = jwtDecode(token);

    const userResponse = await apiClient.get(`/user/${decodedToken.userId}`);
    const user = userResponse.data;

    setUserEmail(decodedToken.sub);
    setUsername(decodedToken.username);
    setUserId(decodedToken.userId);
    setRole(decodedToken.role);
    setProfileImageUrl(user.profileImageUrl);
    setIsAuthenticated(true);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('oriens-user-preferences');
    localStorage.setItem('oriens-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');

    setUserEmail(null);
    setUsername(null);
    setUserId(null);
    setRole(null);
    setIsAuthenticated(false);
    setToken(null);
    window.location.href = '/auth';
  };

  const updateProfileImage = (newUrl: string) => {
    setProfileImageUrl(newUrl);
  };

  const value = {
    isAuthenticated,
    userEmail,
    username,
    userId,
    token,
    role,
    isLoading,
    profileImageUrl,
    login,
    logout,
    updateProfileImage,
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