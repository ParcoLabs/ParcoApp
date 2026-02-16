import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function getDatabaseUrl(): string {
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, DATABASE_URL } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const password = encodeURIComponent(PGPASSWORD);
    return `postgresql://${PGUSER}:${password}@${PGHOST}:${PGPORT || '5432'}/${PGDATABASE}?sslmode=require`;
  }
  return DATABASE_URL!;
}

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding issuance roadmap data...');

  const templates = [
    {
      track: 'SERIES_LLC' as const,
      name: 'Series LLC Tokenization',
      description: 'Standard Series LLC structure for real estate tokenization. Each property is held in a separate series under a master LLC.',
      rules: {
        requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY'],
        criticalKeys: ['title_clear', 'llc_formation', 'operating_agreement', 'property_appraisal'],
        approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
        defaultPriceCapCents: 500_000_00,
        maxInvestors: null,
        accreditationRequired: false,
      },
    },
    {
      track: 'REG_D' as const,
      name: 'Regulation D (506b/506c)',
      description: 'SEC Regulation D offering for accredited investors. Supports both 506(b) and 506(c) exemptions.',
      rules: {
        requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY', 'IDENTITY'],
        criticalKeys: ['accreditation_verification', 'ppm_filing', 'form_d_sec', 'subscription_agreement'],
        approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
        defaultPriceCapCents: null,
        maxInvestors: 99,
        accreditationRequired: true,
      },
    },
    {
      track: 'REG_CF' as const,
      name: 'Regulation Crowdfunding',
      description: 'SEC Regulation Crowdfunding for raising up to $5M from retail and accredited investors through a registered portal.',
      rules: {
        requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY'],
        criticalKeys: ['form_c_filing', 'portal_agreement', 'financial_statements_reviewed', 'investor_limits'],
        approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
        defaultPriceCapCents: 5_000_000_00,
        maxInvestors: null,
        accreditationRequired: false,
      },
    },
    {
      track: 'REG_A' as const,
      name: 'Regulation A+ (Tier 1/Tier 2)',
      description: 'SEC Regulation A+ mini-IPO for raising up to $75M. Requires SEC qualification and ongoing reporting.',
      rules: {
        requiredDocTypes: ['OWNERSHIP', 'LEGAL', 'FINANCIAL', 'PROPERTY', 'IDENTITY'],
        criticalKeys: ['form_1a_filing', 'sec_qualification', 'audited_financials', 'offering_circular'],
        approvals: ['OPS', 'LEGAL', 'ACCOUNTING', 'COMPLIANCE'],
        defaultPriceCapCents: 75_000_000_00,
        maxInvestors: null,
        accreditationRequired: false,
      },
    },
  ];

  for (const template of templates) {
    await prisma.issuanceTemplate.upsert({
      where: { track: template.track },
      update: {
        name: template.name,
        description: template.description,
        rules: template.rules,
      },
      create: template,
    });
    console.log(`  Upserted IssuanceTemplate: ${template.name}`);
  }

  const stateProfiles = [
    {
      state: 'NV' as const,
      isEnabled: true,
      notes: 'Nevada - favorable Series LLC laws with strong asset protection. No state income tax.',
      rules: {
        formationFee: 425,
        annualFee: 350,
        registeredAgentRequired: true,
        seriesNoticeRequired: true,
        separateEINPerSeries: true,
        stateTaxRate: 0,
      },
    },
    {
      state: 'FL' as const,
      isEnabled: true,
      notes: 'Florida - Series LLC recognized since 2023. No state income tax. Growing real estate market.',
      rules: {
        formationFee: 125,
        annualFee: 138.75,
        registeredAgentRequired: true,
        seriesNoticeRequired: true,
        separateEINPerSeries: true,
        stateTaxRate: 0,
      },
    },
    {
      state: 'WY' as const,
      isEnabled: true,
      notes: 'Wyoming - pioneer of Series LLC legislation. Strong privacy protections and low fees.',
      rules: {
        formationFee: 100,
        annualFee: 60,
        registeredAgentRequired: true,
        seriesNoticeRequired: true,
        separateEINPerSeries: true,
        stateTaxRate: 0,
      },
    },
    {
      state: 'OTHER' as const,
      isEnabled: false,
      notes: 'Placeholder for states not yet profiled. Requires manual review.',
      rules: {
        formationFee: null,
        annualFee: null,
        registeredAgentRequired: true,
        seriesNoticeRequired: null,
        separateEINPerSeries: null,
        stateTaxRate: null,
      },
    },
  ];

  for (const profile of stateProfiles) {
    await prisma.stateSeriesLlcProfile.upsert({
      where: { state: profile.state },
      update: {
        isEnabled: profile.isEnabled,
        notes: profile.notes,
        rules: profile.rules,
      },
      create: profile,
    });
    console.log(`  Upserted StateSeriesLlcProfile: ${profile.state} (enabled=${profile.isEnabled})`);
  }

  const compliancePacks = [
    {
      track: 'SERIES_LLC' as const,
      name: 'Series LLC Servicing Standard',
      rules: {
        requirements: [
          { key: 'monthly_kpi', label: 'Monthly KPI Report', cadence: 'MONTHLY' },
          { key: 'quarterly_ops_update', label: 'Quarterly Operations Update', cadence: 'QUARTERLY' },
          { key: 'annual_summary', label: 'Annual Financial Summary', cadence: 'ANNUAL' },
        ],
      },
    },
    {
      track: 'REG_D' as const,
      name: 'Reg D Servicing Standard',
      rules: {
        requirements: [
          { key: 'monthly_kpi', label: 'Monthly KPI Report', cadence: 'MONTHLY' },
          { key: 'quarterly_ops_update', label: 'Quarterly Operations Update', cadence: 'QUARTERLY' },
          { key: 'annual_summary', label: 'Annual Financial Summary', cadence: 'ANNUAL' },
          { key: 'investor_notice', label: 'Annual Investor Notice', cadence: 'ANNUAL' },
          { key: 'transfer_restriction_review', label: 'Transfer Restriction Review', cadence: 'SEMI_ANNUAL' },
        ],
      },
    },
    {
      track: 'REG_CF' as const,
      name: 'Reg CF Servicing Standard',
      rules: {
        requirements: [
          { key: 'monthly_kpi', label: 'Monthly KPI Report', cadence: 'MONTHLY' },
          { key: 'quarterly_disclosure', label: 'Quarterly Disclosure Report', cadence: 'QUARTERLY' },
          { key: 'annual_summary', label: 'Annual Financial Summary', cadence: 'ANNUAL' },
          { key: 'annual_sec_filing', label: 'Annual SEC Filing Update', cadence: 'ANNUAL' },
          { key: 'investor_communication', label: 'Investor Communication Log', cadence: 'QUARTERLY' },
        ],
      },
    },
    {
      track: 'REG_A' as const,
      name: 'Reg A+ Servicing Standard',
      rules: {
        requirements: [
          { key: 'monthly_kpi', label: 'Monthly KPI Report', cadence: 'MONTHLY' },
          { key: 'quarterly_disclosure', label: 'Quarterly Disclosure Report', cadence: 'QUARTERLY' },
          { key: 'semi_annual_financials', label: 'Semi-Annual Financial Statements', cadence: 'SEMI_ANNUAL' },
          { key: 'annual_summary', label: 'Annual Financial Summary', cadence: 'ANNUAL' },
          { key: 'annual_sec_reporting', label: 'Annual SEC Ongoing Reporting', cadence: 'ANNUAL' },
          { key: 'investor_notice', label: 'Annual Investor Notice', cadence: 'ANNUAL' },
        ],
      },
    },
  ];

  for (const pack of compliancePacks) {
    await prisma.compliancePackTemplate.upsert({
      where: { track: pack.track },
      update: {
        name: pack.name,
        rules: pack.rules,
      },
      create: pack,
    });
    console.log(`  Upserted CompliancePackTemplate: ${pack.name}`);
  }

  console.log('Issuance roadmap seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
