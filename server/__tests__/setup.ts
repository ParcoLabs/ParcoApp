import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_fake';
process.env.CLERK_SECRET_KEY = 'sk_test_fake';

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  requireAuth: () => (_req: any, _res: any, next: any) => next(),
  getAuth: (req: any) => {
    const clerkId = req.headers['x-test-clerk-id'];
    if (clerkId === 'none') return { userId: null };
    return { userId: clerkId || 'test_clerk_user_1' };
  },
}));

vi.mock('../lib/demoMode', () => ({
  isDemoMode: () => false,
  generateMockTxHash: () => '0xdeadbeef',
  generateMockBlockNumber: () => 12345678,
}));

vi.mock('../utils/demoMode', () => ({
  isDemoMode: () => false,
}));
