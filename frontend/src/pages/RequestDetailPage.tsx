import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, requestsApi } from '../services/api';
import {
  HeartPulse,
  AlertTriangle,
  DollarSign,
  Clock,
  User,
  Hospital,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Calculator,
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
  // Relations
  patient?: { patient_code: string; first_name: string; last_name: string; date_of_birth: string | null; gender: string | null };
  disease?: { icd10_category: string; description: string; department: string; prototype_base_severity: number };
  procedure?: { surgery_name: string; department: string };
  treatment_package?: { package_code: string; total_package_cost_inr: number; estimated_stay_days: number };
  hospital?: { name: string; city: string | null; state: string | null };
  requesting_doctor?: { full_name: string; email: string };
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

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<FundingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchRequest = async () => {
    try {
      setIsLoading(true);
      const response = await requestsApi.get(Number(id));
      setRequest(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load request');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;
    try {
      setIsDeleting(true);
      await api.delete(`/requests/${Number(id)}`);
      navigate('/requests');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete request');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScoreRecalc = async () => {
    try {
      await requestsApi.calculateScore(Number(id));
      fetchRequest();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to recalculate score');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="p-6 text-center">
        <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
        <p style={{ color: '#EF4444' }}>{error}</p>
        <Link to="/requests" className="btn-secondary mt-4 inline-block">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Link>
      </div>
    );
  }

  if (!request) return null;

  const canEdit = user?.role === 'DOCTOR' && request.requesting_doctor_id === user.id;
  const canDelete = user?.role === 'ADMIN' || (user?.role === 'DOCTOR' && request.requesting_doctor_id === user.id);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Link to="/requests" className="btn-secondary p-2 rounded-xl flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-bold">{request.request_code}</h1>
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', statusColors[request.status])}>
              {request.status}
            </span>
            {request.is_emergency && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                EMERGENCY
                {request.esi_level && <span>ESI {request.esi_level}</span>}
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-secondary)' }}>
            Created: {formatDate(request.created_at)} | Updated: {formatDate(request.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Link to={`/requests/${request.id}/edit`} className="btn-secondary flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-secondary flex items-center gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-red-500/30" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Patient Information
            </h2>
            {request.patient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Patient Code</p>
                  <p className="font-mono">{request.patient.patient_code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Name</p>
                  <p>{request.patient.first_name} {request.patient.last_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Date of Birth</p>
                  <p>{request.patient.date_of_birth ? new Date(request.patient.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Gender</p>
                  <p>{request.patient.gender || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Medical Details */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Medical Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.disease && (
                <>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>ICD-10 Category</p>
                    <p className="font-mono">{request.disease.icd10_category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Description</p>
                    <p>{request.disease.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Department</p>
                    <p>{request.disease.department}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Base Severity</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{request.disease.prototype_base_severity}</p>
                  </div>
                </>
              )}
              {request.procedure && (
                <>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Procedure</p>
                    <p>{request.procedure.surgery_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Procedure Department</p>
                    <p>{request.procedure.department}</p>
                  </div>
                </>
              )}
              {request.treatment_package && (
                <>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Package Code</p>
                    <p className="font-mono">{request.treatment_package.package_code}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Estimated Stay</p>
                    <p>{request.treatment_package.estimated_stay_days} days</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hospital & Doctor */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Hospital className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Hospital & Requesting Doctor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.hospital && (
                <>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Hospital</p>
                    <p>{request.hospital.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Location</p>
                    <p>{request.hospital.city}, {request.hospital.state}</p>
                  </div>
                </>
              )}
              {request.requesting_doctor && (
                <>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Requesting Doctor</p>
                    <p>{request.requesting_doctor.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Email</p>
                    <p>{request.requesting_doctor.email}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Urgency Score Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {request.disease && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary)/10', border: '1px solid var(--color-primary)/30' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Base Severity (ICD)</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{request.disease.prototype_base_severity}</p>
                </div>
              )}
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-highlight)/10', border: '1px solid var(--color-highlight)/30' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>TTC Points</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-highlight)' }}>{request.ttc_points || 0}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-secondary)' }}>{request.ttc_category || 'Not set'}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-secondary)/10', border: '1px solid var(--color-secondary)/30' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Success Rate Points</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-secondary)' }}>{request.success_rate_points || 0}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-secondary)' }}>Rate: {request.success_rate ? (request.success_rate * 100).toFixed(1) + '%' : 'Not set'}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary)/10', border: '1px solid var(--color-primary)/30' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Age Factor Points</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{request.age_factor_points || 0}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-highlight)/10', border: '1px solid var(--color-highlight)/30' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Waiting Boost</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-highlight)' }}>{request.waiting_boost}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-secondary)' }}>{request.waiting_days} days waiting</p>
              </div>
              {request.is_emergency && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Emergency Component</p>
                  <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>+{request.esi_level === 1 ? 25 : 15}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-secondary)' }}>ESI Level: {request.esi_level}</p>
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}>
              <p className="text-xs font-medium mb-1">FINAL URGENCY SCORE</p>
              <p className="text-4xl font-bold">{request.urgency_score.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Financial & Actions */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Financial Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                <span style={{ color: 'var(--color-secondary)' }}>Surgery Cost</span>
                <span className="font-mono font-medium">{formatCurrency(request.surgery_cost_inr)}</span>
              </div>
              <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                <span style={{ color: 'var(--color-secondary)' }}>Surety Amount</span>
                <span className="font-mono font-medium">{formatCurrency(request.surety_amount_inr)}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                <span>Funding Gap</span>
                <span className="font-mono">{formatCurrency(request.funding_gap_inr)}</span>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Status Timeline
            </h2>
            <div className="space-y-4">
              {[
                { status: 'PENDING', label: 'Request Submitted', time: request.created_at, icon: FileText },
                { status: 'ELIGIBLE', label: 'Eligibility Verified', time: null, icon: CheckCircle },
                { status: 'SELECTED', label: 'Selected in Allocation', time: null, icon: HeartPulse },
                { status: 'APPROVED', label: 'Allocation Approved', time: null, icon: CheckCircle },
                { status: 'DISBURSED', label: 'Funds Disbursed', time: null, icon: DollarSign },
                { status: 'UTILIZATION_PENDING', label: 'Utilization Certificate Submitted', time: null, icon: FileText },
                { status: 'VERIFIED', label: 'Utilization Verified', time: null, icon: CheckCircle },
                { status: 'SETTLED', label: 'Case Settled', time: null, icon: CheckCircle },
              ].map((stage, index) => {
                const isCurrent = request.status === stage.status;
                const isPast = ['PENDING', 'ELIGIBLE', 'SELECTED', 'APPROVED', 'DISBURSED', 'UTILIZATION_PENDING', 'VERIFIED', 'SETTLED'].indexOf(request.status) >= ['PENDING', 'ELIGIBLE', 'SELECTED', 'APPROVED', 'DISBURSED', 'UTILIZATION_PENDING', 'VERIFIED', 'SETTLED'].indexOf(stage.status);
                return (
                  <div key={stage.status} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={clsx('w-8 h-8 rounded-full flex items-center justify-center',
                          isCurrent ? 'bg-primary text-bg' : isPast ? 'bg-green-500 text-white' : 'border-2 border-white/20'
                        )}
                      >
                        {isPast && !isCurrent ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <stage.icon className={clsx('w-4 h-4', isCurrent && 'text-bg', !isCurrent && !isPast && 'text-white/50')} />
                        )}
                      </div>
                      {index < 7 && (
                        <div className="w-0.5 h-full mt-1" style={{ background: isPast ? 'var(--color-primary)' : 'var(--color-card-border)' }} />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={clsx('font-medium', isCurrent && 'text-primary', isPast && 'text-green-400')}>
                        {stage.label}
                      </p>
                      {stage.time && (
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                          {formatDate(stage.time)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleScoreRecalc}
                className="btn-secondary w-full justify-start flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Recalculate Urgency Score
              </button>
              {user?.role === 'ADMIN' && ['PENDING', 'ELIGIBLE'].includes(request.status) && (
                <Link to={`/allocation?request=${request.id}`} className="btn-primary w-full justify-center flex items-center gap-2">
                  <HeartPulse className="w-4 h-4" />
                  Run Allocation for This Request
                </Link>
              )}
              {user?.role === 'HOSPITAL' && request.status === 'DISBURSED' && (
                <Link to={`/ledger?request=${request.id}`} className="btn-primary w-full justify-center flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Submit Utilization Certificate
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}