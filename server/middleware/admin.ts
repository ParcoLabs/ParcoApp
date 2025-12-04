import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    email: string;
    role: 'USER' | 'TOKENIZER' | 'ADMIN';
    firstName?: string | null;
    lastName?: string | null;
  };
}

export const loadUserWithRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error('Error loading user with role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const adminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error('Error in adminOnly middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const tokenizerOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'TOKENIZER') {
      return res.status(403).json({ error: 'Access denied. Tokenizer or Admin role required.' });
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error('Error in tokenizerOrAdmin middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
