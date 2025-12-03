export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export function generateMockTxHash(): string {
  return `0xdemo${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`.padEnd(66, '0');
}

export function generateMockBlockNumber(): number {
  return Math.floor(Date.now() / 1000);
}

export interface DemoResult<T> {
  isDemo: boolean;
  data: T;
}

export function wrapDemoResult<T>(data: T): DemoResult<T> {
  return {
    isDemo: isDemoMode(),
    data,
  };
}

export const DEMO_DELAYS = {
  fast: 100,
  normal: 500,
  slow: 1000,
};

export async function simulateDelay(type: keyof typeof DEMO_DELAYS = 'normal'): Promise<void> {
  if (isDemoMode()) {
    await new Promise(resolve => setTimeout(resolve, DEMO_DELAYS[type]));
  }
}
