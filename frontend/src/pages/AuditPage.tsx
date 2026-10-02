import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, auditApi } from '../services/api';
import {
  Clock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  User,
  Database,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';

interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_state: any;
  new_state: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const actionColors: Record<string, string> = {
  USER_LOGIN: 'bg-blue-500/20 text-blue-400',
  REQUEST_CREATED: 'bg-green-500/20 text-green-400',
  REQUEST_UPDATED: 'bg-yellow-500/20 text-yellow-400',
  SCORE_CALCULATED: 'bg-purple-500/20 text-purple-400',
  ALLOCATION_STARTED: 'bg-indigo-500/20 text-indigo-400',
  KNAPSACK_COMPLETED: 'bg-purple-500/20 text-purple-400',
  GREEDY_FALLBACK_COMPLETED: 'bg-blue-500/20 text-blue-400',
  EMERGENCY_ALLOCATION: 'bg-red-500/20 text-red-400',
  ALLOCATION_APPROVED: 'bg-green-500/20 text-green-400',
  DISBURSEMENT_CREATED: 'bg-teal-500/20 text-teal-400',
  UC_SUBMITTED: 'bg-blue-500/20 text-blue-400',
  UC_VERIFIED: 'bg-green-500/20 text-green-400',
  CASE_SETTLED: 'bg-gray-500/20 text-gray-400',
};

export function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('entity_id', search);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entity_type', entityTypeFilter);
      if (actorFilter) params.append('actor_id', actorFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get(`/audit?${params.toString()}`);
      setLogs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, search, actionFilter, entityTypeFilter, actorFilter, startDate, endDate]);

  const getActionBadge = (action: string) => (
    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', actionColors[action] || 'bg-gray-500/20 text-gray-400')}>
      {action.replace(/_/g, ' ')}
    </span>
  );

  if (isLoading && logs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            Audit Trail
          </h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Immutable system audit logs for compliance and transparency
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Search entity ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)', minWidth: 200 }}
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="REQUEST_CREATED">Request Created</option>
            <option value="REQUEST_UPDATED">Request Updated</option>
            <option value="SCORE_CALCULATED">Score Calculated</option>
            <option value="ALLOCATION_STARTED">Allocation Started</option>
            <option value="KNAPSACK_COMPLETED">Knapsack Completed</option>
            <option value="GREEDY_FALLBACK_COMPLETED">Greedy Fallback Completed</option>
            <option value="EMERGENCY_ALLOCATION">Emergency Allocation</option>
            <option value="ALLOCATION_APPROVED">Allocation Approved</option>
            <option value="DISBURSEMENT_CREATED">Disbursement Created</option>
            <option value="UC_SUBMITTED">UC Submitted</option>
            <option value="UC_VERIFIED">UC Verified</option>
            <option value="CASE_SETTLED">Case Settled</option>
          </select>
          <select
            value={entityTypeFilter}
            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)', minWidth: 180 }}
          >
            <option value="">All Entity Types</option>
            <option value="User">User</option>
            <option value="FundingRequest">Funding Request</option>
            <option value="AllocationRun">Allocation Run</option>
            <option value="AllocationResult">Allocation Result</option>
            <option value="EmergencyAllocation">Emergency Allocation</option>
            <option value="Disbursement">Disbursement</option>
            <option value="UtilizationCertificate">Utilization Certificate</option>
            <option value="Budget">Budget</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-muted)' }}>
            <Shield className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Entity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Entity ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>IP Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b hover:bg-white/5"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <td className="px-4 py-3 font-mono text-sm">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {log.actor_role === 'ADMIN' && <Shield className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />}
                        {log.actor_role === 'AUDITOR' && <Database className="w-4 h-4" style={{ color: 'var(--color-secondary)' }} />}
                        {log.actor_role === 'DOCTOR' && <User className="w-4 h-4" style={{ color: 'var(--color-highlight)' }} />}
                        <span className="text-sm font-medium">{log.actor_id ? `User #${log.actor_id}` : 'System'}</span>
                        {log.actor_role && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-white/10" style={{ color: 'var(--color-muted)' }}>
                            {log.actor_role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{log.entity_type}</td>
                    <td className="px-4 py-3 font-mono text-sm">{log.entity_id}</td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const details = {
                            old_state: log.old_state,
                            new_state: log.new_state,
                            metadata: log.metadata,
                            user_agent: log.user_agent,
                          };
                          alert(JSON.stringify(details, null, 2));
                        }}
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

        {/* Pagination */}
        {logs.length === pageSize && (
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
              Showing {(page - 1) * pageSize + 1} to {page * pageSize}
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
                Page {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={isLoading}
                className="btn-secondary px-3 py-1.5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="glass-card p-4">
        <h3 className="font-semibold mb-3">Action Legend</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(actionColors).map(([action, color]) => (
            <span key={action} className={clsx('px-2 py-1 rounded-full text-xs', color)}>
              {action.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}