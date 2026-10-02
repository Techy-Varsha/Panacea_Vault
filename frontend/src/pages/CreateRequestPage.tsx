import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { HeartPulse, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

interface Disease {
  id: number;
  icd10_category: string;
  description: string;
  department: string;
  prototype_base_severity: number;
}

interface Procedure {
  id: number;
  department: string;
  surgery_name: string;
  example_icd10_pcs_code: string | null;
}

interface TreatmentPackage {
  id: number;
  package_code: string;
  disease_id: number;
  procedure_id: number;
  surgery_cost_inr: number;
  icu_cost_inr: number;
  medication_cost_inr: number;
  total_package_cost_inr: number;
  estimated_stay_days: number;
}

interface Hospital {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  is_verified: boolean;
}

interface Patient {
  id: number;
  patient_code: string;
  first_name: string;
  last_name: string;
}

const TTC_CATEGORIES = [
  { value: '<2h', label: '< 2 hours (30 pts)' },
  { value: '2-6h', label: '2-6 hours (25 pts)' },
  { value: '1-3d', label: '1-3 days (10 pts)' },
  { value: '3-7d', label: '3-7 days (5 pts)' },
  { value: '7d+', label: '7+ days (0 pts)' },
];

export function CreateRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    patient_id: '',
    disease_id: '',
    procedure_id: '',
    treatment_package_id: '',
    hospital_id: '',
    surgery_cost_inr: '',
    surety_amount_inr: '',
    funding_gap_inr: '',
    urgency_score: '',
    ttc_category: '',
    ttc_points: '',
    success_rate: '',
    success_rate_points: '',
    age_factor_points: '',
    is_emergency: false,
    esi_level: '',
  });

  // Dropdown data
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [treatmentPackages, setTreatmentPackages] = useState<TreatmentPackage[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Filtered data based on selections
  const filteredProcedures = procedures.filter(p =>
    !formData.disease_id || diseases.find(d => d.id === Number(formData.disease_id))?.department === p.department
  );

  const filteredPackages = treatmentPackages.filter(pkg =>
    (!formData.disease_id || pkg.disease_id === Number(formData.disease_id)) &&
    (!formData.procedure_id || pkg.procedure_id === Number(formData.procedure_id))
  );

  const selectedDisease = diseases.find(d => d.id === Number(formData.disease_id));
  const selectedPackage = treatmentPackages.find(p => p.id === Number(formData.treatment_package_id));

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      setIsLoading(true);
      const [diseasesRes, proceduresRes, packagesRes, hospitalsRes, patientsRes] = await Promise.all([
        api.get('/diseases'),
        api.get('/procedures'),
        api.get('/treatment-packages'),
        api.get('/hospitals?verified_only=true'),
        api.get('/patients'),
      ]);
      setDiseases(diseasesRes.data);
      setProcedures(proceduresRes.data);
      setTreatmentPackages(packagesRes.data);
      setHospitals(hospitalsRes.data);
      setPatients(patientsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const calculateFundingGap = () => {
    const surgery = Number(formData.surgery_cost_inr) || 0;
    const surety = Number(formData.surety_amount_inr) || 0;
    const gap = surgery - surety;
    if (gap > 0) {
      handleChange('funding_gap_inr', gap.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
    const required = ['patient_id', 'disease_id', 'procedure_id', 'treatment_package_id', 'hospital_id'];
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        setError(`Please fill in all required fields`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        patient_id: Number(formData.patient_id),
        disease_id: Number(formData.disease_id),
        procedure_id: Number(formData.procedure_id),
        treatment_package_id: Number(formData.treatment_package_id),
        hospital_id: Number(formData.hospital_id),
        requesting_doctor_id: user?.id,
        surgery_cost_inr: Number(formData.surgery_cost_inr),
        surety_amount_inr: Number(formData.surety_amount_inr),
        funding_gap_inr: Number(formData.funding_gap_inr),
        urgency_score: Number(formData.urgency_score) || 0,
        ttc_category: formData.ttc_category || undefined,
        ttc_points: Number(formData.ttc_points) || undefined,
        success_rate: Number(formData.success_rate) || undefined,
        success_rate_points: Number(formData.success_rate_points) || undefined,
        age_factor_points: Number(formData.age_factor_points) || undefined,
        is_emergency: formData.is_emergency,
        esi_level: formData.esi_level ? Number(formData.esi_level) : undefined,
      };

      const response = await api.post('/funding-requests', payload);
      setSuccess(`Request ${response.data.request_code} created successfully!`);
      setTimeout(() => navigate('/requests'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/requests" className="btn-secondary p-2 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Funding Request</h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Submit a new treatment funding request for allocation
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
      {success && (
        <div className="glass-card p-4 border-green-500/30 flex items-center gap-3" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
          <p style={{ color: '#22C55E' }}>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient & Hospital Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            Patient & Hospital
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Patient <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.patient_id}
                onChange={(e) => handleChange('patient_id', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
              >
                <option value="">Select patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.patient_code} - {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Hospital <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.hospital_id}
                onChange={(e) => handleChange('hospital_id', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
              >
                <option value="">Select hospital</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.city && `(${h.city})`} {h.is_verified && '✓'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Medical Details Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            Medical Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Disease (ICD-10) <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.disease_id}
                onChange={(e) => {
                  handleChange('disease_id', e.target.value);
                  handleChange('procedure_id', '');
                  handleChange('treatment_package_id', '');
                }}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
              >
                <option value="">Select disease</option>
                {diseases.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.icd10_category} - {d.description} ({d.department}) [Severity: {d.prototype_base_severity}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Procedure <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.procedure_id}
                onChange={(e) => {
                  handleChange('procedure_id', e.target.value);
                  handleChange('treatment_package_id', '');
                }}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
              >
                <option value="">Select procedure</option>
                {filteredProcedures.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.surgery_name} ({p.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Treatment Package <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.treatment_package_id}
              onChange={(e) => handleChange('treatment_package_id', e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
              required
            >
              <option value="">Select treatment package</option>
              {filteredPackages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.package_code} - Total: ₹{pkg.total_package_cost_inr.toLocaleString('en-IN')} (Stay: {pkg.estimated_stay_days} days)
                </option>
              ))}
            </select>
          </div>

          {/* Auto-filled costs from package */}
          {selectedPackage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl" style={{ background: 'var(--color-primary)/10', border: '1px solid var(--color-primary)/30' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Surgery Cost</p>
                <p className="font-mono text-lg" style={{ color: 'var(--color-primary)' }}>
                  ₹{selectedPackage.surgery_cost_inr.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>ICU Cost</p>
                <p className="font-mono text-lg" style={{ color: 'var(--color-primary)' }}>
                  ₹{selectedPackage.icu_cost_inr.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Medication Cost</p>
                <p className="font-mono text-lg" style={{ color: 'var(--color-primary)' }}>
                  ₹{selectedPackage.medication_cost_inr.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Financial Details Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            Financial Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Surgery Cost (INR) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.surgery_cost_inr}
                onChange={(e) => { handleChange('surgery_cost_inr', e.target.value); calculateFundingGap(); }}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Surety Amount (INR) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.surety_amount_inr}
                onChange={(e) => { handleChange('surety_amount_inr', e.target.value); calculateFundingGap(); }}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Funding Gap (INR) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.funding_gap_inr}
                onChange={(e) => handleChange('funding_gap_inr', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                required
                min="0"
                step="1000"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Urgency Scoring Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            Urgency Scoring
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Time-to-Treatment Category
              </label>
              <select
                value={formData.ttc_category}
                onChange={(e) => handleChange('ttc_category', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
              >
                <option value="">Select TTC category</option>
                {TTC_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                TTC Points
              </label>
              <input
                type="number"
                value={formData.ttc_points}
                onChange={(e) => handleChange('ttc_points', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                min="0"
                max="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Success Rate (0-1)
              </label>
              <input
                type="number"
                value={formData.success_rate}
                onChange={(e) => handleChange('success_rate', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                min="0"
                max="1"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Success Rate Points
              </label>
              <input
                type="number"
                value={formData.success_rate_points}
                onChange={(e) => handleChange('success_rate_points', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                min="0"
                max="20"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Age Factor Points
              </label>
              <input
                type="number"
                value={formData.age_factor_points}
                onChange={(e) => handleChange('age_factor_points', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                min="0"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Urgency Score (Auto-calculated if empty)
              </label>
              <input
                type="number"
                value={formData.urgency_score}
                onChange={(e) => handleChange('urgency_score', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          {selectedDisease && (
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-secondary)/10', border: '1px solid var(--color-secondary)/30' }}>
              <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
                <strong>Base Severity (from ICD):</strong> {selectedDisease.prototype_base_severity} |
                <strong>Department:</strong> {selectedDisease.department}
              </p>
            </div>
          )}
        </div>

        {/* Emergency Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            Emergency Allocation
          </h2>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_emergency}
                onChange={(e) => handleChange('is_emergency', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-transparent focus:ring-primary"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span style={{ color: 'var(--color-text)' }}>This is an emergency request (ESI Level 1-2)</span>
            </label>
          </div>

          {formData.is_emergency && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                ESI Level (1 = Most Urgent, 2 = High Urgency)
              </label>
              <select
                value={formData.esi_level}
                onChange={(e) => handleChange('esi_level', e.target.value)}
                className="w-full md:w-64 px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
              >
                <option value="">Select ESI level</option>
                <option value="1">1 - Immediate life-saving intervention</option>
                <option value="2">2 - High-risk/severe distress/time-sensitive</option>
              </select>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/requests" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <HeartPulse className="w-5 h-5" />
            Create Request
          </button>
        </div>
      </form>
    </div>
  );
}