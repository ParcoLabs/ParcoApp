import prisma from '../lib/prisma';
import { getCriticalKeys } from './criticalFields';

export interface ExtractionQualityResult {
  extractionScore: number;
  extractionQualityStatus: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' | 'PENDING';
  details: {
    totalCriticalKeys: number;
    foundKeys: number;
    missingKeys: string[];
    lowConfidenceKeys: string[];
  };
}

export async function computeExtractionQuality(caseId: string): Promise<ExtractionQualityResult> {
  const issuanceCase = await prisma.issuanceCase.findUnique({
    where: { id: caseId },
    select: { track: true },
  });

  if (!issuanceCase) {
    return {
      extractionScore: 0,
      extractionQualityStatus: 'PENDING',
      details: { totalCriticalKeys: 0, foundKeys: 0, missingKeys: [], lowConfidenceKeys: [] },
    };
  }

  const criticalKeys = getCriticalKeys(issuanceCase.track);

  const extractedFields = await (prisma as any).extractedField.findMany({
    where: { caseId },
    select: { key: true, confidence: true },
  });

  const fieldMap = new Map<string, number>();
  for (const f of extractedFields) {
    const existing = fieldMap.get(f.key);
    if (existing === undefined || f.confidence > existing) {
      fieldMap.set(f.key, f.confidence);
    }
  }

  const missingKeys: string[] = [];
  const lowConfidenceKeys: string[] = [];
  let scoreTotal = 0;

  for (const key of criticalKeys) {
    const confidence = fieldMap.get(key);
    if (confidence === undefined) {
      missingKeys.push(key);
    } else if (confidence < 0.65) {
      lowConfidenceKeys.push(key);
      scoreTotal += (confidence / 0.65) * 100;
    } else {
      scoreTotal += 100;
    }
  }

  const extractionScore = criticalKeys.length > 0
    ? Math.round(scoreTotal / criticalKeys.length)
    : 0;

  let extractionQualityStatus: ExtractionQualityResult['extractionQualityStatus'];
  if (missingKeys.length > 0) {
    extractionQualityStatus = missingKeys.length >= Math.ceil(criticalKeys.length / 2) ? 'FAIL' : 'NEEDS_REVIEW';
  } else if (lowConfidenceKeys.length > 0) {
    extractionQualityStatus = 'NEEDS_REVIEW';
  } else {
    extractionQualityStatus = 'PASS';
  }

  await prisma.issuanceCase.update({
    where: { id: caseId },
    data: { extractionScore, extractionQualityStatus },
  });

  return {
    extractionScore,
    extractionQualityStatus,
    details: {
      totalCriticalKeys: criticalKeys.length,
      foundKeys: criticalKeys.length - missingKeys.length,
      missingKeys,
      lowConfidenceKeys,
    },
  };
}
