import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface TokenizationSubmission {
  id: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyCountry: string;
  propertyZipCode: string | null;
  propertyType: string;
  status: string;
  totalValue: number | null;
  tokenPrice: number | null;
  totalTokens: number;
  annualYield: number | null;
  monthlyRent: number | null;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  documents: string[];
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  yearBuilt: number | null;
  ownershipProof: string | null;
  legalDocuments: string[];
  financialStatements: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_REVIEW: { label: 'In Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
  PUBLISHED: { label: 'Listed', color: 'text-purple-700', bg: 'bg-purple-100' },
};

export const TokenizerDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const [submission, setSubmission] = useState<TokenizationSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSubmission();
    }
  }, [id]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`/api/tokenization/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submission');
      }

      const data = await response.json();
      setSubmission(data.submission);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <i className="fa-solid fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
          <h3 className="text-lg font-bold text-red-700 mb-1">Error Loading Submission</h3>
          <p className="text-red-600 text-sm">{error || 'Submission not found'}</p>
          <button
            onClick={() => navigate('/tokenizer/my-properties')}
            className="mt-4 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Back to My Properties
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[submission.status] || STATUS_LABELS.DRAFT;
  const isDraft = submission.status === 'DRAFT';

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/tokenizer/my-properties')}
          className="text-brand-sage hover:text-brand-dark transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-black">
            {submission.propertyAddress || submission.propertyName || 'Untitled Property'}
          </h1>
          <p className="text-sm text-brand-sage">
            {submission.propertyCity && submission.propertyState 
              ? `${submission.propertyCity}, ${submission.propertyState}` 
              : 'Location not set'}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {submission.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-exclamation-triangle text-red-500 mt-0.5"></i>
            <div>
              <h4 className="font-bold text-red-700 text-sm">Rejection Reason</h4>
              <p className="text-red-600 text-sm mt-1">{submission.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-brand-sage/20 rounded-lg p-6">
        <h2 className="text-lg font-bold text-brand-black mb-4">Property Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Property Type</label>
            <p className="text-brand-black font-medium mt-1">{submission.propertyType || 'Not set'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Total Value</label>
            <p className="text-brand-black font-medium mt-1">
              {submission.totalValue ? `$${submission.totalValue.toLocaleString()}` : 'Not set'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Token Price</label>
            <p className="text-brand-black font-medium mt-1">
              {submission.tokenPrice ? `$${submission.tokenPrice.toLocaleString()}` : 'Not set'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Total Tokens</label>
            <p className="text-brand-black font-medium mt-1">{submission.totalTokens || 'Not set'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Annual Yield</label>
            <p className="text-brand-black font-medium mt-1">
              {submission.annualYield ? `${submission.annualYield}%` : 'Not set'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Monthly Rent</label>
            <p className="text-brand-black font-medium mt-1">
              {submission.monthlyRent ? `$${submission.monthlyRent.toLocaleString()}` : 'Not set'}
            </p>
          </div>
        </div>

        {submission.description && (
          <div className="mt-4 pt-4 border-t border-brand-sage/20">
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Description</label>
            <p className="text-brand-black mt-1 text-sm">{submission.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-brand-sage/20 rounded-lg p-6">
        <h2 className="text-lg font-bold text-brand-black mb-4">Property Specifications</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Square Feet</label>
            <p className="text-brand-black font-medium mt-1">
              {submission.squareFeet ? submission.squareFeet.toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Bedrooms</label>
            <p className="text-brand-black font-medium mt-1">{submission.bedrooms || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Bathrooms</label>
            <p className="text-brand-black font-medium mt-1">{submission.bathrooms || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Year Built</label>
            <p className="text-brand-black font-medium mt-1">{submission.yearBuilt || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-brand-sage/20 rounded-lg p-6">
        <h2 className="text-lg font-bold text-brand-black mb-4">Documents & Media</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Images</label>
            <p className="text-brand-black font-medium mt-1">
              {submission.images?.length || 0} uploaded
              {submission.imageUrl && ' (+ cover image)'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Legal Documents</label>
            <p className="text-brand-black font-medium mt-1">{submission.legalDocuments?.length || 0} uploaded</p>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Financial Statements</label>
            <p className="text-brand-black font-medium mt-1">{submission.financialStatements?.length || 0} uploaded</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-brand-sage uppercase tracking-wide">Ownership Proof</label>
          <p className="text-brand-black font-medium mt-1">
            {submission.ownershipProof ? (
              <span className="text-green-600"><i className="fa-solid fa-check-circle mr-1"></i> Uploaded</span>
            ) : (
              <span className="text-amber-600"><i className="fa-solid fa-exclamation-circle mr-1"></i> Not uploaded</span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white border border-brand-sage/20 rounded-lg p-6">
        <h2 className="text-lg font-bold text-brand-black mb-4">Timeline</h2>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <i className="fa-solid fa-check text-green-600 text-xs"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-brand-black">Created</p>
              <p className="text-xs text-brand-sage">{new Date(submission.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          {submission.submittedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <i className="fa-solid fa-paper-plane text-blue-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black">Submitted for Review</p>
                <p className="text-xs text-brand-sage">{new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {submission.reviewedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fa-solid fa-eye text-amber-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black">Reviewed</p>
                <p className="text-xs text-brand-sage">{new Date(submission.reviewedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {submission.approvedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <i className="fa-solid fa-check-double text-green-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black">Approved</p>
                <p className="text-xs text-brand-sage">{new Date(submission.approvedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {submission.publishedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <i className="fa-solid fa-globe text-purple-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black">Listed on Marketplace</p>
                <p className="text-xs text-brand-sage">{new Date(submission.publishedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-amber-800">Draft Mode</h3>
              <p className="text-sm text-amber-700">Complete all required fields to submit for review.</p>
            </div>
            <button
              onClick={() => navigate('/tokenizer/my-properties')}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              Back to My Properties
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
