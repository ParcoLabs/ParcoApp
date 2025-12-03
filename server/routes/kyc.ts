import express from 'express';
import crypto from 'crypto';
import { validateAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
import { isDemoMode, simulateDelay } from '../lib/demoMode';

const router = express.Router();

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level';

function createSignature(ts: number, method: string, path: string, body: string = ''): string {
  const data = ts + method + path + body;
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY || '')
    .update(data)
    .digest('hex');
}

async function sumsubRequest(method: string, path: string, body?: any): Promise<any> {
  const ts = Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = createSignature(ts, method, path, bodyStr);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-Token': SUMSUB_APP_TOKEN || '',
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': ts.toString(),
  };
  
  const response = await fetch(SUMSUB_BASE_URL + path, {
    method,
    headers,
    body: bodyStr || undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

router.get('/config', async (req, res) => {
  const demoMode = isDemoMode();
  const isConfigured = demoMode || !!(SUMSUB_APP_TOKEN && SUMSUB_SECRET_KEY);
  res.json({
    success: true,
    configured: isConfigured,
    levelName: SUMSUB_LEVEL_NAME,
    demoMode,
  });
});

router.post('/sumsub/init', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { kycVerification: true },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    let externalUserId = user.id;
    
    if (isDemoMode()) {
      await simulateDelay('fast');
      
      let kycVerification = user.kycVerification;
      if (!kycVerification) {
        kycVerification = await prisma.kYCVerification.create({
          data: {
            userId: user.id,
            status: 'APPROVED',
            level: 'VERIFIED',
            sumsubExternalId: `demo_${externalUserId}`,
            sumsubLevelName: SUMSUB_LEVEL_NAME,
            sumsubApplicantId: `demo_applicant_${externalUserId}`,
            verificationDate: new Date(),
          },
        });
        
        await prisma.user.update({
          where: { id: user.id },
          data: { kycStatus: 'VERIFIED' },
        });
      } else if (kycVerification.status !== 'APPROVED') {
        kycVerification = await prisma.kYCVerification.update({
          where: { id: kycVerification.id },
          data: {
            status: 'APPROVED',
            level: 'VERIFIED',
            verificationDate: new Date(),
          },
        });
        
        await prisma.user.update({
          where: { id: user.id },
          data: { kycStatus: 'VERIFIED' },
        });
      }
      
      return res.json({
        success: true,
        token: `demo_token_${Date.now()}`,
        userId: `demo_applicant_${externalUserId}`,
        demoMode: true,
        autoApproved: true,
      });
    }
    
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({ success: false, error: 'Sumsub not configured' });
    }
    
    let kycVerification = user.kycVerification;
    if (!kycVerification) {
      kycVerification = await prisma.kYCVerification.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          level: 'NONE',
          sumsubExternalId: externalUserId,
          sumsubLevelName: SUMSUB_LEVEL_NAME,
        },
      });
    } else if (!kycVerification.sumsubExternalId) {
      kycVerification = await prisma.kYCVerification.update({
        where: { id: kycVerification.id },
        data: {
          sumsubExternalId: externalUserId,
          sumsubLevelName: SUMSUB_LEVEL_NAME,
        },
      });
    }
    
    const tokenPath = '/resources/accessTokens/sdk';
    const tokenBody = {
      userId: externalUserId,
      levelName: SUMSUB_LEVEL_NAME,
      ttlInSecs: 600,
    };
    
    const tokenResponse = await sumsubRequest('POST', tokenPath, tokenBody);
    
    if (tokenResponse.userId) {
      await prisma.kYCVerification.update({
        where: { id: kycVerification.id },
        data: {
          sumsubApplicantId: tokenResponse.userId,
        },
      });
    }
    
    res.json({
      success: true,
      token: tokenResponse.token,
      userId: tokenResponse.userId,
    });
  } catch (error: any) {
    console.error('Error initializing Sumsub:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to initialize KYC' });
  }
});

router.get('/sumsub/status', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { kycVerification: true },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const kycVerification = user.kycVerification;
    
    if (!kycVerification) {
      return res.json({
        success: true,
        status: 'NOT_STARTED',
        level: 'NONE',
        canTrade: false,
        demoMode: isDemoMode(),
      });
    }
    
    if (isDemoMode()) {
      return res.json({
        success: true,
        status: kycVerification.status,
        level: kycVerification.level,
        canTrade: kycVerification.status === 'APPROVED',
        demoMode: true,
      });
    }
    
    if (kycVerification.sumsubApplicantId && SUMSUB_APP_TOKEN && SUMSUB_SECRET_KEY) {
      try {
        const applicantPath = `/resources/applicants/${kycVerification.sumsubApplicantId}/status`;
        const applicantStatus = await sumsubRequest('GET', applicantPath);
        
        let dbStatus = kycVerification.status;
        if (applicantStatus.reviewStatus === 'completed') {
          if (applicantStatus.reviewResult?.reviewAnswer === 'GREEN') {
            dbStatus = 'APPROVED';
          } else if (applicantStatus.reviewResult?.reviewAnswer === 'RED') {
            dbStatus = 'REJECTED';
          }
        } else if (applicantStatus.reviewStatus === 'pending') {
          dbStatus = 'IN_REVIEW';
        }
        
        if (dbStatus !== kycVerification.status) {
          await prisma.kYCVerification.update({
            where: { id: kycVerification.id },
            data: {
              status: dbStatus,
              sumsubReviewStatus: applicantStatus.reviewStatus,
              sumsubReviewResult: applicantStatus.reviewResult || null,
              level: dbStatus === 'APPROVED' ? 'VERIFIED' : kycVerification.level,
              verificationDate: dbStatus === 'APPROVED' ? new Date() : kycVerification.verificationDate,
            },
          });
          
          if (dbStatus === 'APPROVED') {
            await prisma.user.update({
              where: { id: user.id },
              data: { kycStatus: 'VERIFIED' },
            });
          }
        }
        
        return res.json({
          success: true,
          status: dbStatus,
          reviewStatus: applicantStatus.reviewStatus,
          reviewResult: applicantStatus.reviewResult,
          level: dbStatus === 'APPROVED' ? 'VERIFIED' : kycVerification.level,
          canTrade: dbStatus === 'APPROVED',
        });
      } catch (apiError) {
        console.error('Error fetching Sumsub status:', apiError);
      }
    }
    
    res.json({
      success: true,
      status: kycVerification.status,
      level: kycVerification.level,
      canTrade: kycVerification.status === 'APPROVED',
    });
  } catch (error: any) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch status' });
  }
});

router.post('/sumsub/refresh-token', validateAuth, async (req, res) => {
  try {
    const clerkId = (req as any).auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({ success: false, error: 'Sumsub not configured' });
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { kycVerification: true },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const externalUserId = user.kycVerification?.sumsubExternalId || user.id;
    
    const tokenPath = '/resources/accessTokens/sdk';
    const tokenBody = {
      userId: externalUserId,
      levelName: SUMSUB_LEVEL_NAME,
      ttlInSecs: 600,
    };
    
    const tokenResponse = await sumsubRequest('POST', tokenPath, tokenBody);
    
    res.json({
      success: true,
      token: tokenResponse.token,
    });
  } catch (error: any) {
    console.error('Error refreshing Sumsub token:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to refresh token' });
  }
});

export default router;

export async function handleSumsubWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!SUMSUB_SECRET_KEY) {
    throw new Error('Sumsub webhook secret not configured');
  }
  
  const computedSignature = crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  
  if (computedSignature !== signature) {
    throw new Error('Invalid webhook signature');
  }
  
  const event = JSON.parse(rawBody.toString('utf8'));
  
  console.log(`Sumsub webhook received: ${event.type}`);
  
  const applicantId = event.applicantId;
  const externalUserId = event.externalUserId;
  
  if (!applicantId && !externalUserId) {
    console.error('Webhook missing applicant identifiers');
    return;
  }
  
  let kycVerification;
  if (applicantId) {
    kycVerification = await prisma.kYCVerification.findUnique({
      where: { sumsubApplicantId: applicantId },
      include: { user: true },
    });
  }
  
  if (!kycVerification && externalUserId) {
    kycVerification = await prisma.kYCVerification.findFirst({
      where: { sumsubExternalId: externalUserId },
      include: { user: true },
    });
  }
  
  if (!kycVerification) {
    console.error(`KYCVerification not found for applicant: ${applicantId || externalUserId}`);
    return;
  }
  
  switch (event.type) {
    case 'applicantReviewed':
      const reviewResult = event.reviewResult;
      let status: 'APPROVED' | 'REJECTED' | 'IN_REVIEW' = 'IN_REVIEW';
      
      if (reviewResult?.reviewAnswer === 'GREEN') {
        status = 'APPROVED';
      } else if (reviewResult?.reviewAnswer === 'RED') {
        status = 'REJECTED';
      }
      
      await prisma.kYCVerification.update({
        where: { id: kycVerification.id },
        data: {
          status,
          sumsubReviewStatus: event.reviewStatus || 'completed',
          sumsubReviewResult: reviewResult || null,
          level: status === 'APPROVED' ? 'VERIFIED' : kycVerification.level,
          verificationDate: status === 'APPROVED' ? new Date() : kycVerification.verificationDate,
          rejectionReason: reviewResult?.rejectLabels?.join(', ') || null,
        },
      });
      
      if (status === 'APPROVED') {
        await prisma.user.update({
          where: { id: kycVerification.userId },
          data: { kycStatus: 'VERIFIED' },
        });
      }
      
      console.log(`KYC ${status} for user ${kycVerification.userId}`);
      break;
      
    case 'applicantPending':
      await prisma.kYCVerification.update({
        where: { id: kycVerification.id },
        data: {
          status: 'IN_REVIEW',
          sumsubReviewStatus: 'pending',
        },
      });
      console.log(`KYC pending review for user ${kycVerification.userId}`);
      break;
      
    case 'applicantCreated':
      if (event.applicantId && !kycVerification.sumsubApplicantId) {
        await prisma.kYCVerification.update({
          where: { id: kycVerification.id },
          data: {
            sumsubApplicantId: event.applicantId,
          },
        });
      }
      console.log(`Applicant created for user ${kycVerification.userId}`);
      break;
      
    default:
      console.log(`Unhandled Sumsub event: ${event.type}`);
  }
}
