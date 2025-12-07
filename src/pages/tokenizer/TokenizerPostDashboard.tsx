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
  images?: string[];
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
      <h1 className="text-2xl font-bold text-brand-black">Overview</h1>

      {!activeSubmission ? (
        <div className="bg-white border border-brand-sage/20 rounded-xl p-12 text-center">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property Card */}
            <div className="bg-white border border-brand-lightGray rounded-xl p-5">
              <p className="text-lg font-bold text-brand-black mb-3">
                {activeSubmission.propertyAddress || '23-45 Biscayne Bay Blvd'}
              </p>
              <div className="aspect-[4/3] bg-brand-offWhite rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img 
                  src={activeSubmission.imageUrl || activeSubmission.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'}
                  alt="Property" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-brand-dark">
                Current Property Value: <span className="font-bold">${activeSubmission.totalValue?.toLocaleString() || '0'}</span>
              </p>
            </div>

            {/* Financial Stats */}
            <div className="bg-white border border-brand-lightGray rounded-xl p-5">
              {/* Occupancy Rate */}
              <div className="mb-5">
                <p className="text-sm font-medium text-brand-dark text-center mb-2">Occupancy Rate</p>
                <div className="w-full h-5 bg-brand-lightGray rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-deep rounded-full flex items-center justify-center"
                    style={{ width: `${stats.occupancyRate}%` }}
                  >
                    <span className="text-xs font-bold text-white">{stats.occupancyRate}%</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-dark">Total Rental Income:</span>
                  <span className="text-sm font-bold text-brand-dark">${stats.totalRentalIncome.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-dark">Total Expenses:</span>
                  <span className="text-sm font-bold text-brand-dark">${stats.totalExpenses.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-brand-lightGray">
                  <span className="text-sm font-medium text-brand-dark">Net Profit:</span>
                  <span className="text-sm font-bold text-brand-dark">${stats.netProfit.toLocaleString()}.00</span>
                </div>
              </div>
            </div>

            {/* Token Holders & Notifications */}
            <div className="bg-white border border-brand-lightGray rounded-xl p-5">
              <div className="mb-6">
                <p className="text-lg font-bold text-brand-dark mb-4">Total Token holders</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-mint flex items-center justify-center">
                    <i className="fa-solid fa-users text-brand-deep text-xl"></i>
                  </div>
                  <span className="text-4xl font-bold text-brand-black">{stats.totalTokenHolders.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <p className="text-lg font-bold text-brand-dark mb-4">Notifications</p>
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-brand-offWhite flex items-center justify-center">
                    <i className="fa-regular fa-bell text-brand-sage text-2xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appreciation Chart */}
            <div className="bg-white border border-brand-lightGray rounded-xl p-5">
              <h3 className="text-lg font-bold text-brand-black mb-4">Appreciation</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_APPRECIATION_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10 }} 
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" domain={[0, 100]} />
                    <Tooltip />
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

            {/* Earnings/Expenses Chart */}
            <div className="bg-white border border-brand-lightGray rounded-xl p-5">
              <h3 className="text-lg font-bold text-brand-black mb-4">Earnings Expenses Summary</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_EARNINGS_DATA} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10 }} 
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="earnings" fill="#0d4f4a" radius={[2, 2, 0, 0]} barSize={16} />
                    <Bar dataKey="expenses" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Token Holder Growth Chart */}
          <div className="bg-white border border-brand-lightGray rounded-xl p-5">
            <h3 className="text-lg font-bold text-brand-black mb-4">Token holder growth</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_HOLDER_GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }} 
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip />
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
        </>
      )}
    </div>
  );
};
