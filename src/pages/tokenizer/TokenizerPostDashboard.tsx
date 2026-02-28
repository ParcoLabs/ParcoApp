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
