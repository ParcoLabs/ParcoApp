import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  kycStatus: string;
  createdAt: string;
  _count: {
    holdings: number;
    transactions: number;
    borrowPositions?: number;
  };
}

interface InvestorDetail {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    createdAt: string;
  };
  kycStatus: string;
  kycLevel: string;
  holdings: Array<{
    id: string;
    quantity: number;
    totalValue: number;
    averageCost: number;
    totalInvested: number;
    rentEarned: number;
    property: {
      id: string;
      name: string;
      tokenPrice: number;
      annualYield: number;
    };
  }>;
  vaultBalance: {
    usdcBalance: number;
    lockedBalance: number;
    totalDeposited: number;
    totalWithdrawn: number;
    totalEarned: number;
  } | null;
  borrowPositions: Array<{
    id: string;
    principal: number;
    interestRate: number;
    accruedInterest: number;
    collateralValue: number;
    status: string;
    borrowedAt: string;
    collaterals: Array<{
      propertyId: string;
      amount: number;
      valueAtLock: number;
    }>;
  }>;
  rentHistory: Array<{
    id: string;
    propertyId: string;
    grossAmount: number;
    interestDeducted: number;
    netAmount: number;
    distributedAt: string;
    period: { start: string; end: string } | null;
  }>;
  summary: {
    portfolioValue: number;
    totalRentEarned: number;
    totalBorrowed: number;
    holdingsCount: number;
    activeBorrowPositions: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const roleColors: Record<string, { bg: string; text: string }> = {
  USER: { bg: 'bg-gray-100', text: 'text-gray-700' },
  TOKENIZER: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

const kycColors: Record<string, { bg: string; text: string }> = {
  NONE: { bg: 'bg-gray-100', text: 'text-gray-500' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  IN_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  VERIFIED: { bg: 'bg-green-100', text: 'text-green-700' },
  BASIC: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ACCREDITED: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export const AdminInvestors: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      
      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestorDetail = async (userId: string) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/admin/investors/${userId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedInvestor(data);
      }
    } catch (error) {
      console.error('Error fetching investor details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetRole = async () => {
    if (!editingUser || !newRole) return;
    
    try {
      const response = await fetch('/api/admin/user/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: editingUser.id, role: newRole }),
      });
      
      if (response.ok) {
        showToast('Role updated successfully', 'success');
        setEditingUser(null);
        setNewRole('');
        fetchUsers(pagination?.page || 1);
        if (selectedInvestor?.user.id === editingUser.id) {
          fetchInvestorDetail(editingUser.id);
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      showToast('Failed to update role', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  return (
    <div className="flex gap-6">
      <div className={`${selectedInvestor ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Investor Operations</h2>
          <div className="flex gap-3">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="TOKENIZER">Tokenizer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a]">
            <i className="fa-solid fa-users text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">KYC</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Holdings</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedInvestor?.user.id === user.id ? 'bg-emerald-50' : ''}`}
                      onClick={() => fetchInvestorDetail(user.id)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{getUserName(user)}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]?.bg || 'bg-gray-100'} ${roleColors[user.role]?.text || 'text-gray-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${kycColors[user.kycStatus]?.bg || 'bg-gray-100'} ${kycColors[user.kycStatus]?.text || 'text-gray-700'}`}>
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user._count.holdings} properties
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUser(user);
                            setNewRole(user.role);
                          }}
                          className="text-emerald-600 hover:underline text-sm font-medium"
                        >
                          Edit Role
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
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchUsers(pagination.page + 1)}
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
      </div>

      {selectedInvestor && (
        <div className="w-1/2 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedInvestor.user.firstName} {selectedInvestor.user.lastName}
                </h3>
                <p className="text-sm text-gray-500">{selectedInvestor.user.email}</p>
              </div>
              <button
                onClick={() => setSelectedInvestor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[selectedInvestor.user.role]?.bg || 'bg-gray-100'} ${roleColors[selectedInvestor.user.role]?.text || 'text-gray-700'}`}>
                {selectedInvestor.user.role}
              </span>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${kycColors[selectedInvestor.kycStatus]?.bg || 'bg-gray-100'} ${kycColors[selectedInvestor.kycStatus]?.text || 'text-gray-700'}`}>
                KYC: {selectedInvestor.kycStatus}
              </span>
            </div>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-xs text-emerald-600 uppercase font-medium">Portfolio Value</p>
                  <p className="text-xl font-bold text-emerald-700">
                    ${selectedInvestor.summary.portfolioValue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 uppercase font-medium">Total Rent Earned</p>
                  <p className="text-xl font-bold text-blue-700">
                    ${selectedInvestor.summary.totalRentEarned.toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedInvestor.vaultBalance && (
                <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Vault Balance</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">USDC Balance:</div>
                    <div className="font-medium">${selectedInvestor.vaultBalance.usdcBalance.toFixed(2)}</div>
                    <div className="text-gray-500">Locked Balance:</div>
                    <div className="font-medium">${selectedInvestor.vaultBalance.lockedBalance.toFixed(2)}</div>
                    <div className="text-gray-500">Total Deposited:</div>
                    <div className="font-medium">${selectedInvestor.vaultBalance.totalDeposited.toFixed(2)}</div>
                    <div className="text-gray-500">Total Earned:</div>
                    <div className="font-medium text-emerald-600">${selectedInvestor.vaultBalance.totalEarned.toFixed(2)}</div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Holdings ({selectedInvestor.holdings.length})</h4>
                {selectedInvestor.holdings.length === 0 ? (
                  <p className="text-sm text-gray-500">No holdings</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInvestor.holdings.map((holding) => (
                      <div key={holding.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{holding.property.name}</p>
                            <p className="text-xs text-gray-500">{holding.quantity} tokens @ ${holding.property.tokenPrice}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">${holding.totalValue.toFixed(2)}</p>
                            <p className="text-xs text-emerald-600">+${holding.rentEarned.toFixed(2)} rent</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedInvestor.borrowPositions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Borrow Positions ({selectedInvestor.summary.activeBorrowPositions} active)
                  </h4>
                  <div className="space-y-2">
                    {selectedInvestor.borrowPositions.map((pos) => (
                      <div key={pos.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Principal: ${pos.principal.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Interest: ${pos.accruedInterest.toFixed(2)} ({(pos.interestRate * 100).toFixed(1)}%)
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            pos.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'
                          }`}>
                            {pos.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvestor.rentHistory.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Recent Rent Distributions</h4>
                  <div className="space-y-2">
                    {selectedInvestor.rentHistory.slice(0, 5).map((dist) => (
                      <div key={dist.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            {new Date(dist.distributedAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm font-medium text-emerald-600">
                            +${dist.netAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User Role</h3>
            <p className="text-sm text-gray-600 mb-4">
              Changing role for: <span className="font-medium">{editingUser.email}</span>
            </p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="USER">User</option>
              <option value="TOKENIZER">Tokenizer</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setNewRole('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSetRole}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
