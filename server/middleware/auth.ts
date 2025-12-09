import { Request, Response, NextFunction } from 'express';
import { requireAuth, getAuth } from '@clerk/express';

// Use requireAuth with redirect: false to prevent redirects for API routes
export const validateAuth = requireAuth({ signInUrl: undefined });

// Custom API auth middleware that returns 401 JSON instead of redirecting
export const apiAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Authentication required' 
    });
  }
  (req as any).auth = auth;
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  if (auth.userId) {
    (req as any).userId = auth.userId;
  }
  next();
};

export const getAuthUserId = (req: Request): string | null => {
  const auth = getAuth(req);
  return auth.userId || null;
};
