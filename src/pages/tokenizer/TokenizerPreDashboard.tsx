import React, { useState, useEffect, useRef } from 'react';
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
  documents: string[];
  images: string[];
  updatedAt: string;
}

interface IssuanceCaseData {
  id: string;
  status: string;
  eligibilityStatus: string;
  extractionScore: number;
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
  const [issuanceCase, setIssuanceCase] = useState<IssuanceCaseData | null>(null);
  const [issuanceLoading, setIssuanceLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const totalPages = 14;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileSelect = async (docKey: string, files: FileList | null) => {
    if (!files || files.length === 0 || !activeSubmission) return;

    const file = files[0];
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      showToast('Only PDF, PNG, and JPEG files are allowed', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('File too large. Maximum size is 15MB.', 'error');
      return;
    }

    setUploadingDoc(docKey);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/uploads/tokenization/${activeSubmission.id}/${docKey}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        showToast(`${file.name} uploaded successfully`, 'success');
        await refreshSubmission();
      } else {
        const data = await res.json().catch(() => ({ error: 'Upload failed' }));
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploadingDoc(null);
      if (fileInputRefs.current[docKey]) {
        fileInputRefs.current[docKey]!.value = '';
      }
    }
  };

  const handleUploadClick = (docKey: string) => {
    fileInputRefs.current[docKey]?.click();
  };

  const refreshSubmission = async () => {
    if (!activeSubmission) return;
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
        const updated = subs.find((s: TokenizationSubmission) => s.id === activeSubmission.id);
        if (updated) setActiveSubmission(updated);
      }
    } catch (err) {
      console.error('Error refreshing submission:', err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (activeSubmission) {
      setPropertyName(getDisplayAddress(activeSubmission));
      fetchIssuanceCase(activeSubmission.id);
    } else {
      setIssuanceCase(null);
    }
  }, [activeSubmission]);

  const fetchIssuanceCase = async (submissionId: string) => {
    setIssuanceLoading(true);
    try {
      const token = await getToken();
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await fetch(`/api/issuance/by-submission/${submissionId}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setIssuanceCase(json.data);
      } else if (res.status === 404) {
        const createRes = await fetch(`/api/issuance/by-submission/${submissionId}/create`, {
          method: 'POST',
          headers,
        });
        if (createRes.ok) {
          const json = await createRes.json();
          setIssuanceCase(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching issuance case:', err);
    } finally {
      setIssuanceLoading(false);
    }
  };

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

  const getStoredDocsForKey = (submission: TokenizationSubmission | null, docKey: string): string[] => {
    if (!submission) return [];
    switch (docKey) {
      case 'ownershipProof':
        return submission.ownershipProof ? [submission.ownershipProof] : [];
      case 'taxRecords':
      case 'bankStatements':
      case 'rentalStatements':
        return (submission.financialStatements || []).filter(u => u.includes(`/${docKey}/`));
      case 'leaseAgreements':
        return (submission.legalDocuments || []).filter(u => u.includes(`/${docKey}/`));
      case 'valuation':
        return (submission.documents || []).filter(u => u.includes(`/${docKey}/`));
      default:
        return [];
    }
  };

  const getDocumentStatus = (submission: TokenizationSubmission | null): Record<string, DocumentStatus> => {
    if (!submission) return {};
    return {
      ownershipProof: { received: !!submission.ownershipProof, approved: !!submission.ownershipProof },
      taxRecords: { received: getStoredDocsForKey(submission, 'taxRecords').length > 0, approved: false },
      bankStatements: { received: getStoredDocsForKey(submission, 'bankStatements').length > 0, approved: false },
      leaseAgreements: { received: getStoredDocsForKey(submission, 'leaseAgreements').length > 0, approved: false },
      rentalStatements: { received: getStoredDocsForKey(submission, 'rentalStatements').length > 0, approved: false },
      valuation: { received: getStoredDocsForKey(submission, 'valuation').length > 0 || !!submission.totalValue, approved: false },
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4 md:space-y-6 w-full box-border">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
      {!activeSubmission ? (
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-8 md:p-12 text-center">
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
          {/* Top Section - Stacked on mobile, 3 Column Grid on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column - Property In Progress */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-brand-dark mb-3 md:mb-4">Property In Progress</h2>
              
              <div className="bg-brand-offWhite rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                <img 
                  src={activeSubmission.imageUrl || activeSubmission.images?.[0] || 'https://picsum.photos/200/150?random=1'}
                  alt="Property"
                  className="w-full h-24 md:h-28 object-cover rounded-lg bg-brand-lightGray mb-2 md:mb-3"
                />
                <p className="text-[10px] text-brand-sage">Property Image</p>
              </div>

              <div className="mb-3 md:mb-4">
                <p className="text-sm font-medium text-brand-dark truncate">{getDisplayAddress(activeSubmission)}</p>
                <p className="text-[10px] text-brand-sage">Property Address</p>
              </div>

              <div>
                <p className="text-xs text-brand-sage mb-2">Tokenization Progress</p>
                <div className="relative h-6 bg-brand-lightGray rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-brand-deep rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${Math.max(progressPercent, 15)}%` }}
                  >
                    <span className="text-xs font-bold text-white">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Columns - Valuation and Cards */}
            <div className="lg:col-span-2 space-y-4">
              {/* Parco Intelligence Valuation Banner */}
              <div className="bg-brand-deep text-white rounded-xl p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold mb-1 md:mb-2">Parco Intelligence Valuation:</h3>
                <p className="text-2xl md:text-3xl font-bold">${estimatedValue.toLocaleString()}</p>
              </div>

              {/* Two Column Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {/* Funds Raising Goal */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-4 md:p-5">
                  <h3 className="text-sm font-bold text-brand-dark mb-3 md:mb-4">Funds Raising Goal</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-brand-deep flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-house text-brand-deep dark:text-brand-mint text-lg md:text-xl"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-xs text-brand-sage">Property Valuation</p>
                      <p className="text-base md:text-lg font-bold text-brand-dark dark:text-white">${(estimatedValue).toLocaleString()}</p>
                    </div>
                  </div>
                  <button className="text-xs text-brand-sage hover:text-brand-deep dark:text-brand-mint mt-3 md:mt-4 transition-colors">
                    Review Terms
                  </button>
                </div>

                {/* Token Terms */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-4 md:p-5">
                  <h3 className="text-sm font-bold text-brand-dark mb-3 md:mb-4">Token Terms</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-brand-deep flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-coins text-brand-deep dark:text-brand-mint text-lg md:text-xl"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-xs text-brand-sage">Total Tokens Issued</p>
                      <p className="text-base md:text-lg font-bold text-brand-dark dark:text-white">{tokensToIssue.toLocaleString()}</p>
                    </div>
                  </div>
                  <button className="text-xs text-brand-sage hover:text-brand-deep dark:text-brand-mint mt-3 md:mt-4 transition-colors">
                    Set Token Terms
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Issuance Status */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-brand-dark dark:text-white">Issuance Status</h2>
              {issuanceCase && (
                <button
                  onClick={() => navigate(`/tokenizer/issuance/${activeSubmission?.id}`)}
                  className="text-xs font-medium text-brand-deep hover:text-brand-dark dark:text-brand-mint dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  Open Issuance <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              )}
            </div>
            {issuanceLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
              </div>
            ) : issuanceCase ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-brand-offWhite dark:bg-[#222] rounded-lg p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-brand-sage mb-1">Case Status</p>
                  <p className="text-sm font-bold text-brand-dark dark:text-white">
                    {(issuanceCase.status || 'DRAFT').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="bg-brand-offWhite dark:bg-[#222] rounded-lg p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-brand-sage mb-1">Eligibility</p>
                  <p className="text-sm font-bold text-brand-dark dark:text-white">
                    {(issuanceCase.eligibilityStatus || 'PENDING').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="bg-brand-offWhite dark:bg-[#222] rounded-lg p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-brand-sage mb-1">Extraction Score</p>
                  <p className="text-sm font-bold text-brand-dark dark:text-white">
                    {issuanceCase.extractionScore ?? 0}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-sage py-4 text-center">No issuance case yet.</p>
            )}
          </div>

          {/* Document Checklist */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-4 md:p-6">
            <h2 className="text-lg font-bold text-brand-dark mb-4 md:mb-6">Document Checklist</h2>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {DOCUMENT_CHECKLIST.map((doc) => {
                const status = docStatus[doc.key] || { received: false, approved: false };
                const storedDocs = getStoredDocsForKey(activeSubmission, doc.key);
                const isUploading = uploadingDoc === doc.key;
                return (
                  <div key={doc.key} className="bg-brand-offWhite dark:bg-[#222] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-brand-dark dark:text-white">{doc.label}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${status.received ? 'bg-brand-deep' : 'bg-brand-lightGray'}`}></div>
                          <span className="text-[10px] text-brand-sage">Received</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${status.approved ? 'bg-brand-deep' : 'bg-brand-lightGray'}`}></div>
                          <span className="text-[10px] text-brand-sage">Approved</span>
                        </div>
                      </div>
                    </div>
                    
                    {storedDocs.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {storedDocs.map((url, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] rounded px-2 py-1.5">
                            <i className="fa-solid fa-file-check text-brand-deep dark:text-brand-mint text-xs"></i>
                            <span className="text-xs text-brand-dark dark:text-white truncate flex-1">{url.split('/').pop()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <input
                      type="file"
                      ref={el => { fileInputRefs.current[doc.key] = el; }}
                      onChange={(e) => handleFileSelect(doc.key, e.target.files)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    <button
                      onClick={() => handleUploadClick(doc.key)}
                      disabled={isUploading}
                      className="w-full py-2 px-3 bg-white dark:bg-[#1a1a1a] border border-brand-sage/30 rounded-lg text-xs font-medium text-brand-dark dark:text-white hover:bg-brand-deep hover:text-white hover:border-brand-deep disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-deep"></div> Uploading...</>
                      ) : (
                        <><i className="fa-solid fa-cloud-arrow-up"></i> {storedDocs.length > 0 ? 'Upload Another' : 'Upload Document'}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-lightGray">
                    <th className="text-left py-3 pr-4 text-sm font-medium text-brand-dark w-1/3"></th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-brand-dark dark:text-white">Received</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-brand-dark dark:text-white">Approved</th>
                    <th className="text-right py-3 pl-4 text-sm font-medium text-brand-dark dark:text-white">Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {DOCUMENT_CHECKLIST.map((doc) => {
                    const status = docStatus[doc.key] || { received: false, approved: false };
                    const storedDocs = getStoredDocsForKey(activeSubmission, doc.key);
                    const isUploading = uploadingDoc === doc.key;
                    return (
                      <tr key={doc.key} className="border-b border-brand-lightGray/50 last:border-0">
                        <td className="py-3 pr-4">
                          <div>
                            <span className="text-sm text-brand-dark dark:text-white">{doc.label}</span>
                            {storedDocs.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {storedDocs.map((url, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-brand-sage">
                                    <i className="fa-solid fa-file-check text-brand-deep dark:text-brand-mint"></i>
                                    <span className="truncate max-w-[150px]">{url.split('/').pop()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${status.received ? 'bg-brand-deep' : 'bg-brand-lightGray'}`}></div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${status.approved ? 'bg-brand-deep' : 'bg-brand-lightGray'}`}></div>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <input
                            type="file"
                            ref={el => { fileInputRefs.current[doc.key] = el; }}
                            onChange={(e) => handleFileSelect(doc.key, e.target.files)}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                          />
                          <button
                            onClick={() => handleUploadClick(doc.key)}
                            disabled={isUploading}
                            className="px-3 py-1.5 bg-brand-offWhite dark:bg-[#222] border border-brand-sage/30 rounded-lg text-xs font-medium text-brand-dark dark:text-white hover:bg-brand-deep hover:text-white hover:border-brand-deep disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                          >
                            {isUploading ? (
                              <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-deep"></div> Uploading...</>
                            ) : (
                              <><i className="fa-solid fa-cloud-arrow-up"></i> {storedDocs.length > 0 ? 'Upload More' : 'Upload'}</>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={() => navigate(`/tokenizer/dashboard/${activeSubmission.id}`)}
                className="px-8 py-3 bg-brand-deep text-white rounded-full text-sm font-bold hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-arrow-right"></i>
                Continue Application
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-brand-dark mb-3 md:mb-4">Notifications</h2>
            
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <span className="px-3 py-1.5 md:px-4 md:py-2 bg-brand-dark text-white text-xs font-medium rounded-lg">
                Pending Listing
              </span>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              <div className="bg-brand-offWhite rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium text-brand-dark truncate">{getDisplayAddress(activeSubmission)}</p>
                    <p className="text-xs text-brand-sage mt-1">Documents needed for review</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-deep text-white flex-shrink-0">
                    High
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-sage">
                  <i className="fa-solid fa-file-lines"></i>
                  <span>Re-upload Property Deed required</span>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-brand-lightGray">
                    <th className="text-left py-3 pr-4 text-xs font-medium text-brand-sage">Property</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-sage">Action Required</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-sage">Details</th>
                    <th className="text-right py-3 pl-4 text-xs font-medium text-brand-sage">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-4 pr-4 text-sm text-brand-dark dark:text-white">{getDisplayAddress(activeSubmission)}</td>
                    <td className="py-4 px-4 text-sm text-brand-dark dark:text-white">Documents Needed</td>
                    <td className="py-4 px-4 text-sm text-brand-dark dark:text-white">Re-upload Property Deed</td>
                    <td className="py-4 pl-4 text-right">
                      <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-brand-deep text-white">
                        High
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-3 mt-4 md:mt-6 text-xs text-brand-sage">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:text-brand-dark disabled:opacity-50"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span>{currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:text-brand-dark disabled:opacity-50"
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
