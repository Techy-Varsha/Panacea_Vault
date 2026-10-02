import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, hospitalsApi } from '../services/api';
import {
  Hospital,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

interface HospitalData {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  license_number: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function HospitalsPage() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_email: '',
    contact_phone: '',
    license_number: '',
    is_verified: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHospitals = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (verifiedFilter) params.append('verified_only', verifiedFilter);

      const response = await hospitalsApi.list({ skip: (page - 1) * pageSize, limit: pageSize, verified_only: verifiedFilter === 'true' });
      setHospitals(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load hospitals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [page, pageSize, search, verifiedFilter]);

  const openCreateModal = () => {
    setEditingHospital(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_email: '',
      contact_phone: '',
      license_number: '',
      is_verified: false,
    });
    setShowModal(true);
  };

  const openEditModal = (hospital: HospitalData) => {
    setEditingHospital(hospital);
    setFormData({
      name: hospital.name,
      address: hospital.address || '',
      city: hospital.city || '',
      state: hospital.state || '',
      pincode: hospital.pincode || '',
      contact_email: hospital.contact_email || '',
      contact_phone: hospital.contact_phone || '',
      license_number: hospital.license_number || '',
      is_verified: hospital.is_verified,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHospital(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Hospital name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingHospital) {
        await hospitalsApi.update(editingHospital.id, formData);
        setSuccess('Hospital updated successfully!');
      } else {
        await hospitalsApi.create(formData);
        setSuccess('Hospital created successfully!');
      }
      closeModal();
      fetchHospitals();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save hospital');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (hospital: HospitalData) => {
    if (!confirm(`Are you sure you want to delete "${hospital.name}"? This action cannot be undone.`)) return;
    try {
      await hospitalsApi.delete(hospital.id);
      setSuccess('Hospital deleted successfully!');
      fetchHospitals();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete hospital');
    }
  };

  const handleVerify = async (hospital: HospitalData) => {
    try {
      await hospitalsApi.update(hospital.id, { is_verified: !hospital.is_verified });
      setSuccess(`Hospital ${!hospital.is_verified ? 'verified' : 'unverified'} successfully!`);
      fetchHospitals();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update verification status');
    }
  };

  if (isLoading && hospitals.length === 0) {
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
            <Hospital className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            Hospitals
          </h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Manage hospital network and verification status
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Hospital
          </button>
        )}
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

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, city, license..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
            />
          </div>
          <select
            value={verifiedFilter}
            onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)', minWidth: 180 }}
          >
            <option value="">All Hospitals</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading && hospitals.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : hospitals.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-muted)' }}>
            <Hospital className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
            <p>No hospitals found</p>
            {user?.role === 'ADMIN' && (
              <button onClick={openCreateModal} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
                Add First Hospital
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>License</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b hover:bg-white/5"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{h.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-secondary)' }}>
                      {h.address && <p>{h.address}</p>}
                      <p>{h.city}, {h.state} {h.pincode && `- ${h.pincode}`}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-secondary)' }}>
                      {h.contact_email && <p>{h.contact_email}</p>}
                      {h.contact_phone && <p>{h.contact_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
                      {h.license_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleVerify(h)}
                        className={clsx(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                          h.is_verified
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        )}
                      >
                        {h.is_verified ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 inline mr-1" />
                            Pending
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-muted)' }}>
                      {formatDate(h.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(h)}
                          className="btn-secondary p-2 rounded-xl"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(h)}
                            className="btn-secondary p-2 rounded-xl border-red-500/50 text-red-400 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pagination */}
        {hospitals.length === pageSize && (
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingHospital ? 'Edit Hospital' : 'Add Hospital'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-white/10">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Hospital Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    License Number
                  </label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  />
                </div>
              </div>
              {editingHospital && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_verified"
                    checked={formData.is_verified}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_verified: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-transparent focus:ring-primary"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <label htmlFor="is_verified" className="text-sm" style={{ color: 'var(--color-text)' }}>
                    Verified Hospital
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-card-border)' }}>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {editingHospital ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}