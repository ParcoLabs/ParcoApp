import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
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
}

interface PropertyStats {
  totalRentalIncome: number;
  totalExpenses: number;
  netProfit: number;
  occupancyRate: number;
  totalTokenHolders: number;
}

const MOCK_APPRECIATION_DATA = [
  { month: 'Jan', value: 60 },
  { month: 'Feb', value: 65 },
  { month: 'Mar', value: 80 },
  { month: 'Apr', value: 75 },
  { month: 'May', value: 85 },
  { month: 'Jun', value: 70 },
  { month: 'Jul', value: 55 },
];

const MOCK_EARNINGS_DATA = [
  { month: 'Jan', earnings: 45, expenses: 20 },
  { month: 'Feb', earnings: 55, expenses: 25 },
  { month: 'Mar', earnings: 65, expenses: 30 },
  { month: 'Apr', earnings: 60, expenses: 28 },
  { month: 'May', earnings: 75, expenses: 35 },
  { month: 'Jun', earnings: 70, expenses: 32 },
  { month: 'Jul', earnings: 80, expenses: 38 },
];

const MOCK_HOLDER_GROWTH_DATA = [
  { month: 'Jan', holders: 45 },
  { month: 'Feb', holders: 60 },
  { month: 'Mar', holders: 75 },
  { month: 'Apr', holders: 85 },
  { month: 'May', holders: 70 },
  { month: 'Jun', holders: 55 },
  { month: 'Jul', holders: 40 },
];

export const TokenizerPostDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
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

  const getDisplayAddress = (sub: TokenizationSubmission | null) => {
    if (!sub) return 'No Property Selected';
    if (sub.propertyAddress) {
      return sub.propertyAddress;
    }
    return sub.propertyName || 'Untitled Property';
  };

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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-brand-black">Overview</h1>
        {submissions.length > 1 && (
          <select 
            className="text-sm border border-brand-sage/30 rounded-lg px-3 py-2 bg-white"
            value={activeSubmission?.id || ''}
            onChange={(e) => {
              const sub = submissions.find(s => s.id === e.target.value);
              setActiveSubmission(sub || null);
            }}
          >
            {submissions.map(sub => (
              <option key={sub.id} value={sub.id}>
                {getDisplayAddress(sub)}
              </option>
            ))}
          </select>
        )}
      </div>

      {!activeSubmission ? (
        <div className="bg-white border border-brand-sage/20 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-brand-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-building text-2xl text-brand-sage"></i>
          </div>
          <h3 className="text-lg font-bold text-brand-black mb-2">No Tokenized Properties</h3>
          <p className="text-brand-sage text-sm mb-6">Submit a property for tokenization to see your dashboard.</p>
          <button
            onClick={() => navigate('/tokenizer/my-properties')}
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
          >
            View My Properties
          </button>
        </div>
      ) : (
        <>
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Property Card */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <p className="text-sm font-bold text-brand-black mb-3">{getDisplayAddress(activeSubmission)}</p>
              <div className="aspect-video bg-brand-offWhite rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {activeSubmission.imageUrl ? (
                  <img src={activeSubmission.imageUrl} alt="Property" className="w-full h-full object-cover" />
                ) : (
                  <img 
                    src="https://picsum.photos/400/300?random=property" 
                    alt="Property" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-xs text-brand-sage">
                Current Property Value: <span className="font-bold text-brand-dark">
                  ${activeSubmission.totalValue?.toLocaleString() || '0'}
                </span>
              </p>
            </div>

            {/* Financial Stats */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              {/* Occupancy Rate */}
              <div className="mb-4">
                <p className="text-sm font-medium text-brand-sage mb-2">Occupancy Rate</p>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-deep rounded-full transition-all"
                    style={{ width: `${stats.occupancyRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-brand-sage mt-1 text-right">{stats.occupancyRate}%</p>
              </div>

              {/* Financial Summary */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-brand-sage">Total Rental Income:</span>
                  <span className="text-sm font-bold text-brand-dark">${stats.totalRentalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-brand-sage">Total Expenses:</span>
                  <span className="text-sm font-bold text-brand-dark">${stats.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-brand-sage/20">
                  <span className="text-sm font-medium text-brand-dark">Net Profit:</span>
                  <span className="text-sm font-bold text-green-600">${stats.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Token Holders & Notifications */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <div className="text-center mb-4">
                <p className="text-sm font-bold text-brand-black mb-2">Total Token Holders</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-mint flex items-center justify-center">
                    <i className="fa-solid fa-users text-brand-deep text-lg"></i>
                  </div>
                  <span className="text-3xl font-bold text-brand-black">{stats.totalTokenHolders.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-sage/20 text-center">
                <p className="text-sm font-bold text-brand-black mb-2">Notifications</p>
                <div className="w-12 h-12 rounded-full bg-brand-offWhite flex items-center justify-center mx-auto">
                  <i className="fa-solid fa-bell text-brand-sage text-lg"></i>
                </div>
                <p className="text-xs text-brand-sage mt-2">No new notifications</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Appreciation Chart */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <h3 className="text-sm font-bold text-brand-black mb-4">Appreciation</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_APPRECIATION_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#0d4f4a" 
                      strokeWidth={2}
                      dot={{ fill: '#0d4f4a', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Earnings/Expenses Chart */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <h3 className="text-sm font-bold text-brand-black mb-4">Earnings & Expenses Summary</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_EARNINGS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="earnings" fill="#0d4f4a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Token Holder Growth Chart */}
          <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
            <h3 className="text-sm font-bold text-brand-black mb-4">Token Holder Growth</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_HOLDER_GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="holders" 
                    stroke="#0d4f4a" 
                    strokeWidth={2}
                    dot={{ fill: '#0d4f4a', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
