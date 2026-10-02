import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FundingRequest {
  id: number;
  request_code: string;
  patient_id: number;
  disease_id: number;
  procedure_id: number;
  treatment_package_id: number;
  hospital_id: number;
  requesting_doctor_id: number;
  surgery_cost_inr: number;
  surety_amount_inr: number;
  funding_gap_inr: number;
  urgency_score: number;
  ttc_category: string | null;
  ttc_points: number | null;
  success_rate: number | null;
  success_rate_points: number | null;
  age_factor_points: number | null;
  waiting_days: number;
  waiting_boost: number;
  status: string;
  eligibility_notes: string | null;
  is_emergency: boolean;
  esi_level: number | null;
  created_at: string;
  updated_at: string;
}

interface RequestListResponse {
  items: FundingRequest[];
  total: number;
  page: number;
  page_size: number;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  ELIGIBLE: 'bg-blue-500/20 text-blue-400',
  SELECTED: 'bg-purple-500/20 text-purple-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  DISBURSED: 'bg-teal-500/20 text-teal-400',
  UTILIZATION_PENDING: 'bg-orange-500/20 text-orange-400',
  VERIFIED: 'bg-cyan-500/20 text-cyan-400',
  SETTLED: 'bg-gray-500/20 text-gray-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  EXPIRED: 'bg-slate-500/20 text-slate-400',
};

export function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = new URLSearchParams({
        skip: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/funding-requests?${params.toString()}`);
      setRequests(response.data.items);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, pageSize, search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const getStatusBadge = (status: string) => (
    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[status] || 'bg-gray-500/20 text-gray-400')}>
      {status}
    </span>
  );

  if (isLoading && requests.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Funding Requests</h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Manage and review treatment funding requests
          </p>
        </div>
        {user?.role === 'DOCTOR' && (
          <Link to="/requests/create" className="btn-primary flex items-center gap-2">
            <HeartPulse className="w-5 h-5" />
            New Request
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Search by request code, patient ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ELIGIBLE">Eligible</option>
            <option value="SELECTED">Selected</option>
            <option value="APPROVED">Approved</option>
            <option value="DISBURSED">Disbursed</option>
            <option value="UTILIZATION_PENDING">Utilization Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="SETTLED">Settled</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-red-500/30" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Request Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Patient</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Department</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Urgency Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Funding Gap</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--color-muted)' }}>
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{request.request_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">PV{String(request.patient_id).padStart(5, '0')}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {request.is_emergency && (
                        <span className="flex items-center gap-1 text-red-400" style={{ fontSize: '11px' }}>
                          <AlertTriangle className="w-3 h-3" />
                          EMERGENCY
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                          {request.urgency_score.toFixed(1)}
                        </span>
                        {request.is_emergency && request.esi_level && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                            ESI {request.esi_level}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {formatCurrency(request.funding_gap_inr)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/requests/${request.id}`}
                        className="btn-secondary text-sm px-3 py-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="btn-secondary px-3 py-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-mono" style={{ color: 'var(--color-text)' }}>
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page === Math.ceil(total / pageSize) || isLoading}
                className="btn-secondary px-3 py-1.5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}