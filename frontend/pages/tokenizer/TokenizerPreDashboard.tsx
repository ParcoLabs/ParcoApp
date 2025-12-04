import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useTokenizerContext } from './TokenizerLayout';

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

interface DocumentStatus {
  received: boolean;
  approved: boolean;
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
  const { setPropertyName } = useTokenizerContext();
  const [submissions, setSubmissions] = useState<TokenizationSubmission[]>([]);
  const [activeSubmission, setActiveSubmission] = useState<TokenizationSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 14;

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (activeSubmission) {
      setPropertyName(getDisplayAddress(activeSubmission));
    }
  }, [activeSubmission]);

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

  const getDocumentStatus = (submission: TokenizationSubmission | null): Record<string, DocumentStatus> => {
    if (!submission) return {};
    return {
      ownershipProof: { received: !!submission.ownershipProof, approved: !!submission.ownershipProof },
      taxRecords: { received: submission.financialStatements?.length > 0, approved: false },
      bankStatements: { received: submission.financialStatements?.length > 1, approved: submission.financialStatements?.length > 1 },
      leaseAgreements: { received: submission.legalDocuments?.length > 0, approved: false },
      rentalStatements: { received: false, approved: false },
      valuation: { received: !!submission.totalValue, approved: false },
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
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
      </div>
    );
  }

  const docStatus = getDocumentStatus(activeSubmission);
  const estimatedValue = activeSubmission?.totalValue || 1029;
  const tokensToIssue = activeSubmission?.totalTokens || 0;
  const progressPercent = activeSubmission?.progress || 60;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {!activeSubmission ? (
        <div className="bg-white border border-brand-sage/20 rounded-xl p-12 text-center">
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
          {/* Top Section - 3 Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Property In Progress */}
            <div className="bg-white rounded-xl border border-brand-lightGray p-6">
              <h2 className="text-lg font-bold text-brand-dark mb-4">Property In Progress</h2>
              
              <div className="bg-brand-offWhite rounded-lg p-4 mb-4">
                <img 
                  src={activeSubmission.imageUrl || activeSubmission.images?.[0] || 'https://picsum.photos/200/150?random=1'}
                  alt="Property"
                  className="w-full h-28 object-cover rounded-lg bg-brand-lightGray mb-3"
                />
                <p className="text-[10px] text-brand-sage mb-1">Current page's Property Listing's Images</p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-brand-dark">{getDisplayAddress(activeSubmission)}</p>
                <p className="text-[10px] text-brand-sage">Current page's Property Listing's Address</p>
              </div>

              <div>
                <p className="text-xs text-brand-sage mb-2">Tokenization Progress</p>
                <div className="relative h-6 bg-brand-lightGray rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-brand-deep rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <span className="text-xs font-bold text-white">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Columns - Valuation and Cards */}
            <div className="lg:col-span-2 space-y-4">
              {/* Parco Intelligence Valuation Banner */}
              <div className="bg-brand-deep text-white rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">Parco Intelligence Valuation:</h3>
                <p className="text-sm opacity-90">Current page's Property Listing's</p>
                <p className="text-sm opacity-90">parco_valuation_average:formatted as ${estimatedValue.toLocaleString()}</p>
              </div>

              {/* Two Column Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Funds Raising Goal */}
                <div className="bg-white rounded-xl border border-brand-lightGray p-5">
                  <h3 className="text-sm font-bold text-brand-dark mb-4">Funds Raising Goal</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-full border-4 border-brand-deep flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-house text-brand-deep text-xl"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-brand-dark leading-tight">Current page's Property Listing's Valuation:formatted as</p>
                      <p className="text-lg font-bold text-brand-dark">${(estimatedValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <button className="text-xs text-brand-sage hover:text-brand-deep mt-4 transition-colors">
                    Review Terms
                  </button>
                </div>

                {/* Token Terms */}
                <div className="bg-white rounded-xl border border-brand-lightGray p-5">
                  <h3 className="text-sm font-bold text-brand-dark mb-4">Token Terms</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-full border-4 border-brand-deep flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-coins text-brand-deep text-xl"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-brand-dark leading-tight">Current page's Property Listing's Total Tokens Issued</p>
                      <p className="text-lg font-bold text-brand-dark">{tokensToIssue.toLocaleString()}</p>
                    </div>
                  </div>
                  <button className="text-xs text-brand-sage hover:text-brand-deep mt-4 transition-colors">
                    Set Token Contract Terms
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Document Checklist */}
          <div className="bg-white rounded-xl border border-brand-lightGray p-6">
            <h2 className="text-lg font-bold text-brand-dark mb-6">Document Checklist</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-lightGray">
                    <th className="text-left py-3 pr-4 text-sm font-medium text-brand-dark w-1/2"></th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-brand-dark">Received</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-brand-dark">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {DOCUMENT_CHECKLIST.map((doc) => {
                    const status = docStatus[doc.key] || { received: false, approved: false };
                    return (
                      <tr key={doc.key} className="border-b border-brand-lightGray/50 last:border-0">
                        <td className="py-3 pr-4 text-sm text-brand-dark">{doc.label}</td>
                        <td className="py-3 px-4 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${status.received ? 'bg-brand-deep' : 'bg-brand-lightGray'}`}></div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${status.approved ? 'bg-brand-deep' : 'bg-brand-lightGray'}`}></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => navigate(`/tokenizer/dashboard/${activeSubmission.id}`)}
                className="px-12 py-3 bg-white border-2 border-brand-dark rounded-full text-sm font-bold text-brand-dark hover:bg-brand-offWhite transition-colors"
              >
                Upload a files
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-brand-lightGray p-6">
            <h2 className="text-lg font-bold text-brand-dark mb-4">Notifications</h2>
            
            <div className="flex items-center gap-2 mb-6">
              <span className="px-4 py-2 bg-brand-dark text-white text-xs font-medium rounded-lg">
                Pending Listing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-lightGray">
                    <th className="text-left py-3 pr-4 text-xs font-medium text-brand-sage">Current page's Property Listing's Address</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-sage">Doc's Needed2</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-sage">Re Upload Deed</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-sage">Admin</th>
                    <th className="text-right py-3 pl-4 text-xs font-medium text-brand-sage"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-4 pr-4 text-sm text-brand-dark">{getDisplayAddress(activeSubmission)}</td>
                    <td className="py-4 px-4 text-sm text-brand-dark">Doc's Needed2</td>
                    <td className="py-4 px-4 text-sm text-brand-dark">Re Upload Deed</td>
                    <td className="py-4 px-4 text-sm text-brand-dark">Admin</td>
                    <td className="py-4 pl-4 text-right">
                      <span className="px-6 py-2 rounded-full text-xs font-bold bg-brand-deep text-white">
                        High
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 text-xs text-brand-sage">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:text-brand-dark disabled:opacity-50"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span>{currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 hover:text-brand-dark disabled:opacity-50"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
