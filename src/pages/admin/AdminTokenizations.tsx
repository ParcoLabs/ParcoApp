import React, { useState, useEffect } from 'react';

interface Tokenizer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface TokenizationSubmission {
  id: string;
  tokenizerId: string;
  tokenizer: Tokenizer;
  status: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyCountry: string;
  propertyZipCode: string | null;
  propertyType: string;
  totalValue: string;
  tokenPrice: string;
  totalTokens: number;
  annualYield: string;
  monthlyRent: string | null;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  documents: string[];
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: string | null;
  yearBuilt: number | null;
  ownershipProof: string | null;
  legalDocuments: string[];
  financialStatements: string[];
  reviewedById: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  PUBLISHED: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export const AdminTokenizations: React.FC = () => {
  const [submissions, setSubmissions] = useState<TokenizationSubmission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<TokenizationSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchSubmissions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/admin/tokenizations?${params}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching tokenizations:', error);
      showToast('Failed to load tokenizations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleViewDetails = async (submission: TokenizationSubmission) => {
    try {
      const response = await fetch(`/api/admin/tokenizations/${submission.id}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedSubmission(data.submission);
        setDrawerOpen(true);
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
      showToast('Failed to load details', 'error');
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/tokenizations/${selectedSubmission.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedSubmission(data.submission);
        showToast('Tokenization approved successfully', 'success');
        fetchSubmissions(pagination?.page || 1);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to approve', 'error');
      }
    } catch (error) {
      console.error('Error approving tokenization:', error);
      showToast('Failed to approve tokenization', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/tokenizations/${selectedSubmission.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedSubmission(data.submission);
        showToast('Tokenization rejected', 'success');
        setShowRejectModal(false);
        setRejectReason('');
        fetchSubmissions(pagination?.page || 1);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to reject', 'error');
      }
    } catch (error) {
      console.error('Error rejecting tokenization:', error);
      showToast('Failed to reject tokenization', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    if (!selectedSubmission) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/tokenizations/${selectedSubmission.id}/start-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedSubmission(data.submission);
        showToast('Review started', 'success');
        fetchSubmissions(pagination?.page || 1);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to start review', 'error');
      }
    } catch (error) {
      console.error('Error starting review:', error);
      showToast('Failed to start review', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTokenizerName = (tokenizer: Tokenizer) => {
    if (tokenizer.firstName || tokenizer.lastName) {
      return `${tokenizer.firstName || ''} ${tokenizer.lastName || ''}`.trim();
    }
    return tokenizer.email;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tokenization Submissions</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep"></div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a]">
          <i className="fa-solid fa-file-contract text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-600">No tokenization submissions found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tokenizer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-building text-gray-400"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{submission.propertyName}</p>
                          <p className="text-sm text-gray-500">{submission.propertyCity}, {submission.propertyState}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{getTokenizerName(submission.tokenizer)}</p>
                      <p className="text-xs text-gray-500">{submission.tokenizer.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(submission.totalValue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(submission.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[submission.status]?.bg || 'bg-gray-100'} ${statusColors[submission.status]?.text || 'text-gray-700'}`}>
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(submission)}
                        className="text-brand-deep dark:text-brand-mint hover:underline text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchSubmissions(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchSubmissions(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {drawerOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">Submission Details</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[selectedSubmission.status]?.bg || 'bg-gray-100'} ${statusColors[selectedSubmission.status]?.text || 'text-gray-700'}`}>
                  {selectedSubmission.status}
                </span>
                <div className="flex gap-2">
                  {selectedSubmission.status === 'SUBMITTED' && (
                    <button
                      onClick={handleStartReview}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Start Review
                    </button>
                  )}
                  {(selectedSubmission.status === 'SUBMITTED' || selectedSubmission.status === 'IN_REVIEW') && (
                    <>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : 'Approve'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Property Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{selectedSubmission.propertyName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium text-gray-900">{selectedSubmission.propertyType}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">
                      {selectedSubmission.propertyAddress}, {selectedSubmission.propertyCity}, {selectedSubmission.propertyState} {selectedSubmission.propertyZipCode}
                    </p>
                  </div>
                  {selectedSubmission.description && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Description</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Financials</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Value</p>
                    <p className="font-medium text-gray-900">{formatCurrency(selectedSubmission.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Token Price</p>
                    <p className="font-medium text-gray-900">{formatCurrency(selectedSubmission.tokenPrice)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Tokens</p>
                    <p className="font-medium text-gray-900">{selectedSubmission.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Annual Yield</p>
                    <p className="font-medium text-gray-900">{selectedSubmission.annualYield}%</p>
                  </div>
                  {selectedSubmission.monthlyRent && (
                    <div>
                      <p className="text-gray-500">Monthly Rent</p>
                      <p className="font-medium text-gray-900">{formatCurrency(selectedSubmission.monthlyRent)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Property Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedSubmission.squareFeet && (
                    <div>
                      <p className="text-gray-500">Square Feet</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.squareFeet.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedSubmission.bedrooms && (
                    <div>
                      <p className="text-gray-500">Bedrooms</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.bedrooms}</p>
                    </div>
                  )}
                  {selectedSubmission.bathrooms && (
                    <div>
                      <p className="text-gray-500">Bathrooms</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.bathrooms}</p>
                    </div>
                  )}
                  {selectedSubmission.yearBuilt && (
                    <div>
                      <p className="text-gray-500">Year Built</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.yearBuilt}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Documents & Compliance</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Ownership Proof</p>
                    {selectedSubmission.ownershipProof ? (
                      <a href={selectedSubmission.ownershipProof} target="_blank" rel="noopener noreferrer" className="text-brand-deep dark:text-brand-mint hover:underline">
                        View Document
                      </a>
                    ) : (
                      <span className="text-gray-400">Not provided</span>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Legal Documents ({selectedSubmission.legalDocuments.length})</p>
                    {selectedSubmission.legalDocuments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSubmission.legalDocuments.map((doc, i) => (
                          <a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="text-brand-deep dark:text-brand-mint hover:underline text-xs bg-white px-2 py-1 rounded border">
                            Document {i + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Financial Statements ({selectedSubmission.financialStatements.length})</p>
                    {selectedSubmission.financialStatements.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSubmission.financialStatements.map((doc, i) => (
                          <a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="text-brand-deep dark:text-brand-mint hover:underline text-xs bg-white px-2 py-1 rounded border">
                            Statement {i + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Tokenizer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{getTokenizerName(selectedSubmission.tokenizer)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedSubmission.tokenizer.email}</p>
                  </div>
                </div>
              </div>

              {selectedSubmission.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Rejection Reason</h4>
                  <p className="text-sm text-red-700">{selectedSubmission.rejectionReason}</p>
                </div>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {formatDate(selectedSubmission.createdAt)}</p>
                {selectedSubmission.submittedAt && <p>Submitted: {formatDate(selectedSubmission.submittedAt)}</p>}
                {selectedSubmission.reviewedAt && <p>Reviewed: {formatDate(selectedSubmission.reviewedAt)}</p>}
                {selectedSubmission.approvedAt && <p>Approved: {formatDate(selectedSubmission.approvedAt)}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Submission</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-brand-deep"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
