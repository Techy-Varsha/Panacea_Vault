import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Shield,
  Brain,
  Zap,
  ArrowRight,
  Users,
  BarChart3,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

const features = [
  {
    icon: Brain,
    title: '0/1 Knapsack Engine',
    description: 'Optimal allocation using dynamic programming to maximize urgency-weighted treatment coverage within budget constraints.',
  },
  {
    icon: Zap,
    title: 'Greedy Fallback',
    description: 'Deterministic secondary allocation stage utilizes remaining funds for additional eligible treatment packages.',
  },
  {
    icon: Shield,
    title: 'Emergency Reserve',
    description: '15% reserved budget for life-threatening cases with ESI-verified authorization and full audit trail.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Scoring',
    description: 'Explainable urgency scores from ICD severity, time-criticality, success probability, and waiting-time anti-starvation.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'Secure authentication with PATIENT, DOCTOR, HOSPITAL, ADMIN, AUDITOR, and DONOR roles with server-side RBAC.',
  },
  {
    icon: Lock,
    title: 'Financial Audit Trail',
    description: 'Complete escrow-style disbursement workflow with utilization certificates, verification, and settlement tracking.',
  },
];

const stats = [
  { value: '100%', label: 'Open Source' },
  { value: '0/1', label: 'Knapsack DSA' },
  { value: '15%', label: 'Emergency Reserve' },
  { value: '5pts', label: 'Daily Waiting Boost' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-bio-dark-card to-transparent opacity-50" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--color-highlight) 0%, transparent 50%)', opacity: 0.1 }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(0, 255, 163, 0.1)', border: '1px solid rgba(0, 255, 163, 0.2)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Medical Crowdfunding Allocation Engine</span>
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-secondary)' }}>Prototype v1.0</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
              <span className="block">Panacea</span>
              <span className="block text-gradient">Vault</span>
            </h1>

            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-10" style={{ color: 'var(--color-secondary)' }}>
              Transparent, algorithmic allocation of medical crowdfunding funds.
              Built on rigorous 0/1 Knapsack optimization with emergency handling,
              financial auditability, and Bio-Emerald design identity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/login"
                className={clsx('btn-primary', 'w-full sm:w-auto')}
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/register"
                className={clsx('btn-secondary', 'w-full sm:w-auto')}
              >
                Create Account
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm" style={{ color: 'var(--color-muted)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span>HIPAA-Aware Design</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span>Full Audit Trail</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse-slow">
          <svg className="w-6 h-6" style={{ color: 'var(--color-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y" style={{ borderColor: 'var(--color-card-border)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-sm" style={{ color: 'var(--color-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Core Capabilities</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-secondary)' }}>
              Every component designed for transparency, correctness, and real-world medical funding workflows.
            </p>
          </div>

          <div className="card-grid">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="glass-card p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))' }}>
                  <feature.icon className="w-6 h-6" style={{ color: 'var(--color-bg)' }} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p style={{ color: 'var(--color-secondary)' }}>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24" style={{ background: 'rgba(0, 255, 163, 0.02)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Allocation Pipeline</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-secondary)' }}>
              From patient request to hospital disbursement — every step auditable, every decision explainable.
            </p>
          </div>

          <div className="relative">
            {/* Pipeline Steps */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0">
              {[
                { step: 1, label: 'Patient Request', desc: 'Doctor creates funding request with ICD, procedure, cost' },
                { step: 2, label: 'Scoring', desc: 'Urgency calculated from severity, TTC, success rate, waiting time' },
                { step: 3, label: 'Knapsack', desc: '0/1 DP optimization maximizes total urgency within budget' },
                { step: 4, label: 'Greedy Fallback', desc: 'Remaining funds allocated by value density' },
                { step: 5, label: 'Approval', desc: 'Admin reviews and approves selected allocations' },
                { step: 6, label: 'Disbursement', desc: 'Escrow-style transfer to verified hospitals' },
                { step: 7, label: 'Verification', desc: 'Utilization certificates confirm fund usage' },
                { step: 8, label: 'Settlement', desc: 'Case closed, audit trail complete' },
              ].map((stage, index) => (
                <React.Fragment key={stage.step}>
                  <div className="relative flex flex-col md:flex-1 items-center md:items-start p-6 glass-card animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full mb-4 font-bold text-lg" style={{
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))',
                      color: 'var(--color-bg)'
                    }}>
                      {stage.step}
                    </div>
                    <h3 className="text-lg font-semibold mb-1 text-center md:text-left">{stage.label}</h3>
                    <p className="text-sm text-center md:text-left" style={{ color: 'var(--color-secondary)' }}>{stage.desc}</p>
                  </div>
                  {index < 7 && (
                    <div className="hidden md:block flex-1 flex items-center justify-center px-2" style={{ color: 'var(--color-primary)' }}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile Vertical Connectors */}
            <div className="md:hidden absolute left-10 top-0 bottom-0 border-l-2" style={{ borderColor: 'var(--color-card-border)' }} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 text-center">
          <div className="glass-card p-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Transparent Medical Funding?</h2>
            <p className="text-lg mb-8" style={{ color: 'var(--color-secondary)' }}>
              Deploy Panacea Vault for your hospital network, research institution, or crowdfunding platform.
              Full source code, documentation, and deployment guides included.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className={clsx('btn-primary', 'w-full sm:w-auto')}>
                Start Allocation
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/register" className={clsx('btn-secondary', 'w-full sm:w-auto')}>
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--color-card-border)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))' }}>
                <HeartPulse className="w-5 h-5" style={{ color: 'var(--color-bg)' }} />
              </div>
              <span className="font-bold text-lg text-gradient">Panacea Vault</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Medical crowdfunding allocation engine • Built with 0/1 Knapsack DSA • Bio-Emerald Design System
            </p>
            <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--color-muted)' }}>
              <a href="#" className="hover:text-primary transition-colors">Documentation</a>
              <a href="#" className="hover:text-primary transition-colors">API Reference</a>
              <a href="#" className="hover:text-primary transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}