import React, { useState, useEffect } from 'react';

interface ComplianceEvidence {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface ComplianceItem {
  id: string;
  propertyId: string;
  caseId: string | null;
  key: string;
  label: string;
  cadence: string;
  status: string;
  dueAt: string;
  notes: string | null;
  evidence: ComplianceEvidence[];
  createdAt: string;
  updatedAt: string;
  property: { id: string; name: string };
}

const STATUS_OPTIONS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];

const statusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'BLOCKED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const cadenceColor = (cadence: string) => {
  switch (cadence) {
    case 'MONTHLY': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'QUARTERLY': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'ANNUAL': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

export const ComplianceDashboard: React.FC = () => {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [windowDays, setWindowDays] = useState(30);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [evidenceForm, setEvidenceForm] = useState<{ id: string; name: string; url: string } | null>(null);
  const [completeForm, setCompleteForm] = useState<{ id: string; notes: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/compliance/due-soon?windowDays=${windowDays}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [windowDays]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const propertyNames = Array.from(new Set(items.map(i => i.property.name)));

  const filtered = items.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (propertyFilter !== 'ALL' && item.property.name !== propertyFilter) return false;
    return true;
  });

  const handleUploadEvidence = async () => {
    if (!evidenceForm || !evidenceForm.name.trim() || !evidenceForm.url.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/servicing/compliance/${evidenceForm.id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: evidenceForm.name, url: evidenceForm.url }),
      });
      if (res.ok) {
        setToast({ message: 'Evidence uploaded successfully', type: 'success' });
        setEvidenceForm(null);
        fetchData();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to upload evidence', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to upload evidence', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!completeForm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/servicing/compliance/${completeForm.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: completeForm.notes || undefined }),
      });
      if (res.ok) {
        setToast({ message: 'Marked as complete', type: 'success' });
        setCompleteForm(null);
        fetchData();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to complete', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to complete', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const daysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    return `${diff}d remaining`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage compliance requirements across all properties</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
          ))}
        </select>

        <select
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="ALL">All Properties</option>
          {propertyNames.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={windowDays}
          onChange={e => setWindowDays(parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
        </select>

        <button
          onClick={fetchData}
          className="px-4 py-2 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90 transition-colors"
        >
          <i className="fa-solid fa-arrows-rotate mr-2"></i>Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-deep"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <i className="fa-solid fa-shield-check text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <p className="text-gray-500 dark:text-gray-400">No compliance items found matching your filters</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requirement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cadence</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <React.Fragment key={item.id}>
                    <tr
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <i className={`fa-solid fa-chevron-${expandedRow === item.id ? 'down' : 'right'} text-xs text-gray-400`}></i>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.property.name}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(item.dueAt)}</div>
                        <div className={`text-xs ${new Date(item.dueAt).getTime() - Date.now() < 7 * 86400000 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {daysUntil(item.dueAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cadenceColor(item.cadence)}`}>
                          {item.cadence}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setEvidenceForm({ id: item.id, name: '', url: '' })}
                            className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Upload evidence"
                          >
                            <i className="fa-solid fa-upload mr-1"></i>Evidence
                          </button>
                          {item.status !== 'COMPLETED' && (
                            <button
                              onClick={() => setCompleteForm({ id: item.id, notes: '' })}
                              className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title="Mark complete"
                            >
                              <i className="fa-solid fa-check mr-1"></i>Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === item.id && (
                      <tr className="bg-gray-50 dark:bg-gray-700/20">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="pl-6 space-y-3">
                            {item.notes && (
                              <div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Notes</span>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.notes}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Evidence ({item.evidence.length})</span>
                              {item.evidence.length > 0 ? (
                                <ul className="mt-1 space-y-1">
                                  {item.evidence.map(ev => (
                                    <li key={ev.id} className="flex items-center gap-2 text-sm">
                                      <i className="fa-solid fa-file text-gray-400 text-xs"></i>
                                      <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {ev.name}
                                      </a>
                                      <span className="text-xs text-gray-400">{formatDate(ev.createdAt)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-400 mt-1">No evidence uploaded yet</p>
                              )}
                            </div>
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>Key: {item.key}</span>
                              <span>Created: {formatDate(item.createdAt)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {evidenceForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEvidenceForm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upload Evidence</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Name</label>
                <input
                  type="text"
                  value={evidenceForm.name}
                  onChange={e => setEvidenceForm({ ...evidenceForm, name: e.target.value })}
                  placeholder="e.g., Q1 Tax Receipt"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  type="text"
                  value={evidenceForm.url}
                  onChange={e => setEvidenceForm({ ...evidenceForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEvidenceForm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadEvidence}
                disabled={submitting || !evidenceForm.name.trim() || !evidenceForm.url.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-deep rounded-lg hover:bg-brand-deep/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completeForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCompleteForm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Mark as Complete</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
              <textarea
                value={completeForm.notes}
                onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCompleteForm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Completing...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
