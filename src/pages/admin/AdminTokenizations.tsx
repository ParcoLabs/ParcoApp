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

interface EligibilityCheckData {
  key: string;
  status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  details: string | null;
}

interface IssuanceCaseData {
  id: string;
  status: string;
  eligibilityStatus: string;
  extractionScore: number;
  track: string;
  targetState: string;
  maxPropertyPriceCents: number | null;
  eligibilityNotes: string | null;
  checklistItems: Array<{ id: string; key: string; label: string; ownerRole: string; status: string }>;
  approvalTasks: Array<{ id: string; role: string; status: string }>;
  requiredDocTypes: string[];
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
  const [issuanceCase, setIssuanceCase] = useState<IssuanceCaseData | null>(null);
  const [issuanceLoading, setIssuanceLoading] = useState(false);
  const [issuanceActionLoading, setIssuanceActionLoading] = useState<string | null>(null);
  const [issuanceDocCount, setIssuanceDocCount] = useState<number>(0);
  const [trackEditing, setTrackEditing] = useState(false);
  const [editTrack, setEditTrack] = useState('SERIES_LLC');
  const [editTargetState, setEditTargetState] = useState('OTHER');
  const [editPriceCap, setEditPriceCap] = useState('');
  const [trackSaving, setTrackSaving] = useState(false);
  const [eligibilityChecks, setEligibilityChecks] = useState<EligibilityCheckData[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [mintActivateLoading, setMintActivateLoading] = useState(false);
  const [mintActivateResult, setMintActivateResult] = useState<any>(null);
  const [fieldsData, setFieldsData] = useState<{ extractedFields: any[]; verifiedFields: any[]; criticalKeys: string[] } | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [verifyModal, setVerifyModal] = useState<{ key: string; extractedValue: string; confidence: number | null } | null>(null);
  const [verifyValue, setVerifyValue] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [offeringPacket, setOfferingPacket] = useState<any>(null);
  const [packetLoading, setPacketLoading] = useState(false);
  const [packetGenerating, setPacketGenerating] = useState(false);
  const [packetStatusLoading, setPacketStatusLoading] = useState(false);
  const [docRequirements, setDocRequirements] = useState<{ requiredDocTypes: string[]; uploadedDocTypes: string[]; missingDocTypes: string[] } | null>(null);

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

  const fetchIssuanceCase = async (submissionId: string) => {
    setIssuanceLoading(true);
    setIssuanceCase(null);
    try {
      const res = await fetch(`/api/issuance/by-submission/${submissionId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setIssuanceCase(json.data);
        if (json.data?.eligibilityChecks) {
          setEligibilityChecks(json.data.eligibilityChecks.map((c: any) => ({ key: c.key, status: c.status, details: c.details })));
        }
        if (json.data?.id) {
          fetchIssuanceDocCount(json.data.id);
          fetchFields(json.data.id);
          fetchOfferingPacket(json.data.id);
          fetchDocRequirements(json.data.id);
        }
      } else if (res.status === 404) {
        const createRes = await fetch(`/api/issuance/by-submission/${submissionId}/create`, {
          method: 'POST',
          credentials: 'include',
        });
        if (createRes.ok) {
          const json = await createRes.json();
          setIssuanceCase(json.data);
          if (json.data?.id) {
            fetchIssuanceDocCount(json.data.id);
            fetchDocRequirements(json.data.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching issuance case:', err);
    } finally {
      setIssuanceLoading(false);
    }
  };

  const fetchIssuanceDocCount = async (caseId: string) => {
    try {
      const res = await fetch(`/api/issuance/case/${caseId}/documents`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setIssuanceDocCount((json.data || []).length);
      }
    } catch (err) {
      console.error('Error fetching issuance doc count:', err);
    }
  };

  const handleRunEligibility = async () => {
    if (!issuanceCase) return;
    setIssuanceActionLoading('eligibility');
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/eligibility/run`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        setIssuanceCase(prev => prev ? { ...prev, eligibilityStatus: data.eligibilityStatus || 'PENDING' } : null);
        setEligibilityChecks(data.checks || []);
        showToast('Eligibility check completed', 'success');
      } else {
        showToast('Failed to run eligibility check', 'error');
      }
    } catch (err) {
      showToast('Error running eligibility check', 'error');
    } finally {
      setIssuanceActionLoading(null);
    }
  };

  const handleRunExtraction = async () => {
    if (!issuanceCase) return;
    setIssuanceActionLoading('extraction');
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/extract`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setIssuanceCase(prev => prev ? { ...prev, extractionScore: json.data?.extractionScore ?? 85, status: json.data?.status || prev.status } : null);
        showToast('Extraction completed', 'success');
      } else {
        showToast('Failed to run extraction', 'error');
      }
    } catch (err) {
      showToast('Error running extraction', 'error');
    } finally {
      setIssuanceActionLoading(null);
    }
  };

  const handleSaveTrack = async () => {
    if (!issuanceCase) return;
    setTrackSaving(true);
    try {
      const body: any = { track: editTrack, targetState: editTargetState };
      if (editPriceCap) body.maxPropertyPriceCents = parseInt(editPriceCap, 10);
      else body.maxPropertyPriceCents = null;
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/track`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        setIssuanceCase(json.data);
        setTrackEditing(false);
        showToast('Track updated and checklist seeded', 'success');
      } else {
        showToast('Failed to update track', 'error');
      }
    } catch (err) {
      showToast('Error updating track', 'error');
    } finally {
      setTrackSaving(false);
    }
  };

  const handleAdvanceToReview = async (forceOverride = false) => {
    if (!issuanceCase) return;
    if (issuanceCase.eligibilityStatus !== 'PASS' && !forceOverride) {
      setShowOverrideModal(true);
      return;
    }
    setAdvanceLoading(true);
    try {
      const body: any = { status: 'REVIEW_READY' };
      if (forceOverride && overrideReason.trim()) {
        body.override = true;
        body.reason = overrideReason.trim();
      }
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        setIssuanceCase(prev => prev ? { ...prev, status: json.data?.status || 'REVIEW_READY' } : null);
        showToast(json.warning || 'Advanced to Review Ready', json.warning ? 'error' : 'success');
        setShowOverrideModal(false);
        setOverrideReason('');
      } else {
        const err = await res.json();
        if (err.requiresOverride) {
          setShowOverrideModal(true);
        } else {
          showToast(err.error || 'Failed to advance status', 'error');
        }
      }
    } catch (err) {
      showToast('Error advancing status', 'error');
    } finally {
      setAdvanceLoading(false);
    }
  };

  const handleMintAndActivate = async () => {
    if (!issuanceCase) return;
    setMintActivateLoading(true);
    setMintActivateResult(null);
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/mint-and-activate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setMintActivateResult(json);
        setIssuanceCase((prev: any) => prev ? { ...prev, status: 'LIVE' } : null);
        showToast('Mint & Activate completed successfully!', 'success');
        if (selectedSubmission) {
          fetchIssuanceCase(selectedSubmission.id);
        }
      } else {
        if (json.requiresOverride) {
          const reason = prompt('Eligibility override required. Enter reason:');
          if (reason && reason.trim()) {
            const retryRes = await fetch(`/api/issuance/case/${issuanceCase.id}/mint-and-activate`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ overrideReason: reason.trim() }),
            });
            const retryJson = await retryRes.json();
            if (retryRes.ok) {
              setMintActivateResult(retryJson);
              setIssuanceCase((prev: any) => prev ? { ...prev, status: 'LIVE' } : null);
              showToast('Mint & Activate completed with override!', 'success');
              if (selectedSubmission) {
                fetchIssuanceCase(selectedSubmission.id);
              }
            } else {
              showToast(retryJson.error || 'Failed to mint & activate', 'error');
            }
          }
        } else {
          showToast(json.error || 'Failed to mint & activate', 'error');
        }
      }
    } catch (err) {
      showToast('Error during mint & activate', 'error');
    } finally {
      setMintActivateLoading(false);
    }
  };

  const fetchFields = async (caseId: string) => {
    setFieldsLoading(true);
    try {
      const res = await fetch(`/api/issuance/case/${caseId}/fields`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setFieldsData(json.data);
      }
    } catch (err) {
      console.error('Error fetching fields:', err);
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleVerifyField = async () => {
    if (!issuanceCase || !verifyModal) return;
    setVerifyLoading(true);
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/fields/${verifyModal.key}/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: verifyValue || undefined }),
      });
      if (res.ok) {
        showToast(`Field "${verifyModal.key.replace(/_/g, ' ')}" verified`, 'success');
        setVerifyModal(null);
        setVerifyValue('');
        fetchFields(issuanceCase.id);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to verify field', 'error');
      }
    } catch (err) {
      showToast('Error verifying field', 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRunExtractionAndRefreshFields = async () => {
    if (!issuanceCase) return;
    setIssuanceActionLoading('extraction');
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/extract`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setIssuanceCase(prev => prev ? { ...prev, extractionScore: json.data?.extractionScore ?? 85, status: json.data?.status || prev.status } : null);
        showToast(`Extraction completed — ${json.data?.fieldsExtracted || 0} fields extracted`, 'success');
        fetchFields(issuanceCase.id);
      } else {
        showToast('Failed to run extraction', 'error');
      }
    } catch (err) {
      showToast('Error running extraction', 'error');
    } finally {
      setIssuanceActionLoading(null);
    }
  };

  const fetchOfferingPacket = async (caseId: string) => {
    setPacketLoading(true);
    try {
      const res = await fetch(`/api/issuance/case/${caseId}/offering-packet`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setOfferingPacket(json.data);
      }
    } catch (err) {
      console.error('Error fetching offering packet:', err);
    } finally {
      setPacketLoading(false);
    }
  };

  const fetchDocRequirements = async (caseId: string) => {
    try {
      const res = await fetch(`/api/issuance/case/${caseId}/requirements`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setDocRequirements(json.data || null);
      }
    } catch (err) {
      console.error('Error fetching doc requirements:', err);
    }
  };

  const handleGeneratePacket = async () => {
    if (!issuanceCase) return;
    setPacketGenerating(true);
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/offering-packet/generate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setOfferingPacket(json.data);
        showToast('Offering packet generated', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to generate packet', 'error');
      }
    } catch (err) {
      showToast('Error generating offering packet', 'error');
    } finally {
      setPacketGenerating(false);
    }
  };

  const handlePacketStatus = async (status: string) => {
    if (!issuanceCase) return;
    setPacketStatusLoading(true);
    try {
      const res = await fetch(`/api/issuance/case/${issuanceCase.id}/offering-packet/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const json = await res.json();
        setOfferingPacket(json.data);
        showToast(`Packet status updated to ${status}`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error updating packet status', 'error');
    } finally {
      setPacketStatusLoading(false);
    }
  };

  const startTrackEdit = () => {
    if (issuanceCase) {
      setEditTrack(issuanceCase.track || 'SERIES_LLC');
      setEditTargetState(issuanceCase.targetState || 'OTHER');
      setEditPriceCap(issuanceCase.maxPropertyPriceCents ? String(issuanceCase.maxPropertyPriceCents) : '');
    }
    setTrackEditing(true);
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
        fetchIssuanceCase(submission.id);
        setIssuanceDocCount(0);
        setEligibilityChecks([]);
        setFieldsData(null);
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

              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Issuance Status</h4>
                {issuanceLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-deep"></div>
                  </div>
                ) : issuanceCase ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Case Status</p>
                        <p className="font-medium text-gray-900 dark:text-white">{(issuanceCase.status || 'DRAFT').replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Eligibility</p>
                        <p className="font-medium text-gray-900 dark:text-white">{(issuanceCase.eligibilityStatus || 'PENDING').replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Extraction Score</p>
                        <p className="font-medium text-gray-900 dark:text-white">{issuanceCase.extractionScore ?? 0}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Regulatory Track</p>
                        {!trackEditing && (
                          <button onClick={startTrackEdit} className="text-xs text-brand-deep hover:text-brand-dark dark:text-brand-mint">
                            Edit
                          </button>
                        )}
                      </div>
                      {trackEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">Track</label>
                              <select
                                value={editTrack}
                                onChange={(e) => setEditTrack(e.target.value)}
                                className="w-full border border-gray-300 dark:border-[#444] dark:bg-[#1a1a1a] dark:text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="SERIES_LLC">Series LLC</option>
                                <option value="REG_D">Reg D</option>
                                <option value="REG_CF">Reg CF</option>
                                <option value="REG_A">Reg A+</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">Target State</label>
                              <select
                                value={editTargetState}
                                onChange={(e) => setEditTargetState(e.target.value)}
                                className="w-full border border-gray-300 dark:border-[#444] dark:bg-[#1a1a1a] dark:text-white rounded px-2 py-1 text-xs"
                              >
                                <option value="NV">Nevada</option>
                                <option value="FL">Florida</option>
                                <option value="WY">Wyoming</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-0.5">Price Cap (cents)</label>
                            <input
                              type="number"
                              value={editPriceCap}
                              onChange={(e) => setEditPriceCap(e.target.value)}
                              placeholder="e.g. 50000000"
                              className="w-full border border-gray-300 dark:border-[#444] dark:bg-[#1a1a1a] dark:text-white rounded px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveTrack}
                              disabled={trackSaving}
                              className="flex-1 px-2 py-1 bg-brand-deep text-white rounded text-xs font-medium hover:bg-brand-dark disabled:opacity-50"
                            >
                              {trackSaving ? 'Saving...' : 'Save & Seed'}
                            </button>
                            <button
                              onClick={() => setTrackEditing(false)}
                              className="px-2 py-1 border border-gray-300 dark:border-[#444] rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Track</p>
                            <p className="font-medium text-gray-900 dark:text-white">{(issuanceCase.track || 'SERIES_LLC').replace(/_/g, ' ')}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">State</p>
                            <p className="font-medium text-gray-900 dark:text-white">{issuanceCase.targetState || 'OTHER'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Price Cap</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {issuanceCase.maxPropertyPriceCents
                                ? `$${(issuanceCase.maxPropertyPriceCents / 100).toLocaleString()}`
                                : 'None'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {docRequirements && docRequirements.requiredDocTypes.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Document Requirements</p>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            docRequirements.missingDocTypes.length === 0
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}>
                            {docRequirements.uploadedDocTypes.length}/{docRequirements.requiredDocTypes.length} present
                          </span>
                        </div>
                        <div className="space-y-1">
                          {docRequirements.requiredDocTypes.map((docType: string) => {
                            const isUploaded = docRequirements.uploadedDocTypes.includes(docType);
                            return (
                              <div key={docType} className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isUploaded ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{docType}</span>
                                <span className={`text-[10px] ml-auto ${isUploaded ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                  {isUploaded ? 'Uploaded' : 'Missing'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {docRequirements.missingDocTypes.length > 0 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                            <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                            {docRequirements.missingDocTypes.length} required document type{docRequirements.missingDocTypes.length > 1 ? 's' : ''} not yet uploaded
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleRunEligibility}
                        disabled={issuanceActionLoading !== null}
                        className="flex-1 px-3 py-2 bg-brand-deep text-white rounded-lg text-xs font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
                      >
                        {issuanceActionLoading === 'eligibility' ? 'Running...' : 'Run Eligibility'}
                      </button>
                      <button
                        onClick={handleRunExtraction}
                        disabled={issuanceActionLoading !== null}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {issuanceActionLoading === 'extraction' ? 'Running...' : 'Run Extraction'}
                      </button>
                    </div>

                    {issuanceCase.status === 'EXTRACTION_COMPLETE' && (
                      <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                        <button
                          onClick={() => handleAdvanceToReview()}
                          disabled={advanceLoading}
                          className="w-full px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {advanceLoading ? (
                            'Advancing...'
                          ) : (
                            <>
                              <i className="fa-solid fa-arrow-right"></i>
                              Advance to Review
                              {issuanceCase.eligibilityStatus !== 'PASS' && (
                                <span className="bg-amber-700 px-1.5 py-0.5 rounded text-[10px]">Override Required</span>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {issuanceCase.status && ['APPROVED', 'MINT_READY', 'REVIEW_READY'].includes(issuanceCase.status) && (
                      <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                        <button
                          onClick={handleMintAndActivate}
                          disabled={mintActivateLoading}
                          className="w-full px-3 py-2.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {mintActivateLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Minting & Activating...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-rocket"></i>
                              Mint & Activate
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                          Deploy token, mint supply to treasury, and set case LIVE
                        </p>
                      </div>
                    )}

                    {mintActivateResult && (
                      <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">
                            <i className="fa-solid fa-check-circle mr-1"></i>Mint & Activate Complete
                          </p>
                          <div className="space-y-1 text-[10px] text-green-700 dark:text-green-400">
                            {mintActivateResult.steps?.map((step: any, i: number) => (
                              <p key={i}><span className="font-medium">{step.type}:</span> {step.details}</p>
                            ))}
                            {mintActivateResult.deployment && (
                              <p className="font-mono break-all mt-1">Token: {mintActivateResult.deployment.tokenAddress}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {eligibilityChecks.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Eligibility Checks</p>
                        <div className="space-y-2">
                          {eligibilityChecks.map((check) => (
                            <div key={check.key} className="flex items-start gap-2 text-xs">
                              <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                check.status === 'PASS' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                check.status === 'FAIL' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              }`}>
                                {check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '?'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white">{check.key.replace(/_/g, ' ')}</p>
                                {check.details && <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">{check.details}</p>}
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                check.status === 'PASS' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                check.status === 'FAIL' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              }`}>
                                {check.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fieldsData && (
                      <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Critical Fields</p>
                          <button
                            onClick={handleRunExtractionAndRefreshFields}
                            disabled={issuanceActionLoading !== null}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {issuanceActionLoading === 'extraction' ? 'Extracting...' : 'Run Extraction'}
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {fieldsData.criticalKeys.map((key) => {
                            const extracted = fieldsData.extractedFields.find((f: any) => f.key === key);
                            const verified = fieldsData.verifiedFields.find((f: any) => f.key === key);
                            return (
                              <div key={key} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-[#222] rounded-lg px-3 py-2">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${verified ? 'bg-green-500' : extracted ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{key.replace(/_/g, ' ')}</p>
                                  {extracted && !verified && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                      Extracted: {extracted.value}
                                      {extracted.confidence != null && (
                                        <span className={`ml-1 ${extracted.confidence >= 0.8 ? 'text-green-600 dark:text-green-400' : extracted.confidence >= 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                                          ({Math.round(extracted.confidence * 100)}%)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {verified && (
                                    <p className="text-[10px] text-green-600 dark:text-green-400 truncate">
                                      Verified: {verified.value}
                                    </p>
                                  )}
                                </div>
                                {!verified ? (
                                  <button
                                    onClick={() => {
                                      setVerifyModal({ key, extractedValue: extracted?.value || '', confidence: extracted?.confidence ?? null });
                                      setVerifyValue(extracted?.value || '');
                                    }}
                                    className="px-2 py-0.5 bg-brand-deep text-white rounded text-[10px] font-medium hover:bg-brand-dark transition-colors flex-shrink-0"
                                  >
                                    Verify
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium flex-shrink-0">
                                    <i className="fa-solid fa-check mr-0.5"></i>Done
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {fieldsData.extractedFields.filter((f: any) => !fieldsData.criticalKeys.includes(f.key)).length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-gray-400 mb-1">Other Extracted Fields</p>
                            <div className="space-y-1">
                              {fieldsData.extractedFields
                                .filter((f: any) => !fieldsData.criticalKeys.includes(f.key))
                                .map((f: any) => (
                                  <div key={f.id} className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 px-3 py-1">
                                    <span className="font-medium">{f.key.replace(/_/g, ' ')}:</span>
                                    <span className="truncate">{f.value}</span>
                                    {f.confidence != null && <span className="text-gray-400">({Math.round(f.confidence * 100)}%)</span>}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-[10px] text-gray-500">Verified</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                            <span className="text-[10px] text-gray-500">Extracted</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                            <span className="text-[10px] text-gray-500">Missing</span>
                          </div>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {fieldsData.verifiedFields.length}/{fieldsData.criticalKeys.length} verified
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-[#444] pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Offering Packet</p>
                        <div className="flex items-center gap-2">
                          {offeringPacket && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              offeringPacket.status === 'PUBLISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              offeringPacket.status === 'READY' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              'bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-400'
                            }`}>
                              {offeringPacket.status}
                            </span>
                          )}
                          <button
                            onClick={handleGeneratePacket}
                            disabled={packetGenerating}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {packetGenerating ? 'Generating...' : offeringPacket ? 'Regenerate' : 'Generate'}
                          </button>
                        </div>
                      </div>

                      {packetLoading ? (
                        <p className="text-xs text-gray-400 text-center py-2">Loading...</p>
                      ) : offeringPacket ? (
                        <div>
                          <div className="bg-gray-50 dark:bg-[#222] rounded-lg p-3 max-h-64 overflow-y-auto mb-2">
                            <div className="prose prose-xs dark:prose-invert max-w-none text-[11px] leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_table]:text-[10px] [&_table]:w-full [&_th]:text-left [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_blockquote]:text-[10px] [&_blockquote]:border-l-2 [&_blockquote]:pl-2 [&_blockquote]:text-gray-500 [&_li]:ml-3 [&_hr]:my-2">
                              {offeringPacket.markdown.split('\n').map((line: string, i: number) => {
                                if (line.startsWith('# ')) return <h1 key={i} className="text-gray-900 dark:text-white">{line.slice(2)}</h1>;
                                if (line.startsWith('## ')) return <h2 key={i} className="text-gray-900 dark:text-white">{line.slice(3)}</h2>;
                                if (line.startsWith('### ')) return <h3 key={i} className="text-gray-900 dark:text-white">{line.slice(4)}</h3>;
                                if (line.startsWith('> ')) return <blockquote key={i}>{line.slice(2)}</blockquote>;
                                if (line.startsWith('---')) return <hr key={i} />;
                                if (line.startsWith('- ')) return <li key={i} className="text-gray-700 dark:text-gray-300">{line.slice(2)}</li>;
                                if (line.startsWith('| ') && line.includes('---')) return null;
                                if (line.startsWith('| ')) {
                                  const cells = line.split('|').filter(Boolean).map(c => c.trim());
                                  return (
                                    <div key={i} className="flex gap-2 text-gray-700 dark:text-gray-300 px-1">
                                      {cells.map((cell, j) => (
                                        <span key={j} className={j === 0 ? 'font-medium min-w-[120px]' : 'flex-1'}>{cell.replace(/\*\*/g, '')}</span>
                                      ))}
                                    </div>
                                  );
                                }
                                if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="italic text-gray-500 dark:text-gray-400 text-[10px]">{line.replace(/\*/g, '')}</p>;
                                if (line.trim() === '') return <div key={i} className="h-1" />;
                                return <p key={i} className="text-gray-700 dark:text-gray-300">{line}</p>;
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {offeringPacket.status === 'DRAFT' && (
                              <button
                                onClick={() => handlePacketStatus('READY')}
                                disabled={packetStatusLoading}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                Mark Ready
                              </button>
                            )}
                            {(offeringPacket.status === 'DRAFT' || offeringPacket.status === 'READY') && (
                              <button
                                onClick={() => handlePacketStatus('PUBLISHED')}
                                disabled={packetStatusLoading}
                                className="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                Publish
                              </button>
                            )}
                            {offeringPacket.status !== 'DRAFT' && (
                              <button
                                onClick={() => handlePacketStatus('DRAFT')}
                                disabled={packetStatusLoading}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-[10px] font-medium hover:bg-gray-600 disabled:opacity-50 transition-colors"
                              >
                                Revert to Draft
                              </button>
                            )}
                            <span className="text-[10px] text-gray-400 ml-auto">
                              Updated {new Date(offeringPacket.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-2">No packet generated yet. Click Generate to create one from verified fields.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">No issuance case yet</p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-[#2a2a2a] rounded-xl p-4 border border-slate-200 dark:border-[#333]">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-heartbeat text-green-500 text-sm"></i>
                  Engine Health
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Submission Status</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedSubmission.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Issuance Case</p>
                    <p className={`font-medium ${issuanceCase ? 'text-green-600' : 'text-amber-500'}`}>
                      {issuanceCase ? 'Exists' : 'Not Created'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Case Status</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {issuanceCase ? (issuanceCase.status || 'DRAFT').replace(/_/g, ' ') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Issuance Documents</p>
                    <p className="font-medium text-gray-900 dark:text-white">{issuanceDocCount}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#444]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${issuanceCase ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                    <span className="text-xs text-gray-500">
                      {issuanceCase && issuanceDocCount > 0
                        ? 'Engine linked — submission, case, and documents are connected'
                        : issuanceCase
                        ? 'Case exists but no documents tracked yet'
                        : 'No issuance case — engine not yet linked'}
                    </span>
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

      {showOverrideModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Eligibility Override Required</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Eligibility status is <span className="font-semibold text-red-600 dark:text-red-400">{issuanceCase?.eligibilityStatus || 'NOT PASS'}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This case has not passed eligibility checks. To proceed to review, provide a reason for the override. This action will be logged in the audit trail.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter reason for eligibility override..."
              className="w-full border border-gray-300 dark:border-[#444] dark:bg-[#2a2a2a] dark:text-white rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#444] rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdvanceToReview(true)}
                disabled={advanceLoading || !overrideReason.trim()}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 text-sm"
              >
                {advanceLoading ? 'Overriding...' : 'Override & Advance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-check-double text-blue-600 dark:text-blue-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verify Field</h3>
                <p className="text-sm text-gray-500">{verifyModal.key.replace(/_/g, ' ')}</p>
              </div>
            </div>
            {verifyModal.extractedValue && (
              <div className="bg-gray-50 dark:bg-[#222] rounded-lg p-3 mb-4">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Extracted Value</p>
                <p className="text-sm text-gray-900 dark:text-white">{verifyModal.extractedValue}</p>
                {verifyModal.confidence != null && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Confidence: {Math.round(verifyModal.confidence * 100)}%
                  </p>
                )}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verified Value
              </label>
              <input
                type="text"
                value={verifyValue}
                onChange={(e) => setVerifyValue(e.target.value)}
                placeholder="Enter or confirm value..."
                className="w-full border border-gray-300 dark:border-[#444] bg-white dark:bg-[#222] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Leave as-is to accept the extracted value, or edit to correct it.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setVerifyModal(null); setVerifyValue(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#444] rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-[#222] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyField}
                disabled={verifyLoading}
                className="flex-1 px-4 py-2 bg-brand-deep text-white rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50 text-sm"
              >
                {verifyLoading ? 'Verifying...' : 'Confirm & Verify'}
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
