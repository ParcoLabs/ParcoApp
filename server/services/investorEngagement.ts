import prisma from '../lib/prisma';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export async function recordActivity(
  userId: string,
  propertyId: string | null,
  type: string,
  metadata?: Record<string, any>,
) {
  if (DEMO_MODE) return;
  try {
    await prisma.investorActivityEvent.create({
      data: {
        userId,
        propertyId,
        type,
        metadata: metadata || undefined,
      },
    });

    await recomputeEngagement(userId);
  } catch (error) {
    console.error('[Engagement] Error recording activity:', error);
  }
}

export async function recomputeEngagement(userId: string) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [recentCount, monthCount, lastEvent] = await Promise.all([
      prisma.investorActivityEvent.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.investorActivityEvent.count({
        where: { userId, createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } },
      }),
      prisma.investorActivityEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const score = recentCount * 10 + monthCount * 5;
    const lastActiveAt = lastEvent?.createdAt || null;

    const tags: string[] = [];
    if (score >= 10) tags.push('active');
    if (score >= 50) tags.push('power_user');
    if (score === 0) tags.push('dormant');
    if (lastActiveAt && lastActiveAt < new Date(now.getTime() - 14 * 86400000)) {
      tags.push('at_risk');
    }

    await prisma.investorEngagementStatus.upsert({
      where: { userId },
      update: { score, lastActiveAt, tags },
      create: { userId, score, lastActiveAt, tags },
    });
  } catch (error) {
    console.error('[Engagement] Error recomputing engagement:', error);
  }
}

export async function recomputeAllEngagement() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
    });

    for (const user of users) {
      await recomputeEngagement(user.id);
    }

    console.log(`[Engagement] Recomputed engagement for ${users.length} users`);
    return { usersProcessed: users.length };
  } catch (error) {
    console.error('[Engagement] Error recomputing all engagement:', error);
    throw error;
  }
}

export async function checkAtRiskAndNotify() {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

    const atRiskStatuses = await prisma.investorEngagementStatus.findMany({
      where: {
        lastActiveAt: { lt: fourteenDaysAgo },
      },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    let notificationsCreated = 0;

    for (const status of atRiskStatuses) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: status.userId,
          message: { contains: 'missed you' },
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      });

      if (!existingNotification) {
        await prisma.notification.create({
          data: {
            userId: status.userId,
            message: `We've missed you, ${status.user.firstName || 'investor'}! Check out the latest properties on Parco.`,
            status: 'UNREAD',
          },
        });
        notificationsCreated++;
      }
    }

    console.log(`[Engagement] At-risk check: ${atRiskStatuses.length} at-risk users, ${notificationsCreated} notifications created`);
    return { atRiskCount: atRiskStatuses.length, notificationsCreated };
  } catch (error) {
    console.error('[Engagement] Error checking at-risk users:', error);
    throw error;
  }
}
