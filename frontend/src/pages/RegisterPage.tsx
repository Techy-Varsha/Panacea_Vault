import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeartPulse, Mail, Lock, User, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const roles = [
  { value: 'PATIENT', label: 'Patient', description: 'View own requests and status', icon: User },
  { value: 'DOCTOR', label: 'Doctor', description: 'Create treatment funding requests', icon: HeartPulse },
  { value: 'HOSPITAL', label: 'Hospital Admin', description: 'Manage utilization workflow', icon: Shield },
  { value: 'AUDITOR', label: 'Auditor', description: 'Inspect financial records and allocation history', icon: Shield },
  { value: 'DONOR', label: 'Donor', description: 'View aggregate impact metrics', icon: User },
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'PATIENT',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        role: formData.role,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))' }}>
              <HeartPulse className="w-7 h-7" style={{ color: 'var(--color-bg)' }} />
            </div>
            <span className="text-2xl font-bold text-gradient">Panacea Vault</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p style={{ color: 'var(--color-secondary)' }}>Join the transparent medical funding network</p>
        </div>

        {/* Register Form */}
        <div className="glass-card p-8 animate-slide-in">
          {error && (
            <div className="alert alert-error flex items-center gap-2 mb-6 animate-fade-in" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={clsx('input-field pl-10', 'focus:ring-2')}
                  placeholder="Dr. Jane Smith"
                  required
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={clsx('input-field pl-10', 'focus:ring-2')}
                  placeholder="doctor@hospital.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={clsx('input-field pl-10 appearance-none', 'focus:ring-2')}
                  disabled={isLoading}
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                Role determines your permissions in the system
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={clsx('input-field pl-10', 'focus:ring-2')}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={clsx('input-field pl-10', 'focus:ring-2')}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className={clsx('btn-primary w-full py-3', 'disabled:opacity-50 disabled:cursor-not-allowed')}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Role Descriptions */}
        <div className="mt-8 animate-fade-in">
          <h4 className="font-medium mb-4 text-center" style={{ color: 'var(--color-secondary)' }}>Role Capabilities</h4>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(role => (
              <div
                key={role.value}
                className={clsx(
                  'p-3 rounded-xl text-sm transition-all duration-200',
                  formData.role === role.value
                    ? 'border-2'
                    : 'hover:border-opacity-50'
                )}
                style={{
                  borderColor: formData.role === role.value ? 'var(--color-primary)' : 'var(--color-card-border)',
                  background: formData.role === role.value ? 'rgba(0, 255, 163, 0.05)' : 'transparent'
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <role.icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  <span className="font-medium">{role.label}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}