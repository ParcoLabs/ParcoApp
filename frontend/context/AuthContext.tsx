import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

interface UserData {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  usdcBalance: number;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded, signOut: clerkSignOut, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded) return;
      
      if (isSignedIn && clerkUser) {
        try {
          const token = await getToken();
          
          const syncResponse = await fetch(`${API_BASE_URL}/api/auth/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: clerkUser.id }),
          });

          if (syncResponse.ok) {
            const data = await syncResponse.json();
            setUser({
              id: data.user.id,
              clerkId: data.user.clerkId || data.user.clerk_id,
              email: data.user.email,
              firstName: data.user.firstName || data.user.first_name || '',
              lastName: data.user.lastName || data.user.last_name || '',
              kycStatus: data.user.kycStatus || data.user.kyc_status || 'PENDING',
              usdcBalance: parseFloat(data.user.usdcBalance || data.user.usdc_balance || '0'),
            });
          } else {
            setUser({
              id: clerkUser.id,
              clerkId: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              firstName: clerkUser.firstName || '',
              lastName: clerkUser.lastName || '',
              kycStatus: 'PENDING',
              usdcBalance: 0,
            });
          }
        } catch (error) {
          console.error('Failed to sync user:', error);
          setUser({
            id: clerkUser.id,
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            kycStatus: 'PENDING',
            usdcBalance: 0,
          });
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    };

    syncUser();
  }, [isLoaded, isSignedIn, clerkUser, getToken]);

  const signOut = async () => {
    await clerkSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: isSignedIn ?? false, 
      isLoading: !isLoaded || isLoading,
      signOut 
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
