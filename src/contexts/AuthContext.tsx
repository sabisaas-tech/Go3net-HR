import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { showToast } from '../services/toastService';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const userData = await apiService.getMe();
      const rolesData = await apiService.getMyRoles();
      
      setUser({
        ...userData.data,
        role: rolesData.data?.roles?.[0]?.roleName || 'employee',
        permissions: rolesData.data?.roles?.[0]?.permissions || []
      });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      // Fix: Get token from correct path based on network requests
      const token = response.data.tokens?.accessToken || response.data.accessToken;
      localStorage.setItem('authToken', token);
      await refreshUser();
      showToast.success('Login successful', 'Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      showToast.error('Login failed', error.message || 'Invalid credentials');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    showToast.success('Logged out', 'You have been logged out successfully.');
    navigate('/');
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};