import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useTheme } from '../../context/ThemeContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TokenizationSubmission {
  id: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  status: string;
  totalValue: number | null;
  tokenPrice: number | null;
  totalTokens: number;
  annualYield: number | null;
  monthlyRent: number | null;
  imageUrl: string | null;
  images?: string[];
  propertyId?: string | null;
}

interface ComplianceEvidence {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface ComplianceRequirement {
  id: string;
  propertyId: string;
  key: string;
  label: string;
  cadence: string;
  status: string;
  dueAt: string | null;
  notes: string | null;
  evidence: ComplianceEvidence[];
}

interface PropertyStats {
  totalRentalIncome: number;
  totalExpenses: number;
  netProfit: number;
  occupancyRate: number;
  totalTokenHolders: number;
}

const MOCK_APPRECIATION_DATA = [
  { month: 'January', value: 60 },
  { month: 'February', value: 65 },
  { month: 'March', value: 80 },
  { month: 'April', value: 75 },
  { month: 'May', value: 85 },
  { month: 'June', value: 70 },
  { month: 'July', value: 55 },
];

const MOCK_EARNINGS_DATA = [
  { month: 'January', earnings: 85, expenses: 45 },
  { month: 'February', earnings: 80, expenses: 50 },
  { month: 'March', earnings: 90, expenses: 55 },
  { month: 'April', earnings: 75, expenses: 48 },
  { month: 'May', earnings: 88, expenses: 52 },
  { month: 'June', earnings: 70, expenses: 45 },
  { month: 'July', earnings: 82, expenses: 50 },
];

const MOCK_HOLDER_GROWTH_DATA = [
  { month: 'January', holders: 60 },
  { month: 'February', holders: 70 },
  { month: 'March', holders: 80 },
  { month: 'April', holders: 75 },
  { month: 'May', holders: 60 },
  { month: 'June', holders: 50 },
  { month: 'July', holders: 35 },
];

export const TokenizerPostDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { isDark } = useTheme();
  const [submissions, setSubmissions] = useState<TokenizationSubmission[]>([]);
  const [activeSubmission, setActiveSubmission] = useState<TokenizationSubmission | null>(null);
  const [stats, setStats] = useState<PropertyStats>({
    totalRentalIncome: 5598,
    totalExpenses: 1897,
    netProfit: 3701,
    occupancyRate: 80,
    totalTokenHolders: 1500,
  });
  const [loading, setLoading] = useState(true);
  const [complianceReqs, setComplianceReqs] = useState<ComplianceRequirement[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [opsMessage, setOpsMessage] = useState<string | null>(null);
  const [offeringPacket, setOfferingPacket] = useState<any>(null);
  const [packetLoading, setPacketLoading] = useState(false);
  const [monthlyCloseRuns, setMonthlyCloseRuns] = useState<any[]>([]);
  const [monthlyCloseLoading, setMonthlyCloseLoading] = useState(false);
  const [monthlyCloseActionLoading, setMonthlyCloseActionLoading] = useState(false);
  const [distributionRuns, setDistributionRuns] = useState<any[]>([]);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [distributionActionLoading, setDistributionActionLoading] = useState(false);
  const [showDistributionForm, setShowDistributionForm] = useState(false);
  const [distPeriodStart, setDistPeriodStart] = useState('');
  const [distPeriodEnd, setDistPeriodEnd] = useState('');
  const [distTotalAmount, setDistTotalAmount] = useState('');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [servicingOverview, setServicingOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [kpiOccupancy, setKpiOccupancy] = useState('');
  const [kpiRentalIncome, setKpiRentalIncome] = useState('');
  const [kpiExpenses, setKpiExpenses] = useState('');
  const [kpiNetProfit, setKpiNetProfit] = useState('');
  const [kpiSubmitting, setKpiSubmitting] = useState(false);
  const [kpiMessage, setKpiMessage] = useState<string | null>(null);
  const [showKpiForm, setShowKpiForm] = useState(false);

  const [govNotices, setGovNotices] = useState<any[]>([]);
  const [govVotes, setGovVotes] = useState<any[]>([]);
  const [govLoading, setGovLoading] = useState(false);
  const [govActionLoading, setGovActionLoading] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [voteTitle, setVoteTitle] = useState('');
  const [voteDescription, setVoteDescription] = useState('');
  const [voteOptions, setVoteOptions] = useState<{ key: string; label: string }[]>([{ key: '', label: '' }, { key: '', label: '' }]);
  const [voteClosesAt, setVoteClosesAt] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/tokenization/my-properties', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subs = data.submissions || [];
        const publishedOrApproved = subs.filter((s: TokenizationSubmission) => 
          s.status === 'PUBLISHED' || s.status === 'APPROVED'
        );
        setSubmissions(publishedOrApproved.length > 0 ? publishedOrApproved : subs);
        setActiveSubmission(publishedOrApproved[0] || subs[0] || null);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (propId) {
      fetchCompliance(propId);
      fetchSnapshots(propId);
      fetchStatements(propId);
      fetchMonthlyClose(propId);
      fetchDistributions(propId);
      fetchServicingOverview(propId);
      fetchGovernance(propId);
    }
    if (activeSubmission?.id) {
      fetchOfferingPacket(activeSubmission.id);
    }
  }, [activeSubmission]);

  const fetchCompliance = async (propertyId: string) => {
    setComplianceLoading(true);
    try {
      const res = await fetch(`/api/servicing/property/${propertyId}/compliance`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setComplianceReqs(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching compliance:', error);
    } finally {
      setComplianceLoading(false);
    }
  };

  const fetchSnapshots = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/servicing/property/${propertyId}/captable/snapshots`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setSnapshots(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    }
  };

  const fetchStatements = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/servicing/property/${propertyId}/statements`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setStatements(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
    }
  };

  const fetchOfferingPacket = async (submissionId: string) => {
    setPacketLoading(true);
    try {
      const token = await getToken();
      const caseRes = await fetch(`/api/issuance/by-submission/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (caseRes.ok) {
        const caseJson = await caseRes.json();
        if (caseJson.data?.id) {
          const packetRes = await fetch(`/api/issuance/case/${caseJson.data.id}/offering-packet`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
          });
          if (packetRes.ok) {
            const packetJson = await packetRes.json();
            setOfferingPacket(packetJson.data);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching offering packet:', err);
    } finally {
      setPacketLoading(false);
    }
  };

  const handleTakeSnapshot = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId) return;
    setSnapshotLoading(true);
    setOpsMessage(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propId}/captable/snapshot`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        setOpsMessage(`Snapshot taken: ${json.data.totalHolders} holders, supply ${json.data.totalSupply}`);
        fetchSnapshots(propId);
      } else {
        setOpsMessage(`Error: ${json.error}`);
      }
    } catch (error) {
      setOpsMessage('Failed to take snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleGenerateStatements = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId) return;
    setStatementLoading(true);
    setOpsMessage(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propId}/statements/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        setOpsMessage(`Generated ${json.data.count} statement(s)`);
        fetchStatements(propId);
      } else {
        setOpsMessage(`Error: ${json.error}`);
      }
    } catch (error) {
      setOpsMessage('Failed to generate statements');
    } finally {
      setStatementLoading(false);
    }
  };

  const fetchMonthlyClose = async (propertyId: string) => {
    setMonthlyCloseLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propertyId}/monthly-close`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setMonthlyCloseRuns(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching monthly close:', error);
    } finally {
      setMonthlyCloseLoading(false);
    }
  };

  const handleStartMonthlyClose = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId) return;
    setMonthlyCloseActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propId}/monthly-close/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        fetchMonthlyClose(propId);
      }
    } catch (error) {
      console.error('Error starting monthly close:', error);
    } finally {
      setMonthlyCloseActionLoading(false);
    }
  };

  const handleSubmitForReview = async (reportId: string) => {
    setMonthlyCloseActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/report-run/${reportId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchMonthlyClose(propId);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
    } finally {
      setMonthlyCloseActionLoading(false);
    }
  };

  const handleApproveApproval = async (reportId: string, approvalId: string) => {
    setMonthlyCloseActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/report-run/${reportId}/approve/${approvalId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchMonthlyClose(propId);
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setMonthlyCloseActionLoading(false);
    }
  };

  const handlePublishReport = async (reportId: string) => {
    setMonthlyCloseActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/report-run/${reportId}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchMonthlyClose(propId);
      }
    } catch (error) {
      console.error('Error publishing:', error);
    } finally {
      setMonthlyCloseActionLoading(false);
    }
  };

  const fetchDistributions = async (propertyId: string) => {
    setDistributionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propertyId}/distributions`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setDistributionRuns(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching distributions:', error);
    } finally {
      setDistributionLoading(false);
    }
  };

  const handleCreateDistribution = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId || !distPeriodStart || !distPeriodEnd || !distTotalAmount) return;
    setDistributionActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propId}/distributions/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: distPeriodStart,
          periodEnd: distPeriodEnd,
          totalAmountCents: Math.round(parseFloat(distTotalAmount) * 100),
        }),
      });
      if (res.ok) {
        fetchDistributions(propId);
        setShowDistributionForm(false);
        setDistPeriodStart('');
        setDistPeriodEnd('');
        setDistTotalAmount('');
      }
    } catch (error) {
      console.error('Error creating distribution:', error);
    } finally {
      setDistributionActionLoading(false);
    }
  };

  const handleApproveDistribution = async (runId: string) => {
    setDistributionActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/distributions/${runId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchDistributions(propId);
      }
    } catch (error) {
      console.error('Error approving distribution:', error);
    } finally {
      setDistributionActionLoading(false);
    }
  };

  const handlePayDistribution = async (runId: string) => {
    setDistributionActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/distributions/${runId}/pay`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchDistributions(propId);
      }
    } catch (error) {
      console.error('Error paying distribution:', error);
    } finally {
      setDistributionActionLoading(false);
    }
  };

  const fetchServicingOverview = async (propertyId: string) => {
    setOverviewLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/servicing/property/${propertyId}/overview`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setServicingOverview(json.data || null);
      }
    } catch (error) {
      console.error('Error fetching servicing overview:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleSubmitKpi = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId) return;
    setKpiSubmitting(true);
    setKpiMessage(null);
    try {
      const token = await getToken();
      const body: any = {};
      if (kpiOccupancy) body.occupancyRate = parseFloat(kpiOccupancy);
      if (kpiRentalIncome) body.rentalIncomeCents = Math.round(parseFloat(kpiRentalIncome) * 100);
      if (kpiExpenses) body.expensesCents = Math.round(parseFloat(kpiExpenses) * 100);
      if (kpiNetProfit) body.netProfitCents = Math.round(parseFloat(kpiNetProfit) * 100);

      const res = await fetch(`/api/servicing/property/${propId}/kpi`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setKpiMessage('KPI snapshot saved successfully');
        setKpiOccupancy('');
        setKpiRentalIncome('');
        setKpiExpenses('');
        setKpiNetProfit('');
        setShowKpiForm(false);
        fetchServicingOverview(propId);
      } else {
        setKpiMessage(`Error: ${json.error}`);
      }
    } catch (error) {
      setKpiMessage('Failed to submit KPI snapshot');
    } finally {
      setKpiSubmitting(false);
    }
  };

  const fetchGovernance = async (propertyId: string) => {
    setGovLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/property/${propertyId}/governance`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setGovNotices(json.data?.notices || []);
        setGovVotes(json.data?.votes || []);
      }
    } catch (error) {
      console.error('Error fetching governance:', error);
    } finally {
      setGovLoading(false);
    }
  };

  const handleCreateNotice = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId || !noticeTitle || !noticeBody) return;
    setGovActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/property/${propId}/notices`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noticeTitle, bodyMarkdown: noticeBody }),
      });
      if (res.ok) {
        fetchGovernance(propId);
        setShowNoticeForm(false);
        setNoticeTitle('');
        setNoticeBody('');
      }
    } catch (error) {
      console.error('Error creating notice:', error);
    } finally {
      setGovActionLoading(false);
    }
  };

  const handlePublishNotice = async (noticeId: string) => {
    setGovActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/notices/${noticeId}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchGovernance(propId);
      }
    } catch (error) {
      console.error('Error publishing notice:', error);
    } finally {
      setGovActionLoading(false);
    }
  };

  const handleCreateVote = async () => {
    const propId = activeSubmission?.propertyId || activeSubmission?.id;
    if (!propId || !voteTitle || !voteDescription) return;
    const filteredOptions = voteOptions.filter(o => o.key.trim() && o.label.trim());
    if (filteredOptions.length < 2) return;
    setGovActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/property/${propId}/votes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: voteTitle,
          description: voteDescription,
          options: filteredOptions,
          closesAt: voteClosesAt || undefined,
        }),
      });
      if (res.ok) {
        fetchGovernance(propId);
        setShowVoteForm(false);
        setVoteTitle('');
        setVoteDescription('');
        setVoteOptions([{ key: '', label: '' }, { key: '', label: '' }]);
        setVoteClosesAt('');
      }
    } catch (error) {
      console.error('Error creating vote:', error);
    } finally {
      setGovActionLoading(false);
    }
  };

  const handleCloseVote = async (voteId: string) => {
    setGovActionLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/votes/${voteId}/close`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const propId = activeSubmission?.propertyId || activeSubmission?.id;
        if (propId) fetchGovernance(propId);
      }
    } catch (error) {
      console.error('Error closing vote:', error);
    } finally {
      setGovActionLoading(false);
    }
  };

  const getGovStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'PUBLISHED': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'OPEN': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'CLOSED': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getDistributionStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'APPROVED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'PAID': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getMonthlyCloseStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'IN_REVIEW': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'PUBLISHED': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getApprovalStatusIcon = (status: string) => {
    if (status === 'APPROVED') return 'fa-solid fa-circle-check text-green-500';
    return 'fa-regular fa-circle text-gray-400 dark:text-gray-600';
  };

  const hasActiveReport = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return monthlyCloseRuns.some((run: any) => {
      const runStart = new Date(run.periodStart);
      return runStart.getMonth() === currentMonth && runStart.getFullYear() === currentYear && (run.status === 'DRAFT' || run.status === 'IN_REVIEW');
    });
  };

  const activeReport = monthlyCloseRuns.find((run: any) => run.status === 'DRAFT' || run.status === 'IN_REVIEW');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'OVERDUE': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'PENDING': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getCadenceBadge = (cadence: string) => {
    switch (cadence) {
      case 'MONTHLY': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'QUARTERLY': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'SEMI_ANNUAL': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
      case 'ANNUAL': return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const formatDueDate = (dueAt: string | null) => {
    if (!dueAt) return 'No due date';
    const date = new Date(dueAt);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDisplayAddress = (sub: TokenizationSubmission | null) => {
    if (!sub) return 'No Property Selected';
    if (sub.propertyAddress) {
      return sub.propertyAddress;
    }
    return sub.propertyName || 'Untitled Property';
  };

  const chartGridColor = isDark ? '#3a3a3a' : '#e5e7eb';
  const chartAxisColor = isDark ? '#9ca3af' : '#6b7280';

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark dark:text-white">Overview</h1>

      {!activeSubmission ? (
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-brand-sage/10 dark:bg-brand-sage/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-building text-2xl text-brand-sage"></i>
          </div>
          <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-2">No Tokenized Properties</h3>
          <p className="text-brand-sage dark:text-gray-400 text-sm mb-6">Submit a property for tokenization to see your dashboard.</p>
          <button
            onClick={() => navigate('/tokenizer/my-properties')}
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
          >
            View My Properties
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
              <p className="text-lg font-bold text-brand-dark dark:text-white mb-3">
                {activeSubmission.propertyAddress || '23-45 Biscayne Bay Blvd'}
              </p>
              <div className="aspect-[4/3] bg-brand-offWhite dark:bg-[#2a2a2a] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img 
                  src={activeSubmission.imageUrl || activeSubmission.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'}
                  alt="Property" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-brand-dark dark:text-white">
                Current Property Value: <span className="font-bold">${activeSubmission.totalValue?.toLocaleString() || '0'}</span>
              </p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
              <div className="mb-5">
                <p className="text-sm font-medium text-brand-dark dark:text-white text-center mb-2">Occupancy Rate</p>
                <div className="w-full h-5 bg-brand-lightGray dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-deep rounded-full flex items-center justify-center"
                    style={{ width: `${stats.occupancyRate}%` }}
                  >
                    <span className="text-xs font-bold text-white">{stats.occupancyRate}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-dark dark:text-gray-300">Total Rental Income:</span>
                  <span className="text-sm font-bold text-brand-dark dark:text-white">${stats.totalRentalIncome.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-dark dark:text-gray-300">Total Expenses:</span>
                  <span className="text-sm font-bold text-brand-dark dark:text-white">${stats.totalExpenses.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-brand-lightGray dark:border-[#3a3a3a]">
                  <span className="text-sm font-medium text-brand-dark dark:text-white">Net Profit:</span>
                  <span className="text-sm font-bold text-brand-dark dark:text-white">${stats.netProfit.toLocaleString()}.00</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
              <div className="mb-6">
                <p className="text-lg font-bold text-brand-dark dark:text-white mb-4">Total Token holders</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-mint dark:bg-brand-deep/30 flex items-center justify-center">
                    <i className="fa-solid fa-users text-brand-deep dark:text-brand-mint text-xl"></i>
                  </div>
                  <span className="text-4xl font-bold text-brand-dark dark:text-white">{stats.totalTokenHolders.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <p className="text-lg font-bold text-brand-dark dark:text-white mb-4">Notifications</p>
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-brand-offWhite dark:bg-[#2a2a2a] flex items-center justify-center">
                    <i className="fa-regular fa-bell text-brand-sage dark:text-gray-400 text-2xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-brand-deep"></i>
                Servicing Overview
              </h3>
              <button
                onClick={() => setShowKpiForm(!showKpiForm)}
                className="text-xs font-medium px-3 py-1.5 bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all"
              >
                <i className="fa-solid fa-plus mr-1"></i>
                Record KPI
              </button>
            </div>

            {kpiMessage && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                {kpiMessage}
              </div>
            )}

            {showKpiForm && (
              <div className="mb-4 p-4 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg bg-brand-offWhite dark:bg-[#222]">
                <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-3">New KPI Snapshot</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Occupancy Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={kpiOccupancy}
                      onChange={(e) => setKpiOccupancy(e.target.value)}
                      placeholder="95"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Rental Income ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={kpiRentalIncome}
                      onChange={(e) => setKpiRentalIncome(e.target.value)}
                      placeholder="4500.00"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Expenses ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={kpiExpenses}
                      onChange={(e) => setKpiExpenses(e.target.value)}
                      placeholder="1200.00"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Net Profit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={kpiNetProfit}
                      onChange={(e) => setKpiNetProfit(e.target.value)}
                      placeholder="3300.00"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowKpiForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitKpi}
                    disabled={kpiSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    {kpiSubmitting ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      'Save KPI'
                    )}
                  </button>
                </div>
              </div>
            )}

            {overviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
              </div>
            ) : servicingOverview ? (
              <div className="space-y-4">
                {servicingOverview.latestKPI && (
                  <div>
                    <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Latest KPI</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                        <p className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase">Occupancy</p>
                        <p className="text-lg font-bold text-brand-dark dark:text-white">
                          {servicingOverview.latestKPI.occupancyRate != null ? `${servicingOverview.latestKPI.occupancyRate}%` : '—'}
                        </p>
                      </div>
                      <div className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                        <p className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase">Rental Income</p>
                        <p className="text-lg font-bold text-brand-dark dark:text-white">
                          {servicingOverview.latestKPI.rentalIncomeCents != null ? `$${(servicingOverview.latestKPI.rentalIncomeCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                      <div className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                        <p className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase">Expenses</p>
                        <p className="text-lg font-bold text-brand-dark dark:text-white">
                          {servicingOverview.latestKPI.expensesCents != null ? `$${(servicingOverview.latestKPI.expensesCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                      <div className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                        <p className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase">Net Profit</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {servicingOverview.latestKPI.netProfitCents != null ? `$${(servicingOverview.latestKPI.netProfitCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {servicingOverview.nextDueCompliance && (
                    <div className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                      <h4 className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase mb-1">Next Due Compliance</h4>
                      <p className="text-sm font-semibold text-brand-dark dark:text-white">{servicingOverview.nextDueCompliance.label}</p>
                      <p className="text-xs text-brand-sage dark:text-gray-400">
                        Due: {servicingOverview.nextDueCompliance.dueAt ? new Date(servicingOverview.nextDueCompliance.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                      </p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${getStatusColor(servicingOverview.nextDueCompliance.status)}`}>
                        {servicingOverview.nextDueCompliance.status}
                      </span>
                    </div>
                  )}

                  {servicingOverview.latestReportRuns && servicingOverview.latestReportRuns.length > 0 && (
                    <div className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                      <h4 className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase mb-1">Last Published Report</h4>
                      <p className="text-sm font-semibold text-brand-dark dark:text-white">
                        {new Date(servicingOverview.latestReportRuns[0].periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-brand-sage dark:text-gray-400">
                        Period: {new Date(servicingOverview.latestReportRuns[0].periodStart).toLocaleDateString()} – {new Date(servicingOverview.latestReportRuns[0].periodEnd).toLocaleDateString()}
                      </p>
                      {servicingOverview.latestReportRuns[0].publishedAt && (
                        <p className="text-[10px] text-brand-sage dark:text-gray-500 mt-1">
                          Published {new Date(servicingOverview.latestReportRuns[0].publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-brand-sage dark:text-gray-400">No servicing overview data available yet.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-4">Appreciation</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_APPRECIATION_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10, fill: chartAxisColor }} 
                      stroke={chartAxisColor}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} stroke={chartAxisColor} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1a1a1a' : '#fff',
                        border: `1px solid ${isDark ? '#3a3a3a' : '#e5e7eb'}`,
                        color: isDark ? '#fff' : '#173726'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#0d4f4a" 
                      strokeWidth={2}
                      dot={{ fill: '#0d4f4a', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-4">Earnings Expenses Summary</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_EARNINGS_DATA} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10, fill: chartAxisColor }} 
                      stroke={chartAxisColor}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} stroke={chartAxisColor} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1a1a1a' : '#fff',
                        border: `1px solid ${isDark ? '#3a3a3a' : '#e5e7eb'}`,
                        color: isDark ? '#fff' : '#173726'
                      }}
                    />
                    <Bar dataKey="earnings" fill="#0d4f4a" radius={[2, 2, 0, 0]} barSize={16} />
                    <Bar dataKey="expenses" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-4">Token holder growth</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_HOLDER_GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: chartAxisColor }} 
                    stroke={chartAxisColor}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} stroke={chartAxisColor} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1a1a1a' : '#fff',
                      border: `1px solid ${isDark ? '#3a3a3a' : '#e5e7eb'}`,
                      color: isDark ? '#fff' : '#173726'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="holders" 
                    stroke="#0d4f4a" 
                    strokeWidth={2}
                    dot={{ fill: '#0d4f4a', strokeWidth: 2, r: 4 }}
                    fill="rgba(13, 79, 74, 0.1)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-check text-brand-deep"></i>
                Compliance
              </h3>
              {complianceReqs.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-sage dark:text-gray-400">
                    {complianceReqs.filter(r => r.status === 'COMPLETED').length}/{complianceReqs.length} complete
                  </span>
                </div>
              )}
            </div>

            {complianceLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
              </div>
            ) : complianceReqs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-brand-sage/10 dark:bg-brand-sage/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-clipboard-check text-brand-sage text-lg"></i>
                </div>
                <p className="text-sm text-brand-sage dark:text-gray-400">No compliance requirements yet.</p>
                <p className="text-xs text-brand-sage/70 dark:text-gray-500 mt-1">Requirements are applied after tokenization is live.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complianceReqs.map((req) => (
                  <div
                    key={req.id}
                    className="border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg p-3 hover:bg-brand-offWhite dark:hover:bg-[#222] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-brand-dark dark:text-white">{req.label}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getCadenceBadge(req.cadence)}`}>
                            {req.cadence.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-brand-sage dark:text-gray-400">
                          Due: {formatDueDate(req.dueAt)}
                        </p>
                        {req.notes && (
                          <p className="text-xs text-brand-sage dark:text-gray-500 mt-1 italic">{req.notes}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {req.status === 'COMPLETED' ? (
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <i className="fa-solid fa-check text-green-600 dark:text-green-400 text-xs"></i>
                          </div>
                        ) : req.status === 'OVERDUE' ? (
                          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <i className="fa-solid fa-exclamation text-red-600 dark:text-red-400 text-xs"></i>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <i className="fa-solid fa-clock text-amber-600 dark:text-amber-400 text-xs"></i>
                          </div>
                        )}
                      </div>
                    </div>
                    {req.evidence && req.evidence.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-brand-lightGray dark:border-[#2a2a2a]">
                        <p className="text-[10px] font-semibold text-brand-sage dark:text-gray-500 uppercase mb-1">Evidence</p>
                        <div className="space-y-1">
                          {req.evidence.map((ev) => (
                            <a
                              key={ev.id}
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-brand-deep dark:text-brand-mint hover:underline"
                            >
                              <i className="fa-solid fa-paperclip text-[10px]"></i>
                              {ev.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-calendar-check text-brand-deep"></i>
                Monthly Close
              </h3>
              {activeReport && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getMonthlyCloseStatusColor(activeReport.status)}`}>
                  {activeReport.status === 'IN_REVIEW' ? 'In Review' : activeReport.status}
                </span>
              )}
            </div>

            {monthlyCloseLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {!hasActiveReport() && (
                  <button
                    onClick={handleStartMonthlyClose}
                    disabled={monthlyCloseActionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-deep hover:bg-brand-dark text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    {monthlyCloseActionLoading ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-play"></i>
                    )}
                    Start Monthly Close
                  </button>
                )}

                {activeReport && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Draft Report</h4>
                      <div className="bg-brand-offWhite dark:bg-[#222] rounded-lg p-3 max-h-48 overflow-y-auto">
                        <pre className="text-xs leading-relaxed text-brand-dark dark:text-gray-300 whitespace-pre-wrap font-sans">
                          {activeReport.draftText}
                        </pre>
                      </div>
                    </div>

                    {activeReport.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitForReview(activeReport.id)}
                        disabled={monthlyCloseActionLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                      >
                        {monthlyCloseActionLoading ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-paper-plane"></i>
                        )}
                        Submit for Review
                      </button>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Approvals</h4>
                      <div className="space-y-2">
                        {(activeReport.approvals || []).map((approval: any) => (
                          <div key={approval.id} className="flex items-center justify-between p-2.5 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                            <div className="flex items-center gap-2.5">
                              <i className={`${getApprovalStatusIcon(approval.status)} text-base`}></i>
                              <span className="text-sm font-medium text-brand-dark dark:text-white">{approval.role}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                approval.status === 'APPROVED'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}>
                                {approval.status}
                              </span>
                              {activeReport.status === 'IN_REVIEW' && approval.status !== 'APPROVED' && (
                                <button
                                  onClick={() => handleApproveApproval(activeReport.id, approval.id)}
                                  disabled={monthlyCloseActionLoading}
                                  className="text-xs font-medium text-brand-deep dark:text-brand-mint hover:underline disabled:opacity-50"
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeReport.status === 'IN_REVIEW' && (activeReport.approvals || []).every((a: any) => a.status === 'APPROVED') && (
                      <button
                        onClick={() => handlePublishReport(activeReport.id)}
                        disabled={monthlyCloseActionLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                      >
                        {monthlyCloseActionLoading ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-check-double"></i>
                        )}
                        Publish Report
                      </button>
                    )}
                  </div>
                )}

                {monthlyCloseRuns.filter((r: any) => r.status === 'PUBLISHED').length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Past Reports</h4>
                    <div className="space-y-2">
                      {monthlyCloseRuns.filter((r: any) => r.status === 'PUBLISHED').slice(0, 5).map((run: any) => (
                        <div key={run.id} className="flex items-center justify-between p-2 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                              <i className="fa-solid fa-file-circle-check text-green-600 dark:text-green-400 text-xs"></i>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-brand-dark dark:text-white">
                                {new Date(run.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-brand-sage dark:text-gray-400">
                                Published {run.publishedAt ? new Date(run.publishedAt).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            PUBLISHED
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-money-bill-transfer text-brand-deep"></i>
                Distributions
              </h3>
              <button
                onClick={() => setShowDistributionForm(!showDistributionForm)}
                className="text-xs font-medium px-3 py-1.5 bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all"
              >
                <i className="fa-solid fa-plus mr-1"></i>
                New Distribution
              </button>
            </div>

            {showDistributionForm && (
              <div className="mb-4 p-4 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg bg-brand-offWhite dark:bg-[#222]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Period Start</label>
                    <input
                      type="date"
                      value={distPeriodStart}
                      onChange={(e) => setDistPeriodStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Period End</label>
                    <input
                      type="date"
                      value={distPeriodEnd}
                      onChange={(e) => setDistPeriodEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Total Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={distTotalAmount}
                      onChange={(e) => setDistTotalAmount(e.target.value)}
                      placeholder="2500.00"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDistributionForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDistribution}
                    disabled={distributionActionLoading || !distPeriodStart || !distPeriodEnd || !distTotalAmount}
                    className="px-4 py-1.5 text-xs font-semibold bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    {distributionActionLoading ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      'Create Distribution'
                    )}
                  </button>
                </div>
              </div>
            )}

            {distributionLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
              </div>
            ) : distributionRuns.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-brand-sage dark:text-gray-400">No distribution runs yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {distributionRuns.map((run: any) => (
                  <div key={run.id} className="border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-brand-offWhite dark:hover:bg-[#222] transition-colors"
                      onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-deep/10 dark:bg-brand-deep/20 flex items-center justify-center">
                          <i className="fa-solid fa-money-bill-transfer text-brand-deep text-sm"></i>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-dark dark:text-white">
                            {new Date(run.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(run.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-brand-sage dark:text-gray-400">
                            ${(run.totalAmountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} · {run.lineItems?.length || 0} investors
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${getDistributionStatusColor(run.status)}`}>
                          {run.status}
                        </span>
                        {run.status === 'DRAFT' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveDistribution(run.id); }}
                            disabled={distributionActionLoading}
                            className="text-xs font-medium px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {run.status === 'APPROVED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePayDistribution(run.id); }}
                            disabled={distributionActionLoading}
                            className="text-xs font-medium px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50"
                          >
                            Pay
                          </button>
                        )}
                        <i className={`fa-solid fa-chevron-${expandedRunId === run.id ? 'up' : 'down'} text-brand-sage dark:text-gray-500 text-xs`}></i>
                      </div>
                    </div>

                    {expandedRunId === run.id && run.lineItems && (
                      <div className="border-t border-brand-lightGray dark:border-[#2a2a2a] p-3 bg-brand-offWhite dark:bg-[#222]">
                        <h4 className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Line Item Breakdown</h4>
                        <div className="space-y-2">
                          {run.lineItems.map((item: any) => {
                            const name = item.user
                              ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.email
                              : item.metadata?.name || item.userId;
                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 border border-brand-lightGray dark:border-[#3a3a3a] rounded-lg bg-white dark:bg-[#1a1a1a]">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-brand-sage/10 dark:bg-brand-sage/20 flex items-center justify-center">
                                    <i className="fa-solid fa-user text-brand-sage text-[10px]"></i>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-brand-dark dark:text-white">{name}</p>
                                    {item.metadata?.tokens && (
                                      <p className="text-[10px] text-brand-sage dark:text-gray-500">{item.metadata.tokens} tokens</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-brand-dark dark:text-white">
                                    ${(item.amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                                    item.status === 'SENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-landmark text-brand-deep"></i>
                Governance
              </h3>
            </div>

            {govLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-brand-dark dark:text-white">Notices</h4>
                    <button
                      onClick={() => setShowNoticeForm(!showNoticeForm)}
                      className="text-xs font-medium px-3 py-1.5 bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all"
                    >
                      <i className="fa-solid fa-plus mr-1"></i>New Notice
                    </button>
                  </div>

                  {showNoticeForm && (
                    <div className="mb-3 p-4 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg bg-brand-offWhite dark:bg-[#222]">
                      <div className="space-y-3 mb-3">
                        <div>
                          <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Title</label>
                          <input
                            type="text"
                            value={noticeTitle}
                            onChange={(e) => setNoticeTitle(e.target.value)}
                            placeholder="Notice title"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Body (Markdown)</label>
                          <textarea
                            value={noticeBody}
                            onChange={(e) => setNoticeBody(e.target.value)}
                            placeholder="Notice body content..."
                            rows={4}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowNoticeForm(false)}
                          className="px-3 py-1.5 text-xs font-medium text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateNotice}
                          disabled={govActionLoading || !noticeTitle || !noticeBody}
                          className="px-4 py-1.5 text-xs font-semibold bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all disabled:opacity-50"
                        >
                          {govActionLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Create Notice'}
                        </button>
                      </div>
                    </div>
                  )}

                  {govNotices.length === 0 ? (
                    <p className="text-xs text-brand-sage dark:text-gray-500">No notices yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {govNotices.map((notice: any) => (
                        <div key={notice.id} className="flex items-center justify-between p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-brand-dark dark:text-white truncate">{notice.title}</p>
                            <p className="text-[10px] text-brand-sage dark:text-gray-400 truncate">{notice.bodyMarkdown?.substring(0, 80)}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${getGovStatusColor(notice.status)}`}>
                              {notice.status}
                            </span>
                            {notice.status === 'DRAFT' && (
                              <button
                                onClick={() => handlePublishNotice(notice.id)}
                                disabled={govActionLoading}
                                className="text-xs font-medium px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                              >
                                Publish
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-lightGray dark:border-[#2a2a2a] pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-brand-dark dark:text-white">Votes</h4>
                    <button
                      onClick={() => setShowVoteForm(!showVoteForm)}
                      className="text-xs font-medium px-3 py-1.5 bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all"
                    >
                      <i className="fa-solid fa-plus mr-1"></i>New Vote
                    </button>
                  </div>

                  {showVoteForm && (
                    <div className="mb-3 p-4 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg bg-brand-offWhite dark:bg-[#222]">
                      <div className="space-y-3 mb-3">
                        <div>
                          <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Title</label>
                          <input
                            type="text"
                            value={voteTitle}
                            onChange={(e) => setVoteTitle(e.target.value)}
                            placeholder="Vote title"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Description</label>
                          <textarea
                            value={voteDescription}
                            onChange={(e) => setVoteDescription(e.target.value)}
                            placeholder="Vote description..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Options</label>
                          <div className="space-y-2">
                            {voteOptions.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt.key}
                                  onChange={(e) => {
                                    const updated = [...voteOptions];
                                    updated[idx] = { ...updated[idx], key: e.target.value };
                                    setVoteOptions(updated);
                                  }}
                                  placeholder="Key (e.g. yes)"
                                  className="w-1/3 px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => {
                                    const updated = [...voteOptions];
                                    updated[idx] = { ...updated[idx], label: e.target.value };
                                    setVoteOptions(updated);
                                  }}
                                  placeholder="Label (e.g. Yes, approve)"
                                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                                />
                                {voteOptions.length > 2 && (
                                  <button
                                    onClick={() => setVoteOptions(voteOptions.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700 text-xs p-1"
                                  >
                                    <i className="fa-solid fa-xmark"></i>
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => setVoteOptions([...voteOptions, { key: '', label: '' }])}
                              className="text-xs text-brand-deep hover:text-brand-dark font-medium"
                            >
                              <i className="fa-solid fa-plus mr-1"></i>Add Option
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-brand-sage dark:text-gray-400 uppercase block mb-1">Closes At (optional)</label>
                          <input
                            type="datetime-local"
                            value={voteClosesAt}
                            onChange={(e) => setVoteClosesAt(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-brand-dark dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowVoteForm(false)}
                          className="px-3 py-1.5 text-xs font-medium text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateVote}
                          disabled={govActionLoading || !voteTitle || !voteDescription || voteOptions.filter(o => o.key.trim() && o.label.trim()).length < 2}
                          className="px-4 py-1.5 text-xs font-semibold bg-brand-deep hover:bg-brand-dark text-white rounded-lg transition-all disabled:opacity-50"
                        >
                          {govActionLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Create Vote'}
                        </button>
                      </div>
                    </div>
                  )}

                  {govVotes.length === 0 ? (
                    <p className="text-xs text-brand-sage dark:text-gray-500">No votes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {govVotes.map((vote: any) => (
                        <div key={vote.id} className="p-3 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-brand-dark dark:text-white">{vote.title}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${getGovStatusColor(vote.status)}`}>
                                {vote.status}
                              </span>
                              {vote.status === 'OPEN' && (
                                <button
                                  onClick={() => handleCloseVote(vote.id)}
                                  disabled={govActionLoading}
                                  className="text-xs font-medium px-2.5 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                                >
                                  Close
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-brand-sage dark:text-gray-400 mb-1">{vote.description}</p>
                          <div className="flex items-center gap-3 text-[10px] text-brand-sage dark:text-gray-500">
                            <span>{vote._count?.ballots ?? vote.ballots?.length ?? 0} ballot(s)</span>
                            {vote.closesAt && (
                              <span>Closes {new Date(vote.closesAt).toLocaleDateString()}</span>
                            )}
                            <span>Options: {(vote.options || []).map((o: any) => o.label).join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-users-gear text-brand-deep"></i>
                Investor Ops
              </h3>
            </div>

            {opsMessage && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                {opsMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={handleTakeSnapshot}
                disabled={snapshotLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-deep hover:bg-brand-dark text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
              >
                {snapshotLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-camera"></i>
                )}
                Take Snapshot
              </button>
              <button
                onClick={handleGenerateStatements}
                disabled={statementLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-sage/20 hover:bg-brand-sage/30 text-brand-dark dark:text-white rounded-lg font-semibold text-sm transition-all border border-brand-sage/30 disabled:opacity-50"
              >
                {statementLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-file-invoice"></i>
                )}
                Generate Statements
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Recent Snapshots</h4>
                {snapshots.length === 0 ? (
                  <p className="text-xs text-brand-sage dark:text-gray-500">No snapshots yet.</p>
                ) : (
                  <div className="space-y-2">
                    {snapshots.slice(0, 5).map((snap: any) => (
                      <div key={snap.id} className="flex items-center justify-between p-2 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-deep/10 dark:bg-brand-deep/20 flex items-center justify-center">
                            <i className="fa-solid fa-table-list text-brand-deep text-xs"></i>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-brand-dark dark:text-white">{snap.totalHolders} holders</p>
                            <p className="text-[10px] text-brand-sage dark:text-gray-400">Supply: {snap.totalSupply}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-brand-sage dark:text-gray-500">{new Date(snap.asOf).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-brand-sage dark:text-gray-400 uppercase mb-2">Recent Statements</h4>
                {statements.length === 0 ? (
                  <p className="text-xs text-brand-sage dark:text-gray-500">No statements generated yet.</p>
                ) : (
                  <div className="space-y-2">
                    {statements.slice(0, 5).map((stmt: any) => (
                      <div key={stmt.id} className="flex items-center justify-between p-2 border border-brand-lightGray dark:border-[#2a2a2a] rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <i className="fa-solid fa-file-lines text-green-600 dark:text-green-400 text-xs"></i>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-brand-dark dark:text-white">
                              {new Date(stmt.periodStart).toLocaleDateString()} – {new Date(stmt.periodEnd).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-brand-sage dark:text-gray-500">{new Date(stmt.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {offeringPacket && (
            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-file-lines text-brand-deep"></i>
                  Offering Packet
                </h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  offeringPacket.status === 'PUBLISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  offeringPacket.status === 'READY' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  'bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-400'
                }`}>
                  {offeringPacket.status}
                </span>
              </div>
              <div className="bg-brand-offWhite dark:bg-[#222] rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="text-xs leading-relaxed text-brand-dark dark:text-gray-300">
                  {offeringPacket.markdown.split('\n').map((line: string, i: number) => {
                    if (line.startsWith('# ')) return <h1 key={i} className="text-base font-bold text-brand-dark dark:text-white mb-2">{line.slice(2)}</h1>;
                    if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-brand-dark dark:text-white mb-1 mt-3">{line.slice(3)}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-semibold text-brand-dark dark:text-white mb-1 mt-2">{line.slice(4)}</h3>;
                    if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-brand-sage/40 pl-2 text-[10px] text-brand-sage my-1">{line.slice(2)}</blockquote>;
                    if (line.startsWith('---')) return <hr key={i} className="border-brand-lightGray dark:border-[#444] my-2" />;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-xs">{line.slice(2)}</li>;
                    if (line.startsWith('| ') && line.includes('---')) return null;
                    if (line.startsWith('| ')) {
                      const cells = line.split('|').filter(Boolean).map(c => c.trim());
                      return (
                        <div key={i} className="flex gap-2 px-1 text-xs">
                          {cells.map((cell, j) => (
                            <span key={j} className={j === 0 ? 'font-medium min-w-[120px]' : 'flex-1'}>{cell.replace(/\*\*/g, '')}</span>
                          ))}
                        </div>
                      );
                    }
                    if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="italic text-brand-sage text-[10px]">{line.replace(/\*/g, '')}</p>;
                    if (line.trim() === '') return <div key={i} className="h-1" />;
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
              <p className="text-[10px] text-brand-sage mt-2 text-right">
                Last updated: {new Date(offeringPacket.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
