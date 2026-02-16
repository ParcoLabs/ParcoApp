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

interface FormData {
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZipCode: string;
  propertyType: string;
  totalValue: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  yearBuilt: string;
  monthlyRent: string;
  tokenPrice: string;
  totalTokens: string;
  annualYield: string;
  description: string;
}

const PROPERTY_TYPES = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
  { value: 'LAND', label: 'Land' },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_REVIEW: { label: 'In Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
  PUBLISHED: { label: 'Listed', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const submissionToForm = (s: TokenizationSubmission): FormData => ({
  propertyName: s.propertyName === 'Untitled Property' ? '' : s.propertyName || '',
  propertyAddress: s.propertyAddress || '',
  propertyCity: s.propertyCity || '',
  propertyState: s.propertyState || '',
  propertyZipCode: s.propertyZipCode || '',
  propertyType: s.propertyType || 'RESIDENTIAL',
  totalValue: s.totalValue && s.totalValue > 0 ? String(s.totalValue) : '',
  squareFeet: s.squareFeet ? String(s.squareFeet) : '',
  bedrooms: s.bedrooms ? String(s.bedrooms) : '',
  bathrooms: s.bathrooms ? String(s.bathrooms) : '',
  yearBuilt: s.yearBuilt ? String(s.yearBuilt) : '',
  monthlyRent: s.monthlyRent && s.monthlyRent > 0 ? String(s.monthlyRent) : '',
  tokenPrice: s.tokenPrice && s.tokenPrice > 0 ? String(s.tokenPrice) : '',
  totalTokens: s.totalTokens && s.totalTokens > 0 ? String(s.totalTokens) : '',
  annualYield: s.annualYield && s.annualYield > 0 ? String(s.annualYield) : '',
  description: s.description || '',
});

export const TokenizerDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const [submission, setSubmission] = useState<TokenizationSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      setForm(submissionToForm(data.submission));
      setDirty(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    try {
      const token = await getToken();
      const body: Record<string, any> = {
        propertyName: form.propertyName || 'Untitled Property',
        propertyAddress: form.propertyAddress,
        propertyCity: form.propertyCity,
        propertyState: form.propertyState,
        propertyZipCode: form.propertyZipCode,
        propertyType: form.propertyType,
        description: form.description,
      };

      if (form.totalValue) body.totalValue = parseFloat(form.totalValue);
      if (form.squareFeet) body.squareFeet = parseInt(form.squareFeet, 10);
      if (form.bedrooms) body.bedrooms = parseInt(form.bedrooms, 10);
      if (form.bathrooms) body.bathrooms = parseFloat(form.bathrooms);
      if (form.yearBuilt) body.yearBuilt = parseInt(form.yearBuilt, 10);
      if (form.monthlyRent) body.monthlyRent = parseFloat(form.monthlyRent);
      if (form.tokenPrice) body.tokenPrice = parseFloat(form.tokenPrice);
      if (form.totalTokens) body.totalTokens = parseInt(form.totalTokens, 10);
      if (form.annualYield) body.annualYield = parseFloat(form.annualYield);

      const response = await fetch(`/api/tokenization/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(errData.error || 'Save failed');
      }

      const data = await response.json();
      setSubmission(data.submission);
      setForm(submissionToForm(data.submission));
      setDirty(false);
      showToast('Saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
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

  if (error || !submission || !form) {
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

  const inputCls = "w-full px-3 py-2 rounded-lg border border-brand-sage/30 dark:border-[#444] bg-white dark:bg-[#222] text-brand-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/40 focus:border-brand-deep placeholder:text-gray-400 dark:placeholder:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelCls = "block text-xs font-medium text-brand-sage uppercase tracking-wide mb-1";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/tokenizer/my-properties')}
          className="text-brand-sage hover:text-brand-dark dark:hover:text-white transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-brand-black dark:text-white truncate">
            {submission.propertyAddress || submission.propertyName || 'Untitled Property'}
          </h1>
          <p className="text-sm text-brand-sage">
            {submission.propertyCity && submission.propertyState
              ? `${submission.propertyCity}, ${submission.propertyState}`
              : 'Location not set'}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {submission.rejectionReason && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-exclamation-triangle text-red-500 mt-0.5"></i>
            <div>
              <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">Rejection Reason</h4>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{submission.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-pen-to-square text-brand-deep"></i>
              <h2 className="text-lg font-bold text-brand-black dark:text-white">Application</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="bg-brand-deep hover:bg-brand-dark disabled:opacity-40 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
            >
              {saving ? (
                <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div> Saving...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk"></i> Save</>
              )}
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-brand-dark dark:text-gray-300 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-location-dot text-brand-sage text-xs"></i> Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className={labelCls}>Property Name</label>
                  <input type="text" className={inputCls} placeholder="e.g. Sunset Ridge Apartments" value={form.propertyName} onChange={e => handleChange('propertyName', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Street Address</label>
                  <input type="text" className={inputCls} placeholder="123 Main Street" value={form.propertyAddress} onChange={e => handleChange('propertyAddress', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" className={inputCls} placeholder="Miami" value={form.propertyCity} onChange={e => handleChange('propertyCity', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" className={inputCls} placeholder="FL" value={form.propertyState} onChange={e => handleChange('propertyState', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Zip Code</label>
                  <input type="text" className={inputCls} placeholder="33101" value={form.propertyZipCode} onChange={e => handleChange('propertyZipCode', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Property Type</label>
                  <select className={inputCls} value={form.propertyType} onChange={e => handleChange('propertyType', e.target.value)}>
                    {PROPERTY_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-brand-sage/10 dark:border-[#333] pt-5">
              <h3 className="text-sm font-semibold text-brand-dark dark:text-gray-300 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-ruler-combined text-brand-sage text-xs"></i> Specifications
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Square Feet</label>
                  <input type="number" className={inputCls} placeholder="2,400" value={form.squareFeet} onChange={e => handleChange('squareFeet', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Bedrooms</label>
                  <input type="number" className={inputCls} placeholder="4" value={form.bedrooms} onChange={e => handleChange('bedrooms', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Bathrooms</label>
                  <input type="number" step="0.5" className={inputCls} placeholder="2.5" value={form.bathrooms} onChange={e => handleChange('bathrooms', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Year Built</label>
                  <input type="number" className={inputCls} placeholder="2005" value={form.yearBuilt} onChange={e => handleChange('yearBuilt', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-brand-sage/10 dark:border-[#333] pt-5">
              <h3 className="text-sm font-semibold text-brand-dark dark:text-gray-300 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-dollar-sign text-brand-sage text-xs"></i> Financials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Total Property Value ($)</label>
                  <input type="number" className={inputCls} placeholder="500,000" value={form.totalValue} onChange={e => handleChange('totalValue', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Monthly Rent ($)</label>
                  <input type="number" className={inputCls} placeholder="3,200" value={form.monthlyRent} onChange={e => handleChange('monthlyRent', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Annual Yield (%)</label>
                  <input type="number" step="0.01" className={inputCls} placeholder="7.5" value={form.annualYield} onChange={e => handleChange('annualYield', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-brand-sage/10 dark:border-[#333] pt-5">
              <h3 className="text-sm font-semibold text-brand-dark dark:text-gray-300 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-coins text-brand-sage text-xs"></i> Token Terms (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Token Price ($)</label>
                  <input type="number" step="0.01" className={inputCls} placeholder="50.00" value={form.tokenPrice} onChange={e => handleChange('tokenPrice', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Total Tokens</label>
                  <input type="number" className={inputCls} placeholder="10,000" value={form.totalTokens} onChange={e => handleChange('totalTokens', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-brand-sage/10 dark:border-[#333] pt-5">
              <label className={labelCls}>Description</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                placeholder="Describe the property, neighborhood, investment highlights..."
                rows={3}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-brand-black dark:text-white mb-4">Property Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Property Type</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {PROPERTY_TYPES.find(pt => pt.value === submission.propertyType)?.label || submission.propertyType || '-'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Total Value</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.totalValue && submission.totalValue > 0 ? `$${submission.totalValue.toLocaleString()}` : '-'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Token Price</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.tokenPrice && submission.tokenPrice > 0 ? `$${submission.tokenPrice.toLocaleString()}` : '-'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Total Tokens</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.totalTokens && submission.totalTokens > 0 ? submission.totalTokens.toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Annual Yield</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.annualYield && submission.annualYield > 0 ? `${submission.annualYield}%` : '-'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Monthly Rent</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.monthlyRent && submission.monthlyRent > 0 ? `$${submission.monthlyRent.toLocaleString()}` : '-'}
            </p>
          </div>
        </div>

        {submission.description && (
          <div className="mt-4 pt-4 border-t border-brand-sage/20 dark:border-[#333]">
            <label className={labelCls}>Description</label>
            <p className="text-brand-black dark:text-gray-300 mt-1 text-sm">{submission.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-brand-black dark:text-white mb-4">Property Specifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Square Feet</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.squareFeet ? submission.squareFeet.toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Bedrooms</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">{submission.bedrooms || '-'}</p>
          </div>
          <div>
            <label className={labelCls}>Bathrooms</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">{submission.bathrooms || '-'}</p>
          </div>
          <div>
            <label className={labelCls}>Year Built</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">{submission.yearBuilt || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-brand-black dark:text-white mb-4">Documents & Media</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Images</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">
              {submission.images?.length || 0} uploaded
              {submission.imageUrl && ' (+ cover image)'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Legal Documents</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">{submission.legalDocuments?.length || 0} uploaded</p>
          </div>
          <div>
            <label className={labelCls}>Financial Statements</label>
            <p className="text-brand-black dark:text-white font-medium mt-1">{submission.financialStatements?.length || 0} uploaded</p>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelCls}>Ownership Proof</label>
          <p className="text-brand-black dark:text-white font-medium mt-1">
            {submission.ownershipProof ? (
              <span className="text-green-600"><i className="fa-solid fa-check-circle mr-1"></i> Uploaded</span>
            ) : (
              <span className="text-amber-600"><i className="fa-solid fa-exclamation-circle mr-1"></i> Not uploaded</span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-brand-sage/20 dark:border-[#2a2a2a] rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-brand-black dark:text-white mb-4">Timeline</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <i className="fa-solid fa-check text-green-600 text-xs"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-brand-black dark:text-white">Created</p>
              <p className="text-xs text-brand-sage">{new Date(submission.createdAt).toLocaleString()}</p>
            </div>
          </div>
          {submission.submittedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <i className="fa-solid fa-paper-plane text-blue-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black dark:text-white">Submitted for Review</p>
                <p className="text-xs text-brand-sage">{new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          {submission.reviewedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <i className="fa-solid fa-eye text-amber-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black dark:text-white">Reviewed</p>
                <p className="text-xs text-brand-sage">{new Date(submission.reviewedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          {submission.approvedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <i className="fa-solid fa-check-double text-green-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black dark:text-white">Approved</p>
                <p className="text-xs text-brand-sage">{new Date(submission.approvedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          {submission.publishedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <i className="fa-solid fa-globe text-purple-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-black dark:text-white">Listed on Marketplace</p>
                <p className="text-xs text-brand-sage">{new Date(submission.publishedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isDraft && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-300">Draft Mode</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">Complete all required fields and upload documents to submit for review.</p>
            </div>
            <button
              onClick={() => navigate('/tokenizer')}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
