import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../services/api';
import {
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  User,
  Stethoscope,
  Building,
  UserCheck,
  UserX,
} from 'lucide-react';
import { clsx } from 'clsx';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-500/20 text-purple-400',
  DOCTOR: 'bg-blue-500/20 text-blue-400',
  HOSPITAL: 'bg-green-500/20 text-green-400',
  PATIENT: 'bg-gray-500/20 text-gray-400',
  AUDITOR: 'bg-orange-500/20 text-orange-400',
  DONOR: 'bg-teal-500/20 text-teal-400',
};

const roleIcons: Record<string, any> = {
  ADMIN: Shield,
  DOCTOR: Stethoscope,
  HOSPITAL: Building,
  PATIENT: User,
  AUDITOR: UserCheck,
  DONOR: UserX,
};

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'DOCTOR',
    is_active: true,
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await usersApi.list({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        role: roleFilter || undefined,
        is_active: activeFilter === '' ? undefined : activeFilter === 'true',
      });
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, search, roleFilter, activeFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'DOCTOR',
      is_active: true,
      password: '',
    });
    setShowModal(true);
  };

  const openEditModal = (userData: UserData) => {
    setEditingUser(userData);
    setFormData({
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_active: userData.is_active,
      password: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email.trim() || !formData.full_name.trim()) {
      setError('Email and full name are required');
      return;
    }
    if (!editingUser && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUser) {
        const updateData: any = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await usersApi.update(editingUser.id, updateData);
        setSuccess('User updated successfully!');
      } else {
        await usersApi.create({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        });
        setSuccess('User created successfully!');
      }
      closeModal();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userData: UserData) => {
    if (userData.id === user?.id) {
      setError('Cannot delete yourself');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${userData.full_name}" (${userData.email})? This action cannot be undone.`)) return;
    try {
      await usersApi.delete(userData.id);
      setSuccess('User deleted successfully!');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (userData: UserData) => {
    if (userData.id === user?.id) {
      setError('Cannot deactivate yourself');
      return;
    }
    try {
      await usersApi.update(userData.id, { is_active: !userData.is_active });
      setSuccess(`User ${!userData.is_active ? 'activated' : 'deactivated'} successfully!`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  if (isLoading && users.length === 0) {
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
            <Users className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            User Management
          </h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Manage system users and their roles
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add User
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
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)', minWidth: 160 }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="DOCTOR">Doctor</option>
            <option value="HOSPITAL">Hospital</option>
            <option value="PATIENT">Patient</option>
            <option value="AUDITOR">Auditor</option>
            <option value="DONOR">Donor</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ color: 'var(--color-text)', background: 'var(--color-card)', minWidth: 140 }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading && users.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-muted)' }}>
            <Users className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-card-border)' }}>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={clsx('border-b hover:bg-white/5', !u.is_active && 'opacity-50')}
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)/20' }}>
                          {(() => {const IconComponent = (roleIcons[u.role] || User) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
                          return <IconComponent className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />;})()}
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', roleColors[u.role] || 'bg-gray-500/20 text-gray-400')}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={clsx(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                          u.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        )}
                      >
                        {u.is_active ? (
                          <>
                            <UserCheck className="w-3 h-3 inline mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 inline mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-muted)' }}>
                      {formatDate(u.last_login)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-muted)' }}>
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user?.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => openEditModal(u)}
                              className="btn-secondary p-2 rounded-xl"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDelete(u)}
                                className="btn-secondary p-2 rounded-xl border-red-500/50 text-red-400 hover:bg-red-500/10"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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
        {users.length === pageSize && (
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
          <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: 'var(--color-card-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-white/10">
                  <UserX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  disabled={!!editingUser}
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="PATIENT">Patient</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="DONOR">Donor</option>
                  {user?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              {editingUser && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-transparent focus:ring-primary"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--color-text)' }}>
                    Active User
                  </label>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Password {editingUser ? '(leave blank to keep current)' : '<span className="text-red-400">*</span>'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ color: 'var(--color-text)', background: 'var(--color-card)' }}
                  required={!editingUser}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-card-border)' }}>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}