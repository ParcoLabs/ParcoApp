import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ModuleStatus = 'LIVE' | 'IN BUILD' | 'LOCKED';

interface Dependency {
  label: string;
  done: boolean;
}

interface RoadmapModule {
  id: string;
  name: string;
  status: ModuleStatus;
  description: string;
  dependencies: Dependency[];
  adminLink?: string;
  category: 'issuance' | 'servicing' | 'compliance' | 'defi';
}

const modules: RoadmapModule[] = [
  {
    id: 'series_llc',
    name: 'Series LLC Issuance (NV/FL/WY)',
    status: 'LIVE',
    description: 'Multi-state Series LLC formation and tokenization pipeline with state-specific eligibility rules.',
    category: 'issuance',
    dependencies: [
      { label: 'State enablement config (NV, FL, WY)', done: true },
      { label: 'Price cap validation per state', done: true },
      { label: 'Document upload & extraction', done: true },
      { label: 'Issuance case lifecycle', done: true },
      { label: 'Eligibility engine integration', done: true },
    ],
    adminLink: '/admin/pipeline',
  },
  {
    id: 'eligibility_engine',
    name: 'Eligibility Engine',
    status: 'LIVE',
    description: 'Automated checks for state enablement, price caps, document completeness, and extraction quality.',
    category: 'issuance',
    dependencies: [
      { label: 'State/price rule definitions', done: true },
      { label: 'Document completeness scoring', done: true },
      { label: 'Extraction quality scoring', done: true },
      { label: 'Admin override capability', done: true },
    ],
    adminLink: '/admin/tokenizations',
  },
  {
    id: 'offering_packet',
    name: 'Offering Packet Generator',
    status: 'LIVE',
    description: 'Compiles verified extracted data into a structured offering packet with optional AI rewrite.',
    category: 'issuance',
    dependencies: [
      { label: 'Verified field collection', done: true },
      { label: 'Packet template structure', done: true },
      { label: 'AI rewrite integration (OpenAI)', done: true },
      { label: 'PDF export', done: false },
    ],
  },
  {
    id: 'compliance_packs',
    name: 'Compliance Packs',
    status: 'LIVE',
    description: 'Define, apply, and track compliance requirements and evidence per property with cadence scheduling.',
    category: 'compliance',
    dependencies: [
      { label: 'Requirement templates (KPI, insurance, tax)', done: true },
      { label: 'Evidence upload & review', done: true },
      { label: 'Due-soon dashboard', done: true },
      { label: 'Status tracking (PENDING/IN_PROGRESS/COMPLETED)', done: true },
      { label: 'Automated reminders', done: false },
    ],
    adminLink: '/admin/compliance',
  },
  {
    id: 'monthly_close',
    name: 'Monthly Close Workflow',
    status: 'LIVE',
    description: 'Structured DRAFT → IN_REVIEW → PUBLISHED report workflow with multi-role approval gates.',
    category: 'servicing',
    dependencies: [
      { label: 'Report run lifecycle', done: true },
      { label: 'OPS/ACCOUNTING/COMPLIANCE approvals', done: true },
      { label: 'Investor-facing published reports', done: true },
      { label: 'Period-based report history', done: true },
    ],
  },
  {
    id: 'distributions',
    name: 'Distribution Runs',
    status: 'LIVE',
    description: 'Pro-rata distribution allocation by holding, with DRAFT → APPROVED → PAID workflow.',
    category: 'servicing',
    dependencies: [
      { label: 'Pro-rata allocation engine', done: true },
      { label: 'Line-item breakdown per investor', done: true },
      { label: 'Approve/pay workflow', done: true },
      { label: 'Audit event logging', done: true },
      { label: 'On-chain settlement', done: false },
    ],
  },
  {
    id: 'investor_statements',
    name: 'Investor Statements',
    status: 'LIVE',
    description: 'Per-investor periodic statements based on holdings and rent distributions.',
    category: 'servicing',
    dependencies: [
      { label: 'Statement generation per holder', done: true },
      { label: 'Reporting center display', done: true },
      { label: 'PDF export', done: false },
    ],
  },
  {
    id: 'governance',
    name: 'Governance Notices & Votes',
    status: 'LIVE',
    description: 'Property-scoped notices (DRAFT/PUBLISHED) and votes (OPEN/CLOSED) with investor ballot casting.',
    category: 'servicing',
    dependencies: [
      { label: 'Notice create/publish workflow', done: true },
      { label: 'Vote create/close with JSON options', done: true },
      { label: 'Unique ballot constraint per user', done: true },
      { label: 'Investor governance display', done: true },
      { label: 'Weighted voting', done: false },
    ],
  },
  {
    id: 'transfer_restrictions',
    name: 'Transfer Restrictions',
    status: 'LIVE',
    description: 'Transfer policy enforcement with lockup periods, allowlist-only transfers, and max holder limits.',
    category: 'compliance',
    dependencies: [
      { label: 'TransferPolicy model', done: true },
      { label: 'Lockup period enforcement', done: true },
      { label: 'Allowlist registry', done: true },
      { label: 'RestrictedToken smart contract', done: true },
      { label: 'On-chain enforcement hooks', done: false },
    ],
  },
  {
    id: 'secondary_trading',
    name: 'Secondary Trading',
    status: 'LOCKED',
    description: 'Peer-to-peer secondary market for tokenized property shares with order book and compliance checks.',
    category: 'defi',
    dependencies: [
      { label: 'Order book engine', done: false },
      { label: 'Transfer restriction integration', done: false },
      { label: 'KYC/accreditation gating', done: false },
      { label: 'Settlement & clearing', done: false },
      { label: 'ATS broker-dealer partnership', done: false },
    ],
  },
  {
    id: 'borrow_against',
    name: 'Borrow Against Tokens',
    status: 'LOCKED',
    description: 'Collateral lending allowing investors to borrow USDC against locked property tokens.',
    category: 'defi',
    dependencies: [
      { label: 'Collateral vault contract', done: false },
      { label: 'LTV ratio management', done: false },
      { label: 'Liquidation engine', done: false },
      { label: 'Interest accrual', done: false },
      { label: 'Oracle price feeds', done: false },
    ],
  },
  {
    id: 'reg_d',
    name: 'Reg D Preset',
    status: 'LIVE',
    description: 'Automated Reg D offering configuration with accredited investor gating and transfer restrictions.',
    category: 'compliance',
    dependencies: [
      { label: 'Accreditation verification flow', done: true },
      { label: 'Transfer lockup (12-month)', done: true },
      { label: 'Max 2000 holders enforcement', done: true },
      { label: 'Allowlist-only transfers', done: true },
      { label: 'Form D filing automation', done: false },
    ],
  },
  {
    id: 'reg_cf',
    name: 'Reg CF Scaffold',
    status: 'IN BUILD',
    description: 'Regulation Crowdfunding framework for offerings up to $5M with funding portal integration.',
    category: 'compliance',
    dependencies: [
      { label: 'Investor limit calculations', done: false },
      { label: 'Funding portal connector', done: false },
      { label: 'Form C filing template', done: false },
      { label: 'Investment cap enforcement', done: false },
      { label: 'Issuance roadmap track', done: true },
    ],
  },
  {
    id: 'reg_a',
    name: 'Reg A Scaffold',
    status: 'IN BUILD',
    description: 'Regulation A+ framework for qualified offerings up to $75M with SEC qualification workflow.',
    category: 'compliance',
    dependencies: [
      { label: 'SEC qualification workflow', done: false },
      { label: 'Offering circular template', done: false },
      { label: 'Ongoing reporting requirements', done: false },
      { label: 'Transfer agent integration', done: false },
      { label: 'Issuance roadmap track', done: true },
    ],
  },
];

const statusConfig: Record<ModuleStatus, { bg: string; text: string; icon: string }> = {
  'LIVE': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: 'fa-circle-check' },
  'IN BUILD': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: 'fa-hammer' },
  'LOCKED': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: 'fa-lock' },
};

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  issuance: { label: 'Issuance', icon: 'fa-rocket', color: 'text-blue-600 dark:text-blue-400' },
  servicing: { label: 'Servicing', icon: 'fa-gears', color: 'text-purple-600 dark:text-purple-400' },
  compliance: { label: 'Compliance', icon: 'fa-shield-halved', color: 'text-brand-deep dark:text-brand-mint' },
  defi: { label: 'DeFi', icon: 'fa-coins', color: 'text-orange-600 dark:text-orange-400' },
};

export const Roadmap: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === 'all' ? modules : modules.filter(m => m.category === filter);

  const counts = {
    live: modules.filter(m => m.status === 'LIVE').length,
    inBuild: modules.filter(m => m.status === 'IN BUILD').length,
    locked: modules.filter(m => m.status === 'LOCKED').length,
  };

  const totalDeps = modules.reduce((sum, m) => sum + m.dependencies.length, 0);
  const doneDeps = modules.reduce((sum, m) => sum + m.dependencies.filter(d => d.done).length, 0);
  const progressPct = Math.round((doneDeps / totalDeps) * 100);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark dark:text-white mb-1">Platform Roadmap</h1>
        <p className="text-sm text-brand-sage dark:text-gray-400">Internal view of module readiness and dependencies</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-circle-check text-green-600 dark:text-green-400"></i>
            <span className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase">Live</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark dark:text-white">{counts.live}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-hammer text-amber-600 dark:text-amber-400"></i>
            <span className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase">In Build</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark dark:text-white">{counts.inBuild}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-lock text-gray-500 dark:text-gray-400"></i>
            <span className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase">Locked</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark dark:text-white">{counts.locked}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-list-check text-brand-deep dark:text-brand-mint"></i>
            <span className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase">Progress</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark dark:text-white">{progressPct}%</p>
          <div className="mt-2 w-full bg-gray-200 dark:bg-[#333] rounded-full h-1.5">
            <div className="bg-brand-deep h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }}></div>
          </div>
          <p className="text-[10px] text-brand-sage dark:text-gray-500 mt-1">{doneDeps}/{totalDeps} dependencies</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === 'all' ? 'bg-brand-deep text-white' : 'bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-gray-300 border border-brand-lightGray dark:border-[#2a2a2a] hover:border-brand-deep'}`}
        >
          All ({modules.length})
        </button>
        {Object.entries(categoryConfig).map(([key, cfg]) => {
          const count = modules.filter(m => m.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${filter === key ? 'bg-brand-deep text-white' : 'bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-gray-300 border border-brand-lightGray dark:border-[#2a2a2a] hover:border-brand-deep'}`}
            >
              <i className={`fa-solid ${cfg.icon} ${filter === key ? 'text-white' : cfg.color}`}></i>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map(mod => {
          const sc = statusConfig[mod.status];
          const cc = categoryConfig[mod.category];
          const isExpanded = expandedId === mod.id;
          const donePct = mod.dependencies.length > 0
            ? Math.round((mod.dependencies.filter(d => d.done).length / mod.dependencies.length) * 100)
            : 0;

          return (
            <div
              key={mod.id}
              className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : mod.id)}
                className="w-full p-4 md:p-5 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-brand-dark dark:text-white text-sm md:text-base">{mod.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sc.bg} ${sc.text}`}>
                      <i className={`fa-solid ${sc.icon} text-[8px]`}></i>
                      {mod.status}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${cc.color}`}>
                      <i className={`fa-solid ${cc.icon}`}></i>
                      {cc.label}
                    </span>
                  </div>
                  <p className="text-xs text-brand-sage dark:text-gray-400 line-clamp-1">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden md:flex items-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-[#333] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${mod.status === 'LOCKED' ? 'bg-gray-400' : 'bg-brand-deep'}`}
                        style={{ width: `${donePct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-brand-sage dark:text-gray-500 w-8">{donePct}%</span>
                  </div>
                  <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-brand-sage dark:text-gray-500 text-xs`}></i>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-brand-lightGray dark:border-[#2a2a2a]">
                  <p className="text-sm text-brand-sage dark:text-gray-400 mt-3 mb-4">{mod.description}</p>

                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-brand-dark dark:text-gray-300 uppercase mb-2">
                      Dependencies ({mod.dependencies.filter(d => d.done).length}/{mod.dependencies.length})
                    </h4>
                    <div className="space-y-1.5">
                      {mod.dependencies.map((dep, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <i className={`fa-solid ${dep.done ? 'fa-circle-check text-green-500' : 'fa-circle text-gray-300 dark:text-gray-600'} text-xs`}></i>
                          <span className={`text-sm ${dep.done ? 'text-brand-dark dark:text-gray-200' : 'text-brand-sage dark:text-gray-500'}`}>
                            {dep.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {mod.adminLink && (
                    <button
                      onClick={() => navigate(mod.adminLink!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-deep bg-brand-mint/30 dark:bg-brand-deep/20 rounded-lg hover:bg-brand-mint/50 dark:hover:bg-brand-deep/30 transition-colors"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                      Go to admin page
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
