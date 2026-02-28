import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { getCriticalKeys } from './criticalFields';

interface FieldMap {
  [key: string]: string;
}

const TRACK_LABELS: Record<string, string> = {
  SERIES_LLC: 'Series LLC',
  REG_D: 'Regulation D (506(b)/506(c))',
  REG_CF: 'Regulation Crowdfunding (Reg CF)',
  REG_A: 'Regulation A+ (Tier 2)',
};

const TRACK_INVESTOR_RIGHTS: Record<string, string[]> = {
  SERIES_LLC: [
    'Membership interest in the Series LLC corresponding to the property',
    'Pro-rata share of net rental income distributions',
    'Voting rights on major property decisions (sale, refinance)',
    'Right to transfer tokens subject to platform transfer policies',
  ],
  REG_D: [
    'Security token representing fractional ownership',
    'Pro-rata share of net rental income and appreciation',
    'Transfer restricted to accredited investors only',
    'Subject to a 12-month lockup from date of issuance',
    'Voting rights on material property decisions',
  ],
  REG_CF: [
    'Security token representing fractional ownership',
    'Pro-rata share of net rental income distributions',
    'Transfer restricted per SEC Regulation CF rules',
    'Annual investment limits apply based on income/net worth',
  ],
  REG_A: [
    'Security token representing fractional ownership qualified under Reg A+',
    'Pro-rata share of net rental income and capital gains',
    'Tokens freely transferable after issuance (subject to platform policies)',
    'Voting rights on major property decisions',
  ],
};

const RISK_FACTORS = [
  'Real estate investments are illiquid and subject to market fluctuations',
  'Rental income is not guaranteed and may vary with occupancy and market conditions',
  'Property values may decline due to economic, environmental, or regulatory factors',
  'Token transfers may be restricted by applicable securities regulations',
  'The platform operator may cease operations, potentially affecting servicing',
  'Tax treatment of tokenized real estate may change based on evolving regulations',
  'Smart contract vulnerabilities could affect token functionality',
];

function hasOpenAIKey(): boolean {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function buildFieldMap(verifiedFields: any[], extractedFields: any[]): FieldMap {
  const map: FieldMap = {};

  for (const vf of verifiedFields) {
    map[vf.key] = vf.value;
  }

  for (const ef of extractedFields) {
    if (!map[ef.key]) {
      map[ef.key] = ef.value;
    }
  }

  return map;
}

function formatCurrency(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function buildRawMarkdown(
  fields: FieldMap,
  track: string,
  transferPolicy: any,
  complianceTemplate: any,
  capabilities: any,
): string {
  const trackLabel = TRACK_LABELS[track] || track;
  const rights = TRACK_INVESTOR_RIGHTS[track] || TRACK_INVESTOR_RIGHTS.SERIES_LLC;

  const address = [
    fields.property_address,
    fields.property_city,
    fields.property_state,
    fields.property_zip,
  ].filter(Boolean).join(', ') || 'Not available';

  const entityName = fields.entity_name || 'Not available';
  const entityState = fields.entity_state || 'Not available';
  const propertyValue = fields.estimated_property_value ? formatCurrency(fields.estimated_property_value) : 'Not available';
  const rentEstimate = fields.rent_estimate_monthly ? formatCurrency(fields.rent_estimate_monthly) : null;
  const expenseEstimate = fields.expense_estimate_monthly ? formatCurrency(fields.expense_estimate_monthly) : null;

  let md = `# Offering Packet — ${entityName}\n\n`;
  md += `> **Status:** DRAFT — For internal review only. Not for distribution to investors.\n\n`;
  md += `---\n\n`;

  md += `## 1. Overview\n\n`;
  md += `This offering packet summarizes the tokenized real estate investment opportunity for the property held by **${entityName}**, `;
  md += `structured as a **${trackLabel}** offering on the Parco platform.\n\n`;

  md += `## 2. Property Details\n\n`;
  md += `| Field | Value |\n|-------|-------|\n`;
  md += `| **Address** | ${address} |\n`;
  md += `| **Estimated Value** | ${propertyValue} |\n`;
  if (rentEstimate) md += `| **Est. Monthly Rent** | ${rentEstimate} |\n`;
  if (expenseEstimate) md += `| **Est. Monthly Expenses** | ${expenseEstimate} |\n`;
  if (fields.ownership_evidence_present) md += `| **Ownership Evidence** | ${fields.ownership_evidence_present} |\n`;
  md += `\n`;

  md += `## 3. Entity Structure\n\n`;
  md += `| Field | Value |\n|-------|-------|\n`;
  md += `| **Entity Name** | ${entityName} |\n`;
  md += `| **Jurisdiction** | ${entityState} |\n`;
  md += `| **Offering Type** | ${trackLabel} |\n`;
  md += `\n`;

  md += `## 4. Investor Rights & Restrictions\n\n`;
  for (const right of rights) {
    md += `- ${right}\n`;
  }
  md += `\n`;

  if (transferPolicy) {
    md += `### Transfer Policy\n\n`;
    md += `| Rule | Detail |\n|------|--------|\n`;
    md += `| **Policy Type** | ${transferPolicy.type.replace(/_/g, ' ')} |\n`;
    if (transferPolicy.lockupEndsAt) {
      md += `| **Lockup Ends** | ${new Date(transferPolicy.lockupEndsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} |\n`;
    }
    if (transferPolicy.maxHolders) {
      md += `| **Max Holders** | ${transferPolicy.maxHolders} |\n`;
    }
    if (transferPolicy.maxPerInvestorCents) {
      md += `| **Max Per Investor** | ${formatCurrency(String(transferPolicy.maxPerInvestorCents / 100))} |\n`;
    }
    md += `\n`;
  }

  if (capabilities) {
    const caps = typeof capabilities === 'string' ? JSON.parse(capabilities) : capabilities;
    if (caps && typeof caps === 'object') {
      md += `### Property Capabilities\n\n`;
      const capLabels: Record<string, string> = {
        secondaryEnabled: 'Secondary Trading',
        borrowEnabled: 'Borrow Against Tokens',
        transferRestricted: 'Transfer Restricted',
        lockupDays: 'Lockup Period (days)',
      };
      for (const [k, v] of Object.entries(caps)) {
        const label = capLabels[k] || k;
        md += `- **${label}:** ${v}\n`;
      }
      md += `\n`;
    }
  }

  md += `## 5. Servicing & Reporting\n\n`;
  if (complianceTemplate?.rules) {
    const rules = typeof complianceTemplate.rules === 'string' ? JSON.parse(complianceTemplate.rules) : complianceTemplate.rules;
    if (rules.requirements && Array.isArray(rules.requirements)) {
      md += `The following ongoing compliance and reporting obligations apply to this offering:\n\n`;
      md += `| Requirement | Cadence |\n|-------------|----------|\n`;
      for (const req of rules.requirements) {
        md += `| ${req.label || req.key} | ${req.cadence || 'As needed'} |\n`;
      }
      md += `\n`;
    }
  } else {
    md += `Servicing and reporting cadence will be determined based on the regulatory track.\n\n`;
  }

  md += `## 6. Risk Factors\n\n`;
  md += `Investors should carefully consider the following risks before investing:\n\n`;
  for (const risk of RISK_FACTORS) {
    md += `- ${risk}\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `*This document was auto-generated by the Parco platform on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. `;
  md += `It is intended as a draft for internal review and does not constitute a securities offering.*\n`;

  return md;
}

async function rewriteWithAI(rawMarkdown: string): Promise<string> {
  if (!hasOpenAIKey()) return rawMarkdown;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert securities attorney and investor relations writer. Rewrite the following offering packet draft into clear, professional, investor-friendly language. 

Rules:
- Keep ALL factual data exactly as provided (numbers, dates, addresses, entity names)
- Do NOT invent or add any information not present in the source
- Improve readability, flow, and professional tone
- Keep the markdown structure (headers, tables, lists)
- Keep the DRAFT disclaimer
- Make risk factors sound professional but clear
- Output valid markdown only`,
        },
        {
          role: 'user',
          content: rawMarkdown,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const rewritten = response.choices[0]?.message?.content;
    if (rewritten && rewritten.length > 100) {
      return rewritten;
    }
    return rawMarkdown;
  } catch (err) {
    console.error('[offeringPacket] AI rewrite failed, using raw markdown:', err);
    return rawMarkdown;
  }
}

export async function generateOfferingPacket(caseId: string): Promise<{ markdown: string; id: string }> {
  const issuanceCase = await prisma.issuanceCase.findUnique({
    where: { id: caseId },
    include: {
      submission: {
        select: { propertyId: true },
      },
    },
  });

  if (!issuanceCase) {
    throw new Error('Issuance case not found');
  }

  const verifiedFields = await (prisma as any).verifiedField.findMany({
    where: { caseId },
  });

  const extractedFields = await (prisma as any).extractedField.findMany({
    where: { caseId },
    orderBy: { confidence: 'desc' },
  });

  const fields = buildFieldMap(verifiedFields, extractedFields);

  let transferPolicy = null;
  let capabilities = null;
  if (issuanceCase.submission.propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: issuanceCase.submission.propertyId },
      select: { capabilities: true },
    });
    capabilities = property?.capabilities;

    transferPolicy = await (prisma as any).transferPolicy.findUnique({
      where: { propertyId: issuanceCase.submission.propertyId },
    });
  }

  const complianceTemplate = await (prisma as any).compliancePackTemplate.findUnique({
    where: { track: issuanceCase.track },
  });

  let markdown = buildRawMarkdown(fields, issuanceCase.track, transferPolicy, complianceTemplate, capabilities);

  markdown = await rewriteWithAI(markdown);

  const existing = await (prisma as any).offeringPacket.findUnique({
    where: { caseId },
  });

  let packet;
  if (existing) {
    packet = await (prisma as any).offeringPacket.update({
      where: { caseId },
      data: {
        markdown,
        status: 'DRAFT',
        updatedAt: new Date(),
      },
    });
  } else {
    packet = await (prisma as any).offeringPacket.create({
      data: {
        caseId,
        markdown,
        status: 'DRAFT',
      },
    });
  }

  return { markdown: packet.markdown, id: packet.id };
}
