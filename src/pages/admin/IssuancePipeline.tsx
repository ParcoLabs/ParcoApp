import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PipelineCase {
  id: string;
  status: string;
  eligibilityStatus: string;
  extractionScore: number;
  track: string;
  targetState: string;
  submission: {
    id: string;
    propertyName: string;
    propertyCity: string;
    propertyState: string;
  };
}

const PIPELINE_COLUMNS = [
  { key: 'DRAFT', label: 'Draft', color: 'bg-gray-400' },
  { key: 'INTAKE_COMPLETE', label: 'Intake Complete', color: 'bg-blue-500' },
  { key: 'EXTRACTION_RUNNING', label: 'Extraction Running', color: 'bg-indigo-500' },
  { key: 'EXTRACTION_COMPLETE', label: 'Extraction Complete', color: 'bg-violet-500' },
  { key: 'REVIEW_READY', label: 'Review Ready', color: 'bg-amber-500' },
  { key: 'APPROVED', label: 'Approved', color: 'bg-green-500' },
  { key: 'MINT_READY', label: 'Mint Ready', color: 'bg-teal-500' },
  { key: 'MINTED', label: 'Minted', color: 'bg-emerald-500' },
  { key: 'LIVE', label: 'Live', color: 'bg-green-600' },
  { key: 'REJECTED', label: 'Rejected', color: 'bg-red-500' },
];

const eligibilityBadge = (status: string) => {
  switch (status) {
    case 'PASS':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'FAIL':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    case 'NEEDS_REVIEW':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  }
};

export const IssuancePipeline: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<PipelineCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTrack, setFilterTrack] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterTrack) params.append('track', filterTrack);
      if (filterEligibility) params.append('eligibilityStatus', filterEligibility);
      const qs = params.toString();
      const res = await fetch(`/api/issuance/cases${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setCases(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching pipeline cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterTrack, filterEligibility]);

  const grouped = PIPELINE_COLUMNS.map(col => ({
    ...col,
    cases: cases.filter(c => c.status === col.key),
  }));

  const handleCardClick = (c: PipelineCase) => {
    navigate(`/admin/tokenizations?submission=${c.submission.id}`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Issuance Pipeline</h2>
        <div className="flex gap-2">
          <select
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            className="border border-gray-300 dark:border-[#444] dark:bg-[#1a1a1a] dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep"
          >
            <option value="">All Tracks</option>
            <option value="SERIES_LLC">Series LLC</option>
            <option value="REG_D">Reg D</option>
            <option value="REG_CF">Reg CF</option>
            <option value="REG_A">Reg A+</option>
          </select>
          <select
            value={filterEligibility}
            onChange={(e) => setFilterEligibility(e.target.value)}
            className="border border-gray-300 dark:border-[#444] dark:bg-[#1a1a1a] dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep"
          >
            <option value="">All Eligibility</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep"></div>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a]">
          <i className="fa-solid fa-diagram-project text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400">No issuance cases found</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {grouped.map(col => (
              <div key={col.key} className="w-64 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {col.label}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {col.cases.length}
                  </span>
                </div>
                <div className="space-y-3 min-h-[120px]">
                  {col.cases.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCardClick(c)}
                      className="w-full text-left bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-3 hover:shadow-md dark:hover:border-[#444] transition-all cursor-pointer"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {c.submission.propertyName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.submission.propertyCity}, {c.submission.propertyState}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
                          {c.track.replace(/_/g, ' ')}
                        </span>
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-medium">
                          {c.targetState}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${eligibilityBadge(c.eligibilityStatus)}`}>
                          {c.eligibilityStatus.replace(/_/g, ' ')}
                        </span>
                        {c.extractionScore > 0 && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            Score: {c.extractionScore}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {col.cases.length === 0 && (
                    <div className="border border-dashed border-gray-200 dark:border-[#333] rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">No cases</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
