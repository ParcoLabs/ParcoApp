import type { JobName } from './queue';
import logger from '../observability/logger';

type InlineHandler = (data: Record<string, unknown>) => Promise<void>;

const processors: Partial<Record<JobName, InlineHandler>> = {
  DOC_EXTRACT: async (data) => {
    logger.info({ caseId: data.caseId }, '[inline] DOC_EXTRACT — skipping in dev without Redis');
  },
  REPORT_DRAFT: async (data) => {
    logger.info({ caseId: data.caseId }, '[inline] REPORT_DRAFT — skipping in dev without Redis');
  },
  DISTRIBUTION_PREP: async (data) => {
    logger.info({ propertyId: data.propertyId }, '[inline] DISTRIBUTION_PREP — skipping in dev without Redis');
  },
  BLOCKCHAIN_DEPLOY: async (data) => {
    logger.info({ propertyId: data.propertyId }, '[inline] BLOCKCHAIN_DEPLOY — skipping in dev without Redis');
  },
  BLOCKCHAIN_ALLOWLIST: async (data) => {
    logger.info({ propertyId: data.propertyId }, '[inline] BLOCKCHAIN_ALLOWLIST — skipping in dev without Redis');
  },
  BLOCKCHAIN_MINT: async (data) => {
    logger.info({ propertyId: data.propertyId }, '[inline] BLOCKCHAIN_MINT — skipping in dev without Redis');
  },
};

export function getInlineProcessor(name: JobName): InlineHandler | undefined {
  return processors[name];
}
