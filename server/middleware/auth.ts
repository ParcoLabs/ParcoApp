import { Request, Response, NextFunction } from 'express';
import { requireAuth, getAuth } from '@clerk/express';

export const validateAuth = requireAuth();

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
