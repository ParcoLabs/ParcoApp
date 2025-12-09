import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { User, UserKycStatus } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  getToken: () => Promise<string | null>;
  syncUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = '';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const hasSyncedRef = useRef<string | null>(null);

  const fetchUserRole = async (token: string): Promise<{ role: string; tokenizerViewMode?: string } | null> => {
    try {
      const roleResponse = await fetch(`${API_BASE_URL}/api/admin/user/role`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        return { role: roleData.role || 'USER', tokenizerViewMode: roleData.tokenizerViewMode };
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
    }
    return null;
  };

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
        const roleData = token ? await fetchUserRole(token) : null;
        setUser({
          ...data.user,
          role: roleData?.role || 'USER',
          tokenizerViewMode: roleData?.tokenizerViewMode,
        });
      } else {
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
          kycStatus: UserKycStatus.PENDING,
          usdcBalance: 0,
          role: 'USER',
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
        role: 'USER',
      });
    }
  };

  const refreshUser = async () => {
    await syncUser();
  };

  useEffect(() => {
    if (!isClerkLoaded) {
      return;
    }

    if (isSignedIn && clerkUser) {
      if (hasSyncedRef.current === clerkUser.id) {
        setIsLoading(false);
        return;
      }
      hasSyncedRef.current = clerkUser.id;
      syncUser().finally(() => setIsLoading(false));
    } else {
      hasSyncedRef.current = null;
      setUser(null);
      setIsLoading(false);
    }
  }, [isClerkLoaded, isSignedIn, clerkUser?.id]);

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
        refreshUser,
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
