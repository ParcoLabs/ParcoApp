import * as cron from 'node-cron';
import { rentDistributionService } from './rentDistribution';
import { recomputeAllEngagement, checkAtRiskAndNotify } from './investorEngagement';

class SchedulerService {
  private static instance: SchedulerService;
  private jobs: Map<string, any> = new Map();
  private isInitialized: boolean = false;

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      console.log('[Scheduler] Already initialized');
      return;
    }

    console.log('[Scheduler] Initializing scheduled jobs...');

    this.scheduleRentDistribution();
    this.scheduleEngagementCheck();

    this.isInitialized = true;
    console.log('[Scheduler] All jobs scheduled successfully');
  }

  private scheduleRentDistribution(): void {
    const cronExpression = process.env.RENT_DISTRIBUTION_CRON || '0 0 1 * *';

    const job = cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Starting scheduled rent distribution...');
      
      try {
        const result = await rentDistributionService.runDistribution({
          triggeredBy: 'CRON',
        });

        console.log('[Scheduler] Rent distribution completed:', {
          runId: result.runId,
          status: result.status,
          propertiesProcessed: result.propertiesProcessed,
          holdersDistributed: result.holdersDistributed,
          totalNetDistributed: result.totalNetDistributed.toFixed(2),
        });

        if (result.errors.length > 0) {
          console.warn('[Scheduler] Distribution completed with errors:', result.errors);
        }
      } catch (err: any) {
        console.error('[Scheduler] Rent distribution failed:', err.message);
      }
    });

    this.jobs.set('rent-distribution', job);
    console.log(`[Scheduler] Rent distribution scheduled: ${cronExpression}`);
  }

  private scheduleEngagementCheck(): void {
    const cronExpression = process.env.ENGAGEMENT_CHECK_CRON || '0 6 * * *';

    const job = cron.schedule(cronExpression, async () => {
      if (process.env.DEMO_MODE === 'true') {
        console.log('[Scheduler] Skipping engagement check in demo mode');
        return;
      }
      console.log('[Scheduler] Starting daily engagement check...');

      try {
        await recomputeAllEngagement();
        const result = await checkAtRiskAndNotify();
        console.log('[Scheduler] Engagement check completed:', result);
      } catch (err: any) {
        console.error('[Scheduler] Engagement check failed:', err.message);
      }
    });

    this.jobs.set('engagement-check', job);
    console.log(`[Scheduler] Engagement check scheduled: ${cronExpression}`);
  }

  stopAll(): void {
    console.log('[Scheduler] Stopping all scheduled jobs...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`[Scheduler] Stopped job: ${name}`);
    }
    
    this.jobs.clear();
    this.isInitialized = false;
  }

  getJobStatus(): Array<{ name: string; running: boolean }> {
    const statuses: Array<{ name: string; running: boolean }> = [];
    
    for (const [name, job] of this.jobs) {
      statuses.push({ name, running: true });
    }
    
    return statuses;
  }

  async triggerRentDistribution(triggeredBy?: string): Promise<any> {
    return rentDistributionService.runDistribution({ triggeredBy });
  }
}

export const scheduler = SchedulerService.getInstance();
