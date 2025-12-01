import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserKycStatus } from '../../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.id,
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          kycStatus: UserKycStatus.PENDING,
          usdcBalance: 0,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = () => {
    window.location.href = '/api/logout';
  };

  const refetchUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      logout,
      refetchUser,
    }}>
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
