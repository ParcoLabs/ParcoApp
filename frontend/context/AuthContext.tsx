import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { User, UserKycStatus } from '../../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  getToken: () => Promise<string | null>;
  syncUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = '';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const syncUser = async () => {
    if (!clerkUser || !isSignedIn) return;

    try {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
          kycStatus: UserKycStatus.PENDING,
          usdcBalance: 0,
        });
      }
    } catch (error) {
      console.error('Failed to sync user:', error);
      setUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        kycStatus: UserKycStatus.PENDING,
        usdcBalance: 0,
      });
    }
  };

  useEffect(() => {
    if (!isClerkLoaded) {
      return;
    }

    if (isSignedIn && clerkUser) {
      syncUser().finally(() => setIsLoading(false));
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  const logout = () => {
    signOut();
    setUser(null);
  };

  const getTokenAsync = async (): Promise<string | null> => {
    return await getToken();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!isSignedIn && !!user, 
        isLoading: !isClerkLoaded || isLoading, 
        logout,
        getToken: getTokenAsync,
        syncUser,
      }}
    >
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
