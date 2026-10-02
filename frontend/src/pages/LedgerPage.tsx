import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  DollarSign,
  HeartPulse,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Disbursement {
  id: number;
  disbursement_code: string;
  allocation_result_id: number;
  funding_request_id: number;
  hospital_id: number;
  amount_inr: number;
  payment_type: string;
  payment_reference: string | null;
  payment_status: string;
  initiated_at: string;
  completed_at: string | null;
  verified_by: number | null;
  verified_at: string | null;
  funding_request?: {
    request_code: string;
    patient_id: number;
    urgency_score: number;
    status: string;
    patient?: { patient_code: string; first_name: string; last_name: string };
    hospital?: { name: string; city: string | null };
  };
  hospital?: { name: string; city: string | null; state: string | null };
}

interface UtilizationCertificate {
  id: number;
  uc_code: string;
  disbursement_id: number;
  funding_request_id: number;
  hospital_id: number;
  submitted_by: number;
  treatment_details: string | null;
  actual_cost_inr: number | null;
  patient_outcome: string | null;
  discharge_date: string | null;
  supporting_documents: any | null;
  status: string;
  submitted_at: string;
  verified_by: number | null;
  verified_at: string | null;
  verification_notes: string | null;
  funding_request?: { request_code: string; patient_id: number };
  hospital?: { name: string };
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

const disbursementStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  INITIATED: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  FAILED: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-gray-500/20 text-gray-400',
};

const ucStatusColors: Record<string, string> = {
  SUBMITTED: 'bg-blue-500/20 text-blue-400',
  UNDER_VERIFICATION: 'bg-yellow-500/20 text-yellow-400',
  VERIFIED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
};

export function LedgerPage() {
  const { user } = useAuth();
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [certificates, setCertificates] = useState<UtilizationCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'disbursements' | 'certificates'>('disbursements');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDisbursements = async () => {
    try {
      const response = await api.get('/disbursements', {
        params: { skip: (page - 1) * pageSize, limit: pageSize, search, status: statusFilter },
      });
      setDisbursements(response.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load disbursements');
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/utilization-certificates', {
        params: { skip: (page - 1) * pageSize, limit: pageSize, search, status: statusFilter },
      });
      setCertificates(response.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load utilization certificates');
    }
  };

  useEffect(() => {
    if (activeTab === 'disbursements') fetchDisbursements();
    else fetchCertificates();
  }, [activeTab, page, pageSize, search, statusFilter]);

  const getDisbursementStatusBadge = (status: string) => (
    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', disbursementStatusColors[status] || 'bg-gray-500/20 text-gray-400')}>
      {status}
    </span>
  );

  const getUCStatusBadge = (status: string) => (
    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', ucStatusColors[status] || 'bg-gray-500/20 text-gray-400')}>
      {status}
    </span>
  );

  if (isLoading && (disbursements.length === 0 && certificates.length === 0)) {
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            Financial Ledger
          </h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Track disbursements and utilization certificates
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

      {/* Tabs */}
      <div className="glass-card">
        <div className="border-b flex gap-1 p-1" style={{ borderColor: 'var(--color-card-border)' }}>
          {[
            { id: 'disbursements', label: 'Disbursements', icon: DollarSign },
            { id: 'certificates', label: 'Utilization Certificates', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-bg'
                  : 'hover:bg-white/5'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
              <input
                type="text"
                placeholder="Search by code, request, hospital..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ color: 'var(--color-text)', background: 'var(--color-card)', minWidth: 180 }}
            >
              <option value="">All Statuses</option>
              {activeTab === 'disbursements' ? (
                <>
                  <option value="PENDING">Pending</option>
                  <option value="INITIATED">Initiated</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              ) : (
                <>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_VERIFICATION">Under Verification</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                </>
              )}
            </select>
          </div>
        </div>

        {activeTab === 'disbursements' ? (
          <div className="p-6">
            {disbursements.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
                <DollarSign className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                <p>No disbursements found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Request</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Patient</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Hospital</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Reference</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Initiated</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Completed</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disbursements.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b hover:bg-white/5"
                          style={{ borderColor: 'var(--color-card-border)' }}
                        >
                          <td className="px-4 py-3"><span className="font-mono text-sm">{d.disbursement_code}</span></td>
                          <td className="px-4 py-3"><span className="font-mono text-sm">{d.funding_request?.request_code}</span></td>
                          <td className="px-4 py-3 text-sm">
                            {d.funding_request?.patient ? `PV${String(d.funding_request.patient.patient_id).padStart(5, '0')} - ${d.funding_request.patient.first_name} ${d.funding_request.patient.last_name}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {d.hospital?.name} {d.hospital?.city && `(${d.hospital.city})`}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                            {formatCurrency(d.amount_inr)}
                          </td>
                          <td className="px-4 py-3">{getDisbursementStatusBadge(d.payment_status)}</td>
                          <td className="px-4 py-3 text-sm font-mono">{d.payment_reference || '-'}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(d.initiated_at)}</td>
                          <td className="px-4 py-3 text-sm">{d.completed_at ? formatDate(d.completed_at) : '-'}</td>
                          <td className="px-4 py-3">
                            <button className="btn-secondary text-sm px-3 py-1.5">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6">
            {certificates.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
                <FileText className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                <p>No utilization certificates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>UC Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Request</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Patient</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Hospital</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actual Cost</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Outcome</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Submitted</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Verified</th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((uc) => (
                      <tr
                        key={uc.id}
                        className="border-b hover:bg-white/5"
                        style={{ borderColor: 'var(--color-card-border)' }}
                      >
                        <td className="px-4 py-3"><span className="font-mono text-sm">{uc.uc_code}</span></td>
                        <td className="px-4 py-3"><span className="font-mono text-sm">{uc.funding_request?.request_code}</span></td>
                        <td className="px-4 py-3 text-sm">
                          PV{String(uc.funding_request?.patient_id || 0).padStart(5, '0')}
                        </td>
                        <td className="px-4 py-3 text-sm">{uc.hospital?.name || 'N/A'}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-highlight)' }}>
                          {uc.actual_cost_inr ? formatCurrency(uc.actual_cost_inr) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{uc.patient_outcome || '-'}</td>
                        <td className="px-4 py-3">{getUCStatusBadge(uc.status)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(uc.submitted_at)}</td>
                        <td className="px-4 py-3 text-sm">{uc.verified_at ? formatDate(uc.verified_at) : '-'}</td>
                        <td className="px-4 py-3">
                          <button className="btn-secondary text-sm px-3 py-1.5">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {(activeTab === 'disbursements' && disbursements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Total Disbursed</p>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-primary)' }}>
              {formatCurrency(disbursements.filter(d => d.payment_status === 'COMPLETED').reduce((sum, d) => sum + d.amount_inr, 0))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Pending</p>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-highlight)' }}>
              {formatCurrency(disbursements.filter(d => d.payment_status === 'PENDING').reduce((sum, d) => sum + d.amount_inr, 0))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Failed</p>
            <p className="text-2xl font-bold font-mono" style={{ color: '#EF4444' }}>
              {formatCurrency(disbursements.filter(d => d.payment_status === 'FAILED').reduce((sum, d) => sum + d.amount_inr, 0))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Total Transactions</p>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-secondary)' }}>
              {disbursements.length}
            </p>
          </div>
        </div>
      )}

      {(activeTab === 'certificates' && certificates.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Verified</p>
            <p className="text-2xl font-bold font-mono" style={{ color: '#22C55E' }}>
              {certificates.filter(c => c.status === 'VERIFIED').length}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Pending</p>
            <p className="text-2xl font-bold font-mono" style={{ color: '#FBBF24' }}>
              {certificates.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_VERIFICATION').length}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Rejected</p>
            <p className="text-2xl font-bold font-mono" style={{ color: '#EF4444' }}>
              {certificates.filter(c => c.status === 'REJECTED').length}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Total Submitted</p>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-secondary)' }}>
              {certificates.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}