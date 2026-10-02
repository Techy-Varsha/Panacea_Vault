import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeartPulse, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))' }}>
              <HeartPulse className="w-7 h-7" style={{ color: 'var(--color-bg)' }} />
            </div>
            <span className="text-2xl font-bold text-gradient">Panacea Vault</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p style={{ color: 'var(--color-secondary)' }}>Sign in to access your dashboard</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8 animate-slide-in">
          {error && (
            <div className="alert alert-error flex items-center gap-2 mb-6 animate-fade-in" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={clsx('input-field pl-10', 'focus:ring-2')}
                  style={{ '--focus-ring-color': 'var(--color-primary)' }}
                  placeholder="doctor@hospital.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={clsx('input-field pl-10 pr-12', 'focus:ring-2')}
                  style={{ '--focus-ring-color': 'var(--color-primary)' }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 rounded-xl animate-fade-in" style={{ background: 'rgba(0, 255, 163, 0.05)', border: '1px solid rgba(0, 255, 163, 0.1)' }}>
          <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
            Demo Credentials
          </h4>
          <div className="space-y-2 text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
            <div><strong>Admin:</strong> admin@panacea.vault / admin123</div>
            <div><strong>Doctor:</strong> dr.smith@hospital.com / doctor123</div>
            <div><strong>Hospital:</strong> admin@cityhospital.com / hospital123</div>
            <div><strong>Auditor:</strong> auditor@panacea.vault / auditor123</div>
            <div><strong>Patient:</strong> patient@example.com / patient123</div>
            <div><strong>Donor:</strong> donor@foundation.org / donor123</div>
          </div>
        </div>
      </div>
    </div>
  );
}