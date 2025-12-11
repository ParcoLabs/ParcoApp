import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';

interface DemoProposal {
  id: string;
  title: string;
  description: string;
  estimatedCost: number;
  timelineWeeks: number;
  expectedAppreciation: number;
  status: string;
  forVotes: number;
  againstVotes: number;
  totalVotes: number;
  userVote: 'FOR' | 'AGAINST' | null;
  createdAt: string;
}

export const Governance: React.FC = () => {
  const navigate = useNavigate();
  const { demoMode } = useDemoMode();
  const { getDemoGovernanceProposals, voteOnDemoProposal, getDemoStatus, setupDemoUser, loading, error } = useDemo();
  
  const [proposals, setProposals] = useState<DemoProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<DemoProposal | null>(null);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    const checkDemoStatus = async () => {
      if (demoMode) {
        setIsLoadingStatus(true);
        const status = await getDemoStatus();
        setDemoStatus(status);
        setIsLoadingStatus(false);
        if (status?.vault?.balance > 0) {
          loadProposals();
        }
      } else {
        setIsLoadingStatus(false);
      }
    };
    checkDemoStatus();
  }, [demoMode]);

  const loadProposals = async () => {
    const data = await getDemoGovernanceProposals();
    if (data) setProposals(data);
  };

  const handleVote = async (proposalId: string, choice: 'FOR' | 'AGAINST') => {
    const result = await voteOnDemoProposal(proposalId, choice);
    if (result) {
      setVoteSuccess(`Vote recorded: ${choice}`);
      setSelectedProposal(null);
      await loadProposals();
      setTimeout(() => setVoteSuccess(null), 3000);
    }
  };

  const getVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return (votes / total) * 100;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSetupDemo = async () => {
    const result = await setupDemoUser();
    if (result) {
      const status = await getDemoStatus();
      setDemoStatus(status);
      if (status?.vault?.balance > 0) {
        loadProposals();
      }
    }
  };

  if (!demoMode) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#101010] flex items-center justify-center p-4 pt-20 md:pt-8 pb-24 md:pb-8">
        <div className="text-center">
          <i className="fa-solid fa-gavel text-4xl text-brand-sage dark:text-gray-400 mb-4"></i>
          <h2 className="text-xl font-bold text-brand-dark dark:text-white mb-2">Governance Unavailable</h2>
          <p className="text-brand-sage dark:text-gray-400">Governance features are only available in demo mode.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-brand-deep hover:bg-brand-dark text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingStatus) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#101010] flex items-center justify-center p-4 pt-20 md:pt-8 pb-24 md:pb-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  if (!demoStatus?.vault?.balance) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#101010] flex items-center justify-center p-4 pt-20 md:pt-8 pb-24 md:pb-8">
        <div className="text-center max-w-md">
          <i className="fa-solid fa-gavel text-4xl text-amber-500 mb-4"></i>
          <h2 className="text-xl font-bold text-brand-dark dark:text-white mb-2">Setup Demo First</h2>
          <p className="text-brand-sage dark:text-gray-400 mb-4">
            You need to setup your demo account before you can participate in governance. 
            This will give you $25,000 USDC and auto-approve your KYC.
          </p>
          <button
            onClick={handleSetupDemo}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Setting Up...' : 'Start Demo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#101010] p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark dark:text-white">Governance</h1>
          <p className="text-sm text-brand-sage dark:text-gray-400">Vote on property improvement proposals</p>
        </div>

        {/* Demo Mode Badge */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-sm text-amber-800">Demo Governance - Vote on property improvement proposals</span>
        </div>

        {voteSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-check-circle text-green-600"></i>
            <span className="text-sm text-green-800">{voteSuccess}</span>
          </div>
        )}

        {/* Proposals List */}
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-8 text-center">
              <i className="fa-solid fa-inbox text-4xl text-brand-sage dark:text-gray-400 mb-4"></i>
              <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-2">Loading Proposals...</h3>
              <p className="text-sm text-brand-sage dark:text-gray-400">Fetching governance proposals...</p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#2a2a2a] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        proposal.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700'
                          : proposal.status === 'PASSED'
                          ? 'bg-blue-100 text-blue-700'
                          : proposal.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {proposal.status}
                      </span>
                      <span className="text-xs text-brand-sage dark:text-gray-400">
                        Created {formatDate(proposal.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-brand-dark dark:text-white">{proposal.title}</h3>
                    <p className="text-sm text-brand-sage dark:text-gray-400 mt-1">{proposal.description}</p>
                  </div>
                </div>

                {/* Proposal Details */}
                <div className="grid grid-cols-3 gap-4 mb-4 bg-white dark:bg-[#101010] rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-xs text-brand-sage dark:text-gray-400">Est. Cost</p>
                    <p className="font-bold text-brand-dark dark:text-white">${proposal.estimatedCost?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-brand-sage dark:text-gray-400">Timeline</p>
                    <p className="font-bold text-brand-dark dark:text-white">{proposal.timelineWeeks || 0} weeks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-brand-sage dark:text-gray-400">Exp. Appreciation</p>
                    <p className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">+{proposal.expectedAppreciation || 0}%</p>
                  </div>
                </div>

                {/* Vote Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-brand-sage dark:text-gray-400 mb-1">
                    <span>For: {proposal.forVotes}</span>
                    <span>Against: {proposal.againstVotes}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 h-full transition-all"
                      style={{ width: `${getVotePercentage(proposal.forVotes, proposal.totalVotes)}%` }}
                    ></div>
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{ width: `${getVotePercentage(proposal.againstVotes, proposal.totalVotes)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-brand-sage dark:text-gray-400 mt-1">{proposal.totalVotes} total votes</p>
                </div>

                {/* Vote Button or Status */}
                {proposal.userVote ? (
                  <div className="w-full text-center py-2.5 rounded-lg bg-white dark:bg-[#101010]">
                    <span className="text-sm text-brand-sage dark:text-gray-400">
                      You voted: <span className={`font-bold ${proposal.userVote === 'FOR' ? 'text-green-600' : 'text-red-600'}`}>{proposal.userVote}</span>
                    </span>
                  </div>
                ) : proposal.status === 'ACTIVE' ? (
                  <button
                    onClick={() => setSelectedProposal(proposal)}
                    className="w-full bg-brand-deep hover:bg-brand-dark text-white py-2.5 rounded-lg font-bold text-sm transition-colors"
                  >
                    Cast Vote
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Vote Modal */}
        {selectedProposal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-dark dark:text-white">Cast Your Vote</h3>
                <button onClick={() => setSelectedProposal(null)} className="text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:text-white">
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-brand-dark dark:text-white">{selectedProposal.title}</h4>
                <p className="text-sm text-brand-sage dark:text-gray-400 mt-1 line-clamp-3">{selectedProposal.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 bg-white dark:bg-[#101010] rounded-lg p-3 text-sm">
                <div className="text-center">
                  <p className="text-xs text-brand-sage dark:text-gray-400">Cost</p>
                  <p className="font-bold text-brand-dark dark:text-white">${selectedProposal.estimatedCost?.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-brand-sage dark:text-gray-400">Timeline</p>
                  <p className="font-bold text-brand-dark dark:text-white">{selectedProposal.timelineWeeks} wks</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-brand-sage dark:text-gray-400">Appreciation</p>
                  <p className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">+{selectedProposal.expectedAppreciation}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleVote(selectedProposal.id, 'FOR')}
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>
                  Vote For
                </button>
                <button
                  onClick={() => handleVote(selectedProposal.id, 'AGAINST')}
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-times"></i>
                  Vote Against
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
