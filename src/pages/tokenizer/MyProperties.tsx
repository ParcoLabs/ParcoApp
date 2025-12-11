import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { BrandColors } from '../../brand';

interface TokenizationSubmission {
  id: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  status: string;
  progress: number;
  updatedAt: string;
  createdAt: string;
  totalValue: number | null;
  annualYield: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_REVIEW: { label: 'In Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
  PUBLISHED: { label: 'Listed', color: 'text-purple-700', bg: 'bg-purple-100' },
};

export const MyProperties: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const [submissions, setSubmissions] = useState<TokenizationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('/api/tokenization/my-properties', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewProperty = async () => {
    try {
      setCreating(true);
      const token = await getToken();
      const response = await fetch('/api/tokenization/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create property');
      }

      const data = await response.json();
      navigate(`/tokenizer/dashboard/${data.submission.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDisplayAddress = (sub: TokenizationSubmission) => {
    if (sub.propertyAddress) {
      return `${sub.propertyAddress}, ${sub.propertyCity}, ${sub.propertyState}`;
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-brand-black">My Properties</h1>
          <p className="text-xs md:text-sm text-brand-sage mt-1">Manage your tokenization submissions</p>
        </div>
        <button
          onClick={handleStartNewProperty}
          disabled={creating}
          className="bg-brand-deep hover:bg-brand-dark text-white px-4 md:px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Creating...
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus"></i>
              Start New Property
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-lg p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-brand-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-building text-2xl text-brand-sage"></i>
          </div>
          <h3 className="text-lg font-bold text-brand-black mb-2">No Properties Yet</h3>
          <p className="text-brand-sage text-sm mb-6">Start tokenizing your first property to list it on the marketplace.</p>
          <button
            onClick={handleStartNewProperty}
            disabled={creating}
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
          >
            Start New Property
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {submissions.map((sub) => {
              const statusInfo = STATUS_LABELS[sub.status] || STATUS_LABELS.DRAFT;
              return (
                <div key={sub.id} className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-semibold text-brand-black text-sm truncate">{getDisplayAddress(sub)}</p>
                      {sub.totalValue && (
                        <p className="text-xs text-brand-sage mt-0.5">
                          ${sub.totalValue.toLocaleString()} value
                          {sub.annualYield && ` | ${sub.annualYield}% APY`}
                        </p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-brand-sage">Progress</span>
                      <span className="text-xs text-brand-sage font-medium">{sub.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-deep rounded-full transition-all"
                        style={{ width: `${sub.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-brand-sage/10">
                    <span className="text-xs text-brand-sage">Updated {formatDate(sub.updatedAt)}</span>
                    {sub.status === 'DRAFT' ? (
                      <button
                        onClick={() => navigate(`/tokenizer/dashboard/${sub.id}`)}
                        className="bg-brand-deep hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Continue
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/tokenizer/dashboard/${sub.id}`)}
                        className="bg-brand-sage/20 hover:bg-brand-sage/30 text-brand-dark px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-offWhite border-b border-brand-sage/20">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-brand-sage uppercase tracking-wide">Property Address</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-brand-sage uppercase tracking-wide">Progress</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-brand-sage uppercase tracking-wide">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-brand-sage uppercase tracking-wide">Last Updated</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-brand-sage uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-sage/10">
                  {submissions.map((sub) => {
                    const statusInfo = STATUS_LABELS[sub.status] || STATUS_LABELS.DRAFT;
                    return (
                      <tr key={sub.id} className="hover:bg-brand-offWhite/50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-brand-black text-sm">{getDisplayAddress(sub)}</p>
                            {sub.totalValue && (
                              <p className="text-xs text-brand-sage mt-0.5">
                                ${sub.totalValue.toLocaleString()} value
                                {sub.annualYield && ` | ${sub.annualYield}% APY`}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-brand-deep rounded-full transition-all"
                                style={{ width: `${sub.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-brand-sage font-medium">{sub.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-brand-sage">{formatDate(sub.updatedAt)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sub.status === 'DRAFT' ? (
                              <button
                                onClick={() => navigate(`/tokenizer/dashboard/${sub.id}`)}
                                className="bg-brand-deep hover:bg-brand-dark text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                              >
                                Continue
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/tokenizer/dashboard/${sub.id}`)}
                                className="bg-brand-sage/20 hover:bg-brand-sage/30 text-brand-dark px-3 py-1.5 rounded text-xs font-medium transition-colors"
                              >
                                View Dashboard
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
