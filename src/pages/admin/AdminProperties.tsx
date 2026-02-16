import React, { useState, useEffect } from 'react';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: string;
  propertyType: string;
  totalValue: number;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  annualYield: number;
  isMinted: boolean;
  isListable: boolean;
  isPaused: boolean;
  mintedAt: string | null;
  mintTxHash: string | null;
  token: {
    id: string;
    contractAddress: string | null;
  } | null;
  _count: {
    holdings: number;
    rentPayments: number;
  };
}

interface Capabilities {
  secondaryEnabled: boolean;
  borrowEnabled: boolean;
  transferRestricted: boolean;
  lockupDays: number;
  [key: string]: any;
}

export const AdminProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [capProperty, setCapProperty] = useState<Property | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities>({
    secondaryEnabled: false,
    borrowEnabled: false,
    transferRestricted: false,
    lockupDays: 0,
  });
  const [capLoading, setCapLoading] = useState(false);
  const [capSaving, setCapSaving] = useState(false);
  const [showTransferPolicy, setShowTransferPolicy] = useState(false);
  const [tpProperty, setTpProperty] = useState<Property | null>(null);
  const [tpType, setTpType] = useState('ALLOWLIST_ONLY');
  const [tpLockupDate, setTpLockupDate] = useState('');
  const [tpMaxHolders, setTpMaxHolders] = useState('');
  const [tpMaxPerInvestor, setTpMaxPerInvestor] = useState('');
  const [tpNotes, setTpNotes] = useState('');
  const [tpLoading, setTpLoading] = useState(false);
  const [tpSaving, setTpSaving] = useState(false);
  const [tpHasDeployment, setTpHasDeployment] = useState(false);
  const [tpWarnings, setTpWarnings] = useState<string[]>([]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/properties?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch properties');
      
      const data = await response.json();
      setProperties(data.properties);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [statusFilter]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleMintAndList = async () => {
    if (!selectedProperty) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/properties/${selectedProperty.id}/mint-and-list`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to mint property');
      
      showToast(`Property minted and listed successfully! ${data.demoMode ? '(Demo Mode)' : ''}`, 'success');
      setShowMintModal(false);
      setSelectedProperty(null);
      fetchProperties();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mint property', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseToggle = async (property: Property) => {
    setActionLoading(true);
    try {
      const endpoint = property.isPaused ? 'unpause' : 'pause';
      const response = await fetch(`/api/admin/property/${property.id}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || `Failed to ${endpoint} property`);
      
      showToast(`Property ${endpoint}d successfully!`, 'success');
      fetchProperties();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openCapabilities = async (property: Property) => {
    setCapProperty(property);
    setShowCapabilities(true);
    setCapLoading(true);
    try {
      const res = await fetch(`/api/admin/properties/${property.id}/capabilities`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setCapabilities({
          secondaryEnabled: json.data?.secondaryEnabled ?? false,
          borrowEnabled: json.data?.borrowEnabled ?? false,
          transferRestricted: json.data?.transferRestricted ?? false,
          lockupDays: json.data?.lockupDays ?? 0,
        });
      }
    } catch (err) {
      console.error('Error fetching capabilities:', err);
    } finally {
      setCapLoading(false);
    }
  };

  const saveCapabilities = async () => {
    if (!capProperty) return;
    setCapSaving(true);
    try {
      const res = await fetch(`/api/admin/properties/${capProperty.id}/capabilities`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilities }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      showToast('Capabilities updated successfully!', 'success');
      setShowCapabilities(false);
      setCapProperty(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save capabilities', 'error');
    } finally {
      setCapSaving(false);
    }
  };

  const openTransferPolicy = async (property: Property) => {
    setTpProperty(property);
    setShowTransferPolicy(true);
    setTpLoading(true);
    setTpWarnings([]);
    try {
      const res = await fetch(`/api/properties/${property.id}/transfer-policy`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.policy) {
          setTpType(json.policy.type);
          setTpLockupDate(json.policy.lockupEndsAt ? json.policy.lockupEndsAt.slice(0, 10) : '');
          setTpMaxHolders(json.policy.maxHolders?.toString() || '');
          setTpMaxPerInvestor(json.policy.maxPerInvestorCents?.toString() || '');
          setTpNotes(json.policy.notes || '');
        } else {
          setTpType('ALLOWLIST_ONLY');
          setTpLockupDate('');
          setTpMaxHolders('');
          setTpMaxPerInvestor('');
          setTpNotes('');
        }
        setTpHasDeployment(json.hasOnchainDeployment);
      }
    } catch (err) {
      console.error('Error fetching transfer policy:', err);
    } finally {
      setTpLoading(false);
    }
  };

  const saveTransferPolicy = async () => {
    if (!tpProperty) return;
    setTpSaving(true);
    setTpWarnings([]);
    try {
      const body: any = { type: tpType };
      if (tpLockupDate) body.lockupEndsAt = tpLockupDate;
      if (tpMaxHolders) body.maxHolders = parseInt(tpMaxHolders);
      if (tpMaxPerInvestor) body.maxPerInvestorCents = parseInt(tpMaxPerInvestor);
      if (tpNotes) body.notes = tpNotes;

      const res = await fetch(`/api/properties/${tpProperty.id}/transfer-policy`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      if (json.warnings) {
        setTpWarnings(json.warnings);
      } else {
        showToast('Transfer policy saved' + (json.onchainSynced ? ' and synced on-chain' : ''), 'success');
        setShowTransferPolicy(false);
        setTpProperty(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save transfer policy', 'error');
    } finally {
      setTpSaving(false);
    }
  };

  const needsLockup = ['ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP'].includes(tpType);

  const canMint = (property: Property) => {
    return !property.isMinted && 
           (property.status === 'PENDING_APPROVAL' || property.status === 'DRAFT') &&
           property.totalTokens > 0 &&
           property.tokenPrice > 0;
  };

  const getStatusBadge = (status: string, isPaused: boolean) => {
    if (isPaused) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Paused</span>;
    }
    
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
      FUNDING: 'bg-blue-100 text-blue-700',
      FUNDED: 'bg-green-100 text-green-700',
      ACTIVE: 'bg-emerald-100 text-emerald-700',
      SOLD: 'bg-purple-100 text-purple-700',
      DELISTED: 'bg-red-100 text-red-700',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Properties Management</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="FUNDING">Funding</option>
          <option value="FUNDED">Funded</option>
          <option value="ACTIVE">Active</option>
          <option value="SOLD">Sold</option>
          <option value="DELISTED">Delisted</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>
      )}

      {properties.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-12 text-center">
          <i className="fa-solid fa-building text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-600 mb-2">No properties found</p>
          <p className="text-sm text-gray-400">Properties will appear here once created</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#2a2a2a]">
            <thead className="bg-gray-50 dark:bg-[#151515]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">APY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Minted</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#1a1a1a] divide-y divide-gray-200 dark:divide-[#2a2a2a]">
              {properties.map((property) => (
                <tr key={property.id} className={property.isPaused ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{property.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{property.city}, {property.state}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(property.status, property.isPaused)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${property.totalValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {property.availableTokens} / {property.totalTokens}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium">
                    {property.annualYield}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {property.isMinted ? (
                      <span className="flex items-center text-sm text-emerald-600">
                        <i className="fa-solid fa-check-circle mr-1"></i> Yes
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openCapabilities(property)}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-xs"
                      >
                        <i className="fa-solid fa-sliders mr-1"></i>Capabilities
                      </button>
                      <button
                        onClick={() => openTransferPolicy(property)}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 text-xs"
                      >
                        <i className="fa-solid fa-shield-halved mr-1"></i>Policy
                      </button>
                      {canMint(property) && (
                        <button
                          onClick={() => {
                            setSelectedProperty(property);
                            setShowMintModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs"
                          disabled={actionLoading}
                        >
                          Mint & List
                        </button>
                      )}
                      {property.isMinted && (
                        <button
                          onClick={() => handlePauseToggle(property)}
                          className={`px-3 py-1 rounded-lg text-xs ${
                            property.isPaused
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          disabled={actionLoading}
                        >
                          {property.isPaused ? 'Unpause' : 'Pause'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCapabilities && capProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-lg w-full mx-4 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-sliders text-blue-600"></i>
                Capabilities
              </h3>
              <button
                onClick={() => { setShowCapabilities(false); setCapProperty(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {capProperty.name} &mdash; {capProperty.city}, {capProperty.state}
            </p>

            {capLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Secondary Trading</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Allow token trading on secondary markets (tZERO)</p>
                  </div>
                  <button
                    onClick={() => setCapabilities(c => ({ ...c, secondaryEnabled: !c.secondaryEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      capabilities.secondaryEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      capabilities.secondaryEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Borrow Against Tokens</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enable USDC borrowing with tokens as collateral</p>
                  </div>
                  <button
                    onClick={() => setCapabilities(c => ({ ...c, borrowEnabled: !c.borrowEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      capabilities.borrowEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      capabilities.borrowEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Transfer Restricted</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Restrict token transfers during lockup period</p>
                  </div>
                  <button
                    onClick={() => setCapabilities(c => ({ ...c, transferRestricted: !c.transferRestricted }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      capabilities.transferRestricted ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      capabilities.transferRestricted ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Lockup Period</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Days tokens must be held before transfer</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={capabilities.lockupDays}
                        onChange={(e) => setCapabilities(c => ({ ...c, lockupDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-[#3a3a3a] rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white text-right"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowCapabilities(false); setCapProperty(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCapabilities}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={capSaving}
                  >
                    {capSaving ? 'Saving...' : 'Save Capabilities'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTransferPolicy && tpProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-lg w-full mx-4 border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-purple-600"></i>
                Transfer Policy
              </h3>
              <button
                onClick={() => { setShowTransferPolicy(false); setTpProperty(null); setTpWarnings([]); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {tpProperty.name} &mdash; {tpProperty.city}, {tpProperty.state}
            </p>

            {!tpHasDeployment && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                  No on-chain deployment. Policy will be stored in the database only.
                </p>
              </div>
            )}

            {tpWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4">
                {tpWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-300">
                    <i className="fa-solid fa-circle-info mr-1"></i>{w}
                  </p>
                ))}
                <button
                  onClick={() => { setShowTransferPolicy(false); setTpProperty(null); setTpWarnings([]); }}
                  className="mt-2 text-xs text-amber-800 dark:text-amber-200 underline"
                >
                  Close
                </button>
              </div>
            )}

            {tpLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Policy Type</label>
                  <select
                    value={tpType}
                    onChange={(e) => setTpType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                  >
                    <option value="UNRESTRICTED">Unrestricted</option>
                    <option value="ALLOWLIST_ONLY">Allowlist Only</option>
                    <option value="ALLOWLIST_AND_LOCKUP">Allowlist + Lockup</option>
                    <option value="REG_D_12M_LOCKUP">Reg D 12-Month Lockup</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                {needsLockup && (
                  <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Lockup Ends At</label>
                    <input
                      type="date"
                      value={tpLockupDate}
                      onChange={(e) => setTpLockupDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Max Holders</label>
                    <input
                      type="number"
                      min="0"
                      value={tpMaxHolders}
                      onChange={(e) => setTpMaxHolders(e.target.value)}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Max Per Investor (cents)</label>
                    <input
                      type="number"
                      min="0"
                      value={tpMaxPerInvestor}
                      onChange={(e) => setTpMaxPerInvestor(e.target.value)}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Notes</label>
                  <textarea
                    value={tpNotes}
                    onChange={(e) => setTpNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional notes..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowTransferPolicy(false); setTpProperty(null); setTpWarnings([]); }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTransferPolicy}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    disabled={tpSaving || (needsLockup && !tpLockupDate)}
                  >
                    {tpSaving ? 'Saving...' : 'Save Policy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showMintModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Confirm Mint & List</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to mint and list <strong>{selectedProperty.name}</strong>?
            </p>
            <div className="bg-gray-50 dark:bg-[#222] rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500 dark:text-gray-400">Total Tokens:</div>
                <div className="font-medium text-gray-900 dark:text-white">{selectedProperty.totalTokens.toLocaleString()}</div>
                <div className="text-gray-500 dark:text-gray-400">Token Price:</div>
                <div className="font-medium text-gray-900 dark:text-white">${selectedProperty.tokenPrice}</div>
                <div className="text-gray-500 dark:text-gray-400">Total Value:</div>
                <div className="font-medium text-gray-900 dark:text-white">${selectedProperty.totalValue.toLocaleString()}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              This will create ERC-1155 tokens on the blockchain and make the property available for purchase in the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMintModal(false);
                  setSelectedProperty(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#3a3a3a] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222]"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleMintAndList}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Mint & List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
