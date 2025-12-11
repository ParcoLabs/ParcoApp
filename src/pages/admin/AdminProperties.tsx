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

export const AdminProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
        <h2 className="text-xl font-bold text-gray-900">Properties Management</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minted</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.map((property) => (
                <tr key={property.id} className={property.isPaused ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{property.name}</div>
                      <div className="text-sm text-gray-500">{property.city}, {property.state}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(property.status, property.isPaused)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${property.totalValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

      {showMintModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Mint & List</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to mint and list <strong>{selectedProperty.name}</strong>?
            </p>
            <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Total Tokens:</div>
                <div className="font-medium">{selectedProperty.totalTokens.toLocaleString()}</div>
                <div className="text-gray-500">Token Price:</div>
                <div className="font-medium">${selectedProperty.tokenPrice}</div>
                <div className="text-gray-500">Total Value:</div>
                <div className="font-medium">${selectedProperty.totalValue.toLocaleString()}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This will create ERC-1155 tokens on the blockchain and make the property available for purchase in the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMintModal(false);
                  setSelectedProperty(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
