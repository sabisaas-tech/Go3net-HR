import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from '../hooks/use-toast';

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
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      localStorage.setItem('authToken', response.data.accessToken);
      await refreshUser();
      toast({ title: 'Login successful', description: 'Welcome back!' });
    } catch (error: any) {
      toast({ 
        title: 'Login failed', 
        description: error.message || 'Invalid credentials',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    toast({ title: 'Logged out', description: 'You have been logged out successfully.' });
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