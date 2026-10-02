import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Search,
  AlertTriangle,
  CreditCard,
  ClipboardList,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  HeartPulse,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'HOSPITAL', 'AUDITOR', 'DONOR', 'PATIENT'] },
  { name: 'Requests', href: '/requests', icon: FileText, roles: ['ADMIN', 'DOCTOR', 'HOSPITAL', 'AUDITOR', 'PATIENT'] },
  { name: 'Create Request', href: '/requests/create', icon: PlusCircle, roles: ['DOCTOR', 'ADMIN'] },
  { name: 'Allocation', href: '/allocation', icon: Search, roles: ['ADMIN', 'AUDITOR'] },
  { name: 'Emergency', href: '/emergency', icon: AlertTriangle, roles: ['ADMIN'] },
  { name: 'Financial Ledger', href: '/ledger', icon: CreditCard, roles: ['ADMIN', 'AUDITOR', 'HOSPITAL'] },
  { name: 'Audit Trail', href: '/audit', icon: ClipboardList, roles: ['ADMIN', 'AUDITOR'] },
  { name: 'Hospitals', href: '/hospitals', icon: Building2, roles: ['ADMIN', 'AUDITOR'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'DOCTOR', 'HOSPITAL', 'AUDITOR', 'DONOR', 'PATIENT'] },
];

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role || ''));

  return (
    <header className="header-nav">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" aria-label="Panacea Vault Home">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))' }}>
              <HeartPulse className="w-6 h-6" style={{ color: 'var(--color-bg)' }} />
            </div>
            <span className="text-xl font-bold text-gradient">Panacea Vault</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r'
                      : 'hover:bg-opacity-10'
                  )}
                  style={{
                    ...(isActive ? {
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))',
                      color: 'var(--color-bg)'
                    } : {
                      color: 'var(--color-text)'
                    })
                  }}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all duration-200 hover:bg-opacity-10"
              style={{ color: 'var(--color-text)' }}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-opacity-10"
                style={{ color: 'var(--color-text)' }}
                aria-expanded={mobileMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))' }}>
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-xl transition-all duration-200 hover:bg-opacity-10"
              style={{ color: 'var(--color-text)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t animate-slide-in" style={{ borderColor: 'var(--color-card-border)' }}>
            <nav className="flex flex-col gap-2" role="navigation" aria-label="Mobile navigation">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r'
                        : 'hover:bg-opacity-10'
                    )}
                    style={{
                      ...(isActive ? {
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-highlight))',
                        color: 'var(--color-bg)'
                      } : {
                        color: 'var(--color-text)'
                      })
                    }}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-card-border)' }}>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-opacity-10"
                  style={{ color: 'var(--color-text)' }}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-opacity-10"
                  style={{ color: 'var(--color-text)' }}
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}