import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { emergencyApi, requestsApi } from '../services/api';
import {
  AlertTriangle,
  HeartPulse,
  Loader2,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  FileText,
} 
from 'lucide-react';
import { clsx } from 'clsx';

interface EmergencyAllocation {
  id: number;
  allocation_code: string;
  funding_request_id: number;
  budget_id: number;
  allocated_amount_inr: number;
  urgency_score: number;
  esi_level: number;
  justification: string;
  authorized_by: number;
  authorized_at: string;
  status: string;
  funding_request?: {
    request_code: string;
    patient_id: number;
    urgency_score: number;
    funding_gap_inr: number;
    status: string;
    is_emergency: boolean;
    patient?: { patient_code: string; first_name: string; last_name: string };
    disease?: { icd10_category: string; description: string; department: string };
    hospital?: { name: string; city: string | null };
  };
}

interface ReserveStatus {
  total_emergency_reserve_inr: number;
  allocated_emergency_inr: number;
  remaining_emergency_reserve_inr: number;
  emergency_allocations_count: number;
  active_budget_date: string;
}

interface EligibleRequest {
  id: number;
  request_code: string;
  patient_id: number;
  urgency_score: number;
  funding_gap_inr: number;
  ttc_category: string | null;
  is_emergency: boolean;
  esi_level: number | null;
  disease?: { icd10_category: string; description: string; department: string };
  patient?: { patient_code: string; first_name: string; last_name: string };
  hospital?: { name: string; city: string | null };
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

export function EmergencyPage() {
  const { user } = useAuth();
  const [reserveStatus, setReserveStatus] = useState<ReserveStatus | null>(null);
  const [allocations, setAllocations] = useState<EmergencyAllocation[]>([]);
  const [eligibleRequests, setEligibleRequests] = useState<EligibleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'allocations' | 'reserve' | 'request'>('allocations');
  const [selectedRequest, setSelectedRequest] = useState<EligibleRequest | null>(null);
  const [justification, setJustification] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reserveRes, allocationsRes, requestsRes] = await Promise.all([
        emergencyApi.getReserveStatus(),
        emergencyApi.listAllocations(),
        requestsApi.list({ is_emergency: true }),
      ]);
      setReserveStatus(reserveRes.data);
      setAllocations(allocationsRes.data);
      // Filter for eligible emergency requests (PENDING or ELIGIBLE, is_emergency=true)
      const eligible = requestsRes.data.items.filter(
        (r: any) => r.is_emergency && ['PENDING', 'ELIGIBLE'].includes(r.status)
      );
      setEligibleRequests(eligible);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load emergency data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedRequest) {
      setError('Please select a request');
      return;
    }
    if (!justification.trim()) {
      setError('Please provide a justification');
      return;
    }
    if (user?.role !== 'ADMIN') {
      setError('Only admins can authorize emergency allocations');
      return;
    }

    try {
      setIsAllocating(true);
      setError('');
      setSuccess('');

      await emergencyApi.allocate({
        funding_request_id: selectedRequest.id,
        esi_level: selectedRequest.esi_level || 1,
        justification,
      });

      setSuccess(`Emergency allocation completed for ${selectedRequest.request_code}!`);
      setSelectedRequest(null);
      setJustification('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to allocate emergency funds');
    } finally {
      setIsAllocating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const reserveUsagePercent = reserveStatus
    ? ((reserveStatus.total_emergency_reserve_inr - reserveStatus.remaining_emergency_reserve_inr) / reserveStatus.total_emergency_reserve_inr) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" style={{ color: '#EF4444' }} />
            Emergency Reserve
          </h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            15% reserved budget for life-threatening cases (ESI Level 1-2)
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="glass-card p-4 border-green-500/30 flex items-center gap-3" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
          <p style={{ color: '#22C55E' }}>{success}</p>
        </div>
      )}

      {/* Reserve Status */}
      {reserveStatus && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Reserve Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary)/10', border: '1px solid var(--color-primary)/30' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Total Reserve</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-primary)' }}>
                {formatCurrency(reserveStatus.total_emergency_reserve_inr)}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Allocated</p>
              <p className="text-2xl font-bold font-mono" style={{ color: '#EF4444' }}>
                {formatCurrency(reserveStatus.allocated_emergency_inr)}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-highlight)/10', border: '1px solid var(--color-highlight)/30' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Remaining</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-highlight)' }}>
                {formatCurrency(reserveStatus.remaining_emergency_reserve_inr)}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-secondary)/10', border: '1px solid var(--color-secondary)/30' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Allocations</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-secondary)' }}>
                {reserveStatus.emergency_allocations_count}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--color-secondary)' }}>Reserve Utilization</span>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>{reserveUsagePercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-card-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(reserveUsagePercent, 100)}%`,
                  background: reserveUsagePercent > 90 ? 'linear-gradient(90deg, #EF4444, #F97316)' : 'linear-gradient(90deg, var(--color-primary), var(--color-highlight))',
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              Budget Date: {formatDate(reserveStatus.active_budget_date)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="glass-card">
        <div className="border-b flex gap-1 p-1" style={{ borderColor: 'var(--color-card-border)' }}>
          {[
            { id: 'allocations', label: 'Allocations', icon: HeartPulse },
            { id: 'reserve', label: 'Reserve Details', icon: DollarSign },
            { id: 'request', label: 'New Allocation', icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

        <div className="p-6">
          {/* Allocations Tab */}
          {activeTab === 'allocations' && (
            <div className="space-y-4">
              {allocations.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
                  <HeartPulse className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                  <p>No emergency allocations yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Request</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Patient</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Disease</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>ESI</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Urgency</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Allocated</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Authorized</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((alloc) => (
                        <tr
                          key={alloc.id}
                          className="border-b hover:bg-white/5"
                          style={{ borderColor: 'var(--color-card-border)' }}
                        >
                          <td className="px-4 py-3"><span className="font-mono text-sm">{alloc.allocation_code}</span></td>
                          <td className="px-4 py-3"><span className="font-mono text-sm">{alloc.funding_request?.request_code}</span></td>
                          <td className="px-4 py-3 text-sm">
                            {alloc.funding_request?.patient ? `PV${String(alloc.funding_request.patient.patient_code).padStart(5, '0')} - ${alloc.funding_request.patient.first_name} ${alloc.funding_request.patient.last_name}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {alloc.funding_request?.disease ? `${alloc.funding_request.disease.icd10_category} - ${alloc.funding_request.disease.description}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                              ESI {alloc.esi_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-primary)' }}>
                            {alloc.urgency_score.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-highlight)' }}>
                            {formatCurrency(alloc.allocated_amount_inr)}
                          </td>
                          <td className="px-4 py-3 text-sm">{alloc.authorized_by}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(alloc.authorized_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Reserve Details Tab */}
          {activeTab === 'reserve' && reserveStatus && (
            <div className="space-y-6">
              <div className="glass-card p-6" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-card-border)' }}>
                <h3 className="text-lg font-semibold mb-4">Reserve Calculation</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                    <dt style={{ color: 'var(--color-secondary)' }}>Daily Budget Total</dt>
                    <dd className="font-mono font-medium">{formatCurrency(reserveStatus.total_emergency_reserve_inr / 0.15)}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                    <dt style={{ color: 'var(--color-secondary)' }}>Emergency Reserve %</dt>
                    <dd className="font-mono font-medium">15%</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                    <dt style={{ color: 'var(--color-secondary)' }}>Reserve Amount</dt>
                    <dd className="font-mono font-medium" style={{ color: 'var(--color-primary)' }}>{formatCurrency(reserveStatus.total_emergency_reserve_inr)}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                    <dt style={{ color: 'var(--color-secondary)' }}>Already Allocated</dt>
                    <dd className="font-mono font-medium" style={{ color: '#EF4444' }}>{formatCurrency(reserveStatus.allocated_emergency_inr)}</dd>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold" style={{ color: 'var(--color-highlight)' }}>
                    <dt>Available for Allocation</dt>
                    <dd className="font-mono">{formatCurrency(reserveStatus.remaining_emergency_reserve_inr)}</dd>
                  </div>
                </dl>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Eligibility Criteria</h3>
                <ul className="space-y-3 text-sm" style={{ color: 'var(--color-secondary)' }}>
                  <li className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
                    <span>ESI Level 1 (Immediate life-saving) or 2 (High-risk/time-sensitive)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <HeartPulse className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                    <span>Life-threatening ICD categories: I21, I60, I61, S06, A41, J96, I71, O72, O00, T79, S36, S27</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-highlight)' }} />
                    <span>Time-to-treatment &lt;   2 hours (TTC category: {"<2h"})</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <FileText className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-secondary)' }} />
                    <span>Requires ADMIN authorization with written justification</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                    <span>Full audit trail with timestamp, authorizer, and reason</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* New Allocation Tab */}
          {activeTab === 'request' && user?.role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Select Emergency Request</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-secondary)' }}>
                  Eligible requests with ESI Level 1-2 that are pending allocation
                </p>

                {eligibleRequests.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--color-muted)' }}>
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
                    <p>No eligible emergency requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {eligibleRequests.map((req) => (
                      <button
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={clsx(
                          'w-full p-4 rounded-xl text-left transition-all border-2 flex items-center justify-between',
                          selectedRequest?.id === req.id
                            ? 'border-primary bg-primary/10'
                            : 'border-transparent hover:border-white/10 hover:bg-white/5'
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                          >
                            <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{req.request_code}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                              {req.patient ? `PV${String(req.patient.patient_code).padStart(5, '0')} - ${req.patient.first_name} ${req.patient.last_name}` : 'Unknown patient'}
                              {req.disease && ` | ${req.disease.icd10_category} - ${req.disease.description}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                              ESI {req.esi_level}
                            </span>
                            <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                              {req.urgency_score.toFixed(1)}
                            </span>
                            <span className="font-mono" style={{ color: 'var(--color-highlight)' }}>
                              {formatCurrency(req.funding_gap_inr)}
                            </span>
                          </div>
                        </div>
                        {selectedRequest?.id === req.id && (
                          <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedRequest && (
                <div className="glass-card p-6 border-l-4" style={{ borderColor: '#EF4444' }}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Allocate to {selectedRequest.request_code}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Patient</p>
                      <p>{selectedRequest.patient ? `${selectedRequest.patient.first_name} ${selectedRequest.patient.last_name} (PV${String(selectedRequest.patient.patient_code).padStart(5, '0')})` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Disease</p>
                      <p>{selectedRequest.disease ? `${selectedRequest.disease.icd10_category} - ${selectedRequest.disease.description}` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Hospital</p>
                      <p>{selectedRequest.hospital?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Funding Gap</p>
                      <p className="font-mono font-bold" style={{ color: 'var(--color-highlight)' }}>{formatCurrency(selectedRequest.funding_gap_inr)}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                      Justification (Required) <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      rows={4}
                      placeholder="Provide clinical justification for emergency allocation..."
                      className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                      style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                    />
                  </div>

                  <button
                    onClick={handleAllocate}
                    disabled={isAllocating || !justification.trim()}
                    className="btn-primary flex items-center gap-2 w-full md:w-auto"
                  >
                    {isAllocating && <Loader2 className="w-5 h-5 animate-spin" />}
                    <HeartPulse className="w-5 h-5" />
                    Allocate Emergency Funds
                  </button>
                </div>
              )}

              {user?.role !== 'ADMIN' && activeTab === 'request' && (
                <div className="glass-card p-6 text-center" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#EF4444' }}>Admin Access Required</h3>
                  <p style={{ color: 'var(--color-secondary)' }}>
                    Emergency allocations require ADMIN role authorization.
                    Please contact your system administrator.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}