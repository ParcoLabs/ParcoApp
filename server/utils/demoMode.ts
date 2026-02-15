import type { Request } from 'express';
import { isDemoMode as libIsDemoMode } from '../lib/demoMode';

export function isDemoMode(req?: Request): boolean {
  if (process.env.DEMO_MODE === 'true') {
    return true;
  }

  if (libIsDemoMode()) {
    return true;
  }

  if (req && (req as any).user?.isDemoUser) {
    return true;
  }

  return false;
}
