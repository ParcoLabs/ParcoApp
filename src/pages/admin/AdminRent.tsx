import React, { useState, useEffect } from 'react';

interface DistributionRun {
  id: string;
  runType: string;
  triggeredBy: string | null;
  propertiesProcessed: number;
  rentPaymentsProcessed: number;
  holdersDistributed: number;
  totalGrossDistributed: number;
  totalInterestDeducted: number;
  totalNetDistributed: number;
  status: string;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface PendingPayment {
  id: string;
  propertyId: string;
  propertyName: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  netAmount: number;
  managementFee: number;
  perTokenAmount: number;
  createdAt: string;
}

interface DistributionSummary {
  runId: string;
  propertiesProcessed: number;
  rentPaymentsProcessed: number;
  holdersDistributed: number;
  totalGrossDistributed: number;
  totalInterestDeducted: number;
  totalNetDistributed: number;
  status: string;
  errors: string[];
  startedAt: string;
  completedAt: string;
  dryRun: boolean;
}

export const AdminRent: React.FC = () => {
  const [runs, setRuns] = useState<DistributionRun[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<DistributionSummary | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyRes, pendingRes] = await Promise.all([
        fetch('/api/admin/rent/history', { credentials: 'include' }),
        fetch('/api/admin/rent/pending', { credentials: 'include' }),
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setRuns(data.runs);
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingPayments(data.pendingPayments);
      }
    } catch (error) {
      console.error('Error fetching rent data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const runDistribution = async () => {
    setRunning(true);
    setShowConfirmModal(false);
    
    try {
      const response = await fetch('/api/admin/rent/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: isDryRun }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run distribution');
      }

      setLastResult(data.summary);
      showToast(
        isDryRun 
          ? 'Dry run completed successfully!' 
          : `Distribution completed! ${data.summary.holdersDistributed} holders received rent.`,
        'success'
      );
      fetchData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to run distribution', 'error');
    } finally {
      setRunning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-700',
      RUNNING: 'bg-blue-100 text-blue-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'}`}>
        {status}
      </span>
    );
  };

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.netAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Rent Distribution</h2>
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={running || pendingPayments.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {running ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Running...
            </>
          ) : (
            <>
              <i className="fa-solid fa-play"></i>
              Run Rent Distribution Now
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPayments.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-clock text-yellow-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Amount</p>
              <p className="text-2xl font-bold text-emerald-600">${totalPendingAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-dollar-sign text-emerald-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Runs</p>
              <p className="text-2xl font-bold text-gray-900">{runs.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-chart-line text-blue-600"></i>
            </div>
          </div>
        </div>
      </div>

      {lastResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-emerald-900 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-check-circle"></i>
            Last Distribution Result {lastResult.dryRun && '(Dry Run)'}
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-emerald-600 uppercase">Properties</p>
              <p className="text-lg font-bold text-emerald-900">{lastResult.propertiesProcessed}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase">Holders Paid</p>
              <p className="text-lg font-bold text-emerald-900">{lastResult.holdersDistributed}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase">Gross Amount</p>
              <p className="text-lg font-bold text-emerald-900">${lastResult.totalGrossDistributed.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase">Net Distributed</p>
              <p className="text-lg font-bold text-emerald-900">${lastResult.totalNetDistributed.toFixed(2)}</p>
            </div>
          </div>
          {lastResult.totalInterestDeducted > 0 && (
            <p className="text-xs text-emerald-700 mt-2">
              Interest deducted from borrowers: ${lastResult.totalInterestDeducted.toFixed(2)}
            </p>
          )}
          {lastResult.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              Errors: {lastResult.errors.join(', ')}
            </div>
          )}
        </div>
      )}

      {pendingPayments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Pending Rent Payments</h3>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Token</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.propertyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.periodStart).toLocaleDateString()} - {new Date(payment.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${payment.grossAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium">
                      ${payment.netAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${payment.perTokenAmount.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Distribution History</h3>
        {runs.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-12 text-center">
            <i className="fa-solid fa-history text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-600">No distribution runs yet</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Distributed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(run.startedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.runType}
                      {run.triggeredBy && (
                        <span className="text-gray-400 ml-1">by {run.triggeredBy}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.propertiesProcessed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.holdersDistributed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium">
                      ${run.totalNetDistributed.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(run.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Run Rent Distribution</h3>
            <p className="text-gray-600 mb-4">
              This will distribute rent to all token holders with pending rent payments.
            </p>
            <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pending Payments:</span>
                <span className="font-medium">{pendingPayments.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium text-emerald-600">${totalPendingAmount.toFixed(2)}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">Dry run (preview only, no actual distribution)</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={runDistribution}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {isDryRun ? 'Run Preview' : 'Confirm Distribution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
