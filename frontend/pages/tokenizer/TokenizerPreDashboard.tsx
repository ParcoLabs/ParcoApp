import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface TokenizationSubmission {
  id: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  status: string;
  progress: number;
  totalValue: number | null;
  tokenPrice: number | null;
  totalTokens: number;
  annualYield: number | null;
  imageUrl: string | null;
  description: string | null;
  ownershipProof: string | null;
  legalDocuments: string[];
  financialStatements: string[];
  images: string[];
  updatedAt: string;
}

const DOCUMENT_CHECKLIST = [
  { key: 'ownershipProof', label: 'Property Deed' },
  { key: 'taxRecords', label: 'Tax Records' },
  { key: 'bankStatements', label: 'Bank Statements' },
  { key: 'leaseAgreements', label: 'Lease Agreements' },
  { key: 'rentalStatements', label: 'Rental Statements' },
  { key: 'valuation', label: 'Valuation & Appraisal' },
];

export const TokenizerPreDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const [submissions, setSubmissions] = useState<TokenizationSubmission[]>([]);
  const [activeSubmission, setActiveSubmission] = useState<TokenizationSubmission | null>(null);
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
        setSubmissions(subs);
        const inProgress = subs.find((s: TokenizationSubmission) => 
          s.status === 'DRAFT' || s.status === 'SUBMITTED' || s.status === 'IN_REVIEW'
        );
        setActiveSubmission(inProgress || subs[0] || null);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (submission: TokenizationSubmission | null) => {
    if (!submission) return {};
    return {
      ownershipProof: { received: !!submission.ownershipProof, approved: !!submission.ownershipProof },
      taxRecords: { received: submission.financialStatements?.length > 0, approved: false },
      bankStatements: { received: submission.financialStatements?.length > 1, approved: false },
      leaseAgreements: { received: submission.legalDocuments?.length > 0, approved: false },
      rentalStatements: { received: submission.financialStatements?.length > 2, approved: false },
      valuation: { received: !!submission.totalValue, approved: !!submission.totalValue },
    };
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

  const docStatus = getDocumentStatus(activeSubmission);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-brand-black">Property In Progress</h1>
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
          <h3 className="text-lg font-bold text-brand-black mb-2">No Properties In Progress</h3>
          <p className="text-brand-sage text-sm mb-6">Start tokenizing your first property.</p>
          <button
            onClick={() => navigate('/tokenizer/my-properties')}
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
          >
            Start New Property
          </button>
        </div>
      ) : (
        <>
          {/* Valuation Banner */}
          <div className="bg-brand-deep text-white rounded-lg p-4">
            <p className="text-sm font-medium opacity-80 mb-1">Parco Intelligence Valuation:</p>
            <p className="text-2xl font-bold">
              ${activeSubmission.totalValue?.toLocaleString() || '0'}
            </p>
          </div>

          {/* Property Card and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Property Image Card */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <div className="aspect-video bg-brand-offWhite rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {activeSubmission.imageUrl ? (
                  <img src={activeSubmission.imageUrl} alt="Property" className="w-full h-full object-cover" />
                ) : (
                  <i className="fa-solid fa-image text-4xl text-brand-sage/30"></i>
                )}
              </div>
              <p className="text-sm font-medium text-brand-black">{getDisplayAddress(activeSubmission)}</p>
              {activeSubmission.propertyCity && (
                <p className="text-xs text-brand-sage">{activeSubmission.propertyCity}, {activeSubmission.propertyState}</p>
              )}
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-brand-sage font-medium">Tokenization Progress</span>
                  <span className="text-brand-deep font-bold">{activeSubmission.progress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-deep rounded-full transition-all"
                    style={{ width: `${activeSubmission.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Funds Raising Goal */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <h3 className="text-sm font-bold text-brand-black mb-3">Funds Raising Goal</h3>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full border-4 border-brand-deep flex items-center justify-center">
                  <i className="fa-solid fa-dollar-sign text-brand-deep text-xl"></i>
                </div>
                <div>
                  <p className="text-xl font-bold text-brand-black">
                    ${activeSubmission.totalValue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-brand-sage">Property Valuation</p>
                </div>
              </div>
              <button className="w-full mt-4 text-brand-deep text-xs font-medium hover:underline">
                Review Terms
              </button>
            </div>

            {/* Token Terms */}
            <div className="bg-white border border-brand-sage/20 rounded-lg p-4">
              <h3 className="text-sm font-bold text-brand-black mb-3">Token Terms</h3>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full border-4 border-brand-deep flex items-center justify-center">
                  <i className="fa-solid fa-coins text-brand-deep text-xl"></i>
                </div>
                <div>
                  <p className="text-xl font-bold text-brand-black">
                    {activeSubmission.totalTokens?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-brand-sage">Total Tokens Issued</p>
                </div>
              </div>
              <button className="w-full mt-4 text-brand-deep text-xs font-medium hover:underline">
                Set Token Contract Terms
              </button>
            </div>
          </div>

          {/* Document Checklist */}
          <div className="bg-white border border-brand-sage/20 rounded-lg p-6">
            <h2 className="text-lg font-bold text-brand-black mb-4">Document Checklist</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-sage/20">
                    <th className="text-left py-2 text-xs font-medium text-brand-sage"></th>
                    <th className="text-center py-2 text-xs font-medium text-brand-sage">Received</th>
                    <th className="text-center py-2 text-xs font-medium text-brand-sage">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {DOCUMENT_CHECKLIST.map((doc) => {
                    const status = docStatus[doc.key as keyof typeof docStatus] || { received: false, approved: false };
                    return (
                      <tr key={doc.key} className="border-b border-brand-sage/10">
                        <td className="py-3 text-sm text-brand-dark">{doc.label}</td>
                        <td className="py-3 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${status.received ? 'bg-brand-deep' : 'bg-gray-300'}`}></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${status.approved ? 'bg-brand-deep' : 'bg-gray-300'}`}></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => navigate(`/tokenizer/dashboard/${activeSubmission.id}`)}
              className="w-full mt-6 bg-brand-offWhite hover:bg-brand-sage/20 border border-brand-sage/30 text-brand-dark py-3 rounded-lg font-medium text-sm transition-colors"
            >
              Upload Files
            </button>
          </div>

          {/* Notifications */}
          <div className="bg-white border border-brand-sage/20 rounded-lg p-6">
            <h2 className="text-lg font-bold text-brand-black mb-4">Notifications</h2>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {activeSubmission.status === 'DRAFT' ? 'Pending Listing' : activeSubmission.status}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-sage/20">
                    <th className="text-left py-2 text-xs font-medium text-brand-sage">Current Page</th>
                    <th className="text-left py-2 text-xs font-medium text-brand-sage">Status</th>
                    <th className="text-left py-2 text-xs font-medium text-brand-sage">Action</th>
                    <th className="text-left py-2 text-xs font-medium text-brand-sage">Assigned</th>
                    <th className="text-left py-2 text-xs font-medium text-brand-sage">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-brand-sage/10">
                    <td className="py-3 text-brand-dark">Property Listing's Address</td>
                    <td className="py-3 text-brand-sage">Docs Needed</td>
                    <td className="py-3 text-brand-sage">Re-Upload Deed</td>
                    <td className="py-3 text-brand-sage">Admin</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">High</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
