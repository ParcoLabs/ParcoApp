import { Router } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/sync', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser) {
      return res.status(404).json({ error: 'Clerk user not found' });
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';

    const existingUser = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

    if (existingUser.length > 0) {
      await db.update(users)
        .set({
          email,
          firstName,
          lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId));

      return res.json({ 
        message: 'User updated', 
        user: existingUser[0] 
      });
    }

    const newUser = {
      id: uuidv4(),
      clerkId: userId,
      email: email || '',
      firstName,
      lastName,
      kycStatus: 'PENDING' as const,
      usdcBalance: '0',
    };

    await db.insert(users).values(newUser);

    return res.status(201).json({ 
      message: 'User created', 
      user: newUser 
    });

  } catch (error) {
    console.error('Auth sync error:', error);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const auth = (req as any).auth;
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: user[0] });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
