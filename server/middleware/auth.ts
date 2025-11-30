import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId: string;
  };
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    
    const client = clerkClient;
    const sessionClaims = await client.verifyToken(token);

    (req as AuthenticatedRequest).auth = {
      userId: sessionClaims.sub,
      sessionId: sessionClaims.sid || '',
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      const client = clerkClient;
      const sessionClaims = await client.verifyToken(token);

      (req as AuthenticatedRequest).auth = {
        userId: sessionClaims.sub,
        sessionId: sessionClaims.sid || '',
      };
    }
    next();
  } catch (error) {
    next();
  }
};
