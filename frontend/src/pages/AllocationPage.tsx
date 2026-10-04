import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, allocationApi, dashboardApi } from '../services/api';
import {
  HeartPulse,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
} from 'lucide-react';
import { clsx } from 'clsx';

interface AllocationRun {
  id: number;
  run_code: string;
  budget_id: number;
  total_requests: number;
  eligible_requests: number;
  selected_requests: number;
  total_allocated_inr: number;
  total_urgency_funded: number;
  knapsack_budget_inr: number;
  knapsack_allocated_inr: number;
  knapsack_requests: number;
  greedy_budget_inr: number;
  greedy_allocated_inr: number;
  greedy_requests: number;
  emergency_budget_inr: number;
  emergency_allocated_inr: number;
  emergency_requests: number;
  remaining_budget_inr: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  executed_by: number;
}

interface AllocationResult {
  id: number;
  allocation_run_id: number;
  funding_request_id: number;
  allocation_stage: string;
  allocated_amount_inr: number;
  urgency_score: number;
  selection_order: number | null;
  is_selected: boolean;
  notes: string | null;
  created_at: string;
  funding_request?: {
    request_code: string;
    patient_id: number;
    urgency_score: number;
    funding_gap_inr: number;
    status: string;
  };
}

interface AllocationDetails {
  run: AllocationRun;
  results: AllocationResult[];
  knapsack_details: any;
  greedy_details: any;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const stageColors: Record<string, string> = {
  KNAPSACK: 'bg-purple-500/20 text-purple-400',
  GREEDY_FALLBACK: 'bg-blue-500/20 text-blue-400',
  EMERGENCY: 'bg-red-500/20 text-red-400',
};

export function AllocationPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<AllocationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AllocationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'runs' | 'details'>('runs');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchRuns = async () => {
    try {
      setIsLoading(true);
      // We'll fetch allocation runs from the backend
      const response = await api.get('/allocation/runs');
      setRuns(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load allocation runs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRunDetails = async (runId: number) => {
    try {
      setIsLoading(true);
      const response = await allocationApi.getDetails(runId);
      setSelectedRun(response.data);
      setActiveTab('details');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load allocation details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAllocation = async () => {
    try {
      setIsRunning(true);
      setError('');
      setSuccess('');
      // Get active budget
      const budgetRes = await api.get('/budgets?is_active=true');
      if (!budgetRes.data.length) {
        setError('No active budget found. Please create a budget first.');
        return;
      }
      const budgetId = budgetRes.data[0].id;
      const response = await allocationApi.run(budgetId);
      setSuccess(`Allocation ${response.data.run_code} completed successfully!`);
      fetchRuns();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run allocation');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const selectedResults = selectedRun?.results || [];
  const knapsackResults = selectedResults.filter(r => r.allocation_stage === 'KNAPSACK');
  const greedyResults = selectedResults.filter(r => r.allocation_stage === 'GREEDY_FALLBACK');
  const emergencyResults = selectedResults.filter(r => r.allocation_stage === 'EMERGENCY');
  const selectedItems = selectedResults.filter(r => r.is_selected);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Allocation Engine</h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Run 0/1 Knapsack allocation with greedy fallback
          </p>
        </div>
        <button
          onClick={handleRunAllocation}
          disabled={isRunning || user?.role !== 'ADMIN'}
          className="btn-primary flex items-center gap-2"
        >
          {isRunning && <Loader2 className="w-5 h-5 animate-spin" />}
          <TrendingUp className="w-5 h-5" />
          Run Allocation
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="glass-card p-4 border-green-500/30 flex items-center gap-3" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
          <p style={{ color: '#22C55E' }}>{success}</p>
        </div>
      )}

      {activeTab === 'runs' ? (
        <>
          {/* Allocation Runs List */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
              <h2 className="text-xl font-semibold">Allocation Runs</h2>
            </div>
            {isLoading && runs.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : runs.length === 0 ? (
              <div className="p-12 text-center" style={{ color: 'var(--color-muted)' }}>
                <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                <p>No allocation runs yet. Click "Run Allocation" to start.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Run Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Total Requests</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Selected</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Allocated</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Knapsack</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Greedy</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Emergency</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Remaining</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr
                        key={run.id}
                        className="border-b hover:bg-white/5 transition-colors"
                        style={{ borderColor: 'var(--color-card-border)' }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">{run.run_code}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(run.started_at)}</td>
                        <td className="px-4 py-3 text-sm">{run.total_requests}</td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{run.selected_requests}</td>
                        <td className="px-4 py-3 text-sm font-mono">{formatCurrency(run.total_allocated_inr)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={clsx('px-2 py-0.5 rounded text-xs', stageColors.KNAPSACK)}>
                            {run.knapsack_requests} / {formatCurrency(run.knapsack_allocated_inr)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={clsx('px-2 py-0.5 rounded text-xs', stageColors.GREEDY_FALLBACK)}>
                            {run.greedy_requests} / {formatCurrency(run.greedy_allocated_inr)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={clsx('px-2 py-0.5 rounded text-xs', stageColors.EMERGENCY)}>
                            {run.emergency_requests} / {formatCurrency(run.emergency_allocated_inr)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--color-highlight)' }}>
                          {formatCurrency(run.remaining_budget_inr)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                            {run.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => fetchRunDetails(run.id)}
                            className="btn-secondary text-sm px-3 py-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Allocation Details */}
          {selectedRun && (
            <div className="space-y-6">
              {/* Back Button & Run Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setActiveTab('runs'); setSelectedRun(null); }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Runs
                </button>
                <div className="flex items-center gap-4">
                  <div className="glass-card p-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Run Code</p>
                    <p className="font-mono text-lg">{selectedRun.run.run_code}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Total Allocated</p>
                    <p className="font-mono text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                      {formatCurrency(selectedRun.run.total_allocated_inr)}
                    </p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Packages Funded</p>
                    <p className="font-mono text-lg font-bold" style={{ color: 'var(--color-highlight)' }}>
                      {selectedRun.run.selected_requests}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stage Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 border-l-4" style={{ borderColor: 'var(--color-primary)' }}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">KNAPSACK</span></h3>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    {selectedRun.run.knapsack_requests}
                  </p>
                  <p style={{ color: 'var(--color-secondary)' }}>
                    {formatCurrency(selectedRun.run.knapsack_allocated_inr)} / {formatCurrency(selectedRun.run.knapsack_budget_inr)}
                  </p>
                </div>
                <div className="glass-card p-6 border-l-4" style={{ borderColor: 'var(--color-highlight)' }}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">GREEDY</span></h3>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-highlight)' }}>
                    {selectedRun.run.greedy_requests}
                  </p>
                  <p style={{ color: 'var(--color-secondary)' }}>
                    {formatCurrency(selectedRun.run.greedy_allocated_inr)} / {formatCurrency(selectedRun.run.greedy_budget_inr)}
                  </p>
                </div>
                <div className="glass-card p-6 border-l-4" style={{ borderColor: '#EF4444' }}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">EMERGENCY</span></h3>
                  <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>
                    {selectedRun.run.emergency_requests}
                  </p>
                  <p style={{ color: 'var(--color-secondary)' }}>
                    {formatCurrency(selectedRun.run.emergency_allocated_inr)} / {formatCurrency(selectedRun.run.emergency_budget_inr)}
                  </p>
                </div>
              </div>

              {/* Results Table */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-card-border)' }}>
                  <h2 className="text-xl font-semibold">Allocation Results</h2>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                    <select
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                      style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                    >
                      <option value="runs">All Results</option>
                      <option value="details">Selected Only</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>#</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Request Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Patient</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Stage</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Urgency Score</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Funding Gap</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Allocated</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Selected</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResults.map((result, index) => (
                        <tr
                          key={result.id}
                          className={clsx('border-b hover:bg-white/5 transition-colors', !result.is_selected && 'opacity-50')}
                          style={{ borderColor: 'var(--color-card-border)' }}
                        >
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm">{result.funding_request?.request_code || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {result.funding_request ? `PV${String(result.funding_request.patient_id).padStart(5, '0')}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('px-2 py-0.5 rounded text-xs', stageColors[result.allocation_stage])}>
                              {result.allocation_stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-primary)' }}>
                            {result.urgency_score.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {formatCurrency(result.funding_request?.funding_gap_inr || 0)}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm" style={{ color: result.is_selected ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                            {result.is_selected ? formatCurrency(result.allocated_amount_inr) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {result.is_selected ? (
                              <CheckCircle className="w-5 h-5" style={{ color: '#22C55E' }} />
                            ) : (
                              <span style={{ color: 'var(--color-muted)' }}>Not selected</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {result.selection_order || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Knapsack Details */}
              {selectedRun.knapsack_details && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">KNAPSACK DETAILS</span></h3>
                  <pre className="text-xs overflow-x-auto p-4 rounded-xl" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                    {JSON.stringify(selectedRun.knapsack_details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Greedy Details */}
              {selectedRun.greedy_details && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">GREEDY FALLBACK DETAILS</span></h3>
                  <pre className="text-xs overflow-x-auto p-4 rounded-xl" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                    {JSON.stringify(selectedRun.greedy_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}