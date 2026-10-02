import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  HeartPulse,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardSummary {
  total_budget_inr: number;
  allocated_amount_inr: number;
  remaining_budget_inr: number;
  treatment_packages_funded: number;
  emergency_allocations: number;
  utilization_rate: number;
  settlement_rate: number;
}

interface AllocationFlowData {
  nodes: Array<{ id: string; label: string; value: number; percentage: number }>;
  links: Array<{ source: string; target: string; value: number }>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [flowData, setFlowData] = useState<AllocationFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [summaryRes, flowRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/flow'),
      ]);
      setSummary(summaryRes.data);
      setFlowData(flowRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  const statCards = [
    {
      icon: DollarSign,
      label: 'Total Budget',
      value: summary ? formatCurrency(summary.total_budget_inr) : '₹0',
      color: 'var(--color-primary)',
    },
    {
      icon: HeartPulse,
      label: 'Allocated',
      value: summary ? formatCurrency(summary.allocated_amount_inr) : '₹0',
      color: 'var(--color-highlight)',
    },
    {
      icon: Users,
      label: 'Packages Funded',
      value: summary ? summary.treatment_packages_funded.toString() : '0',
      color: 'var(--color-secondary)',
    },
    {
      icon: AlertTriangle,
      label: 'Emergency Allocations',
      value: summary ? summary.emergency_allocations.toString() : '0',
      color: '#EF4444',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p style={{ color: 'var(--color-secondary)' }}>
            Welcome back, {user?.full_name} ({user?.role})
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={clsx('w-5 h-5', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 border-red-500/30" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
                  {stat.label}
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Utilization Rate</h3>
          <div className="relative h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-card-border)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="8"
                strokeDasharray={283}
                strokeDashoffset={283 * (1 - (summary?.utilization_rate || 0) / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {summary?.utilization_rate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Settlement Rate</h3>
          <div className="relative h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-card-border)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--color-highlight)"
                strokeWidth="8"
                strokeDasharray={283}
                strokeDashoffset={283 * (1 - (summary?.settlement_rate || 0) / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: 'var(--color-highlight)' }}>
                {summary?.settlement_rate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Flow */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Allocation Flow</h3>
        {flowData ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {flowData.nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'var(--color-bg)',
                  }}
                >
                  <span>{node.label}</span>
                  <span className="font-mono">{node.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="h-48 flex items-end justify-around px-4">
              {flowData.nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex flex-col items-center flex-1 max-w-32"
                >
                  <div
                    className="w-full rounded-t transition-all duration-1000"
                    style={{
                      height: `${node.percentage * 2}px`,
                      background: 'var(--color-primary)',
                      minHeight: node.value > 0 ? '8px' : 0,
                    }}
                  />
                  <span className="text-xs mt-2 text-center" style={{ color: 'var(--color-muted)' }}>
                    {node.label}
                  </span>
                  <span className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>
                    ₹{node.value.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)' }}>No allocation data available</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Create Funding Request', desc: 'Submit a new treatment funding request', href: '/requests/create', icon: HeartPulse, roles: ['DOCTOR'] },
          { title: 'Run Allocation', desc: 'Execute knapsack allocation for current budget', href: '/allocation', icon: TrendingUp, roles: ['ADMIN'] },
          { title: 'Emergency Allocation', desc: 'Process emergency reserve allocation', href: '/emergency', icon: AlertTriangle, roles: ['ADMIN'] },
          { title: 'View Requests', desc: 'Browse all funding requests', href: '/requests', icon: Users, roles: ['DOCTOR', 'ADMIN', 'AUDITOR', 'HOSPITAL'] },
          { title: 'Audit Logs', desc: 'Review system audit trail', href: '/audit', icon: Clock, roles: ['ADMIN', 'AUDITOR'] },
          { title: 'Financial Ledger', desc: 'View disbursements and settlements', href: '/ledger', icon: DollarSign, roles: ['ADMIN', 'AUDITOR'] },
        ].filter((action) => !action.roles || action.roles.includes(user?.role || '')).map((action, index) => (
          <Link key={index} to={action.href} className="glass-card p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
              >
                <action.icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold">{action.title}</h4>
                <p className="text-sm mt-1" style={{ color: 'var(--color-secondary)' }}>
                  {action.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}