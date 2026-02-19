import prisma from '../lib/prisma';

type Track = 'SERIES_LLC' | 'REG_CF' | 'REG_A' | 'REG_D';

const BASE_CRITICAL_KEYS = [
  'property_address',
  'property_state',
  'entity_name',
  'entity_state',
  'estimated_property_value',
  'ownership_evidence_present',
];

const TRACK_EXTRA_KEYS: Record<string, string[]> = {
  REG_D: ['rent_estimate_monthly', 'expense_estimate_monthly'],
  REG_CF: ['rent_estimate_monthly'],
  REG_A: ['rent_estimate_monthly', 'expense_estimate_monthly'],
};

export function getCriticalKeys(track: string): string[] {
  const extra = TRACK_EXTRA_KEYS[track] || [];
  return [...BASE_CRITICAL_KEYS, ...extra];
}

export interface CriticalFieldsCheckResult {
  passed: boolean;
  missingKeys: string[];
  verifiedKeys: string[];
  totalRequired: number;
}

export async function checkCriticalFieldsVerified(
  caseId: string,
  track: string,
): Promise<CriticalFieldsCheckResult> {
  const criticalKeys = getCriticalKeys(track);

  const verifiedFields = await (prisma as any).verifiedField.findMany({
    where: { caseId },
    select: { key: true },
  });

  const verifiedKeySet = new Set(verifiedFields.map((f: any) => f.key));
  const verifiedKeys = criticalKeys.filter(k => verifiedKeySet.has(k));
  const missingKeys = criticalKeys.filter(k => !verifiedKeySet.has(k));

  return {
    passed: missingKeys.length === 0,
    missingKeys,
    verifiedKeys,
    totalRequired: criticalKeys.length,
  };
}
