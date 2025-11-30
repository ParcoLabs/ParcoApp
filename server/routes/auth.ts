import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { validateAuth } from '../middleware/auth';

const router = Router();

const users: Map<string, any> = new Map();

router.post('/sync', validateAuth, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, firstName, lastName } = req.body;

    let user = users.get(userId);
    
    if (!user) {
      user = {
        id: userId,
        clerkId: userId,
        email: email || '',
        firstName: firstName || '',
        lastName: lastName || '',
        kycStatus: 'PENDING',
        usdcBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.set(userId, user);
      console.log(`New user synced: ${userId}`);
    } else {
      user = {
        ...user,
        email: email || user.email,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        updatedAt: new Date().toISOString(),
      };
      users.set(userId, user);
      console.log(`User updated: ${userId}`);
    }

    return res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
        usdcBalance: user.usdcBalance,
      }
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', validateAuth, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = users.get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sync first.' });
    }

    return res.json({ 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
        usdcBalance: user.usdcBalance,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
