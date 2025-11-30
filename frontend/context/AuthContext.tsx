import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserKycStatus } from '../../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock User Data for simulation
const MOCK_USER: User = {
  id: 'user_12345',
  email: 'demo@parco.io',
  firstName: 'John',
  lastName: 'Doe',
  kycStatus: UserKycStatus.APPROVED,
  usdcBalance: 2450.00
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('parco_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successful login
    const loggedInUser = { ...MOCK_USER, email };
    setUser(loggedInUser);
    setIsAuthenticated(true);
    localStorage.setItem('parco_user', JSON.stringify(loggedInUser));
    setIsLoading(false);
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate registration syncing with backend
    // POST /auth/sync would happen here
    const newUser: User = {
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        email,
        firstName: 'New',
        lastName: 'User',
        kycStatus: UserKycStatus.PENDING,
        usdcBalance: 0
    };
    
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('parco_user', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser(MOCK_USER);
    setIsAuthenticated(true);
    localStorage.setItem('parco_user', JSON.stringify(MOCK_USER));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('parco_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, loginWithGoogle }}>
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