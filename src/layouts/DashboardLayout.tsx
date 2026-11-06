import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Search,
  History,
  AlertTriangle,
  Eye,
  FileText,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'New Scan', path: '/dashboard/scan', icon: Search },
    { label: 'My Scans', path: '/dashboard/scans', icon: History },
    { label: 'Exposure Findings', path: '/dashboard/findings', icon: AlertTriangle },
    { label: 'Watchlists', path: '/dashboard/watchlists', icon: Eye },
    { label: 'Reports', path: '/dashboard/reports', icon: FileText },
    { label: 'Payments', path: '/dashboard/payments', icon: CreditCard },
    { label: 'Notifications', path: '/dashboard/notifications', icon: Bell },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Desktop Sidebar (250px) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#263449] bg-[#0D1525] shrink-0">
        {/* Brand Lockup */}
        <div className="p-6 border-b border-[#263449] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#00D4FF]" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#F8FAFC]">DarkWatch</span>
              <span className="text-[10px] text-[#94A3B8]">Threat Portal</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#172235] text-[#00D4FF] border border-[#263449]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#00D4FF]' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-[#263449]">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Privileged Access
              </div>
              <Link
                to="/admin"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium text-[#7C3AED] hover:bg-[#172235] transition-colors"
              >
                <span>Super Admin Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </nav>

        {/* User Identity & Logout */}
        <div className="p-4 border-t border-[#263449] bg-[#0B111F]">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate pr-2">
              <div className="text-xs font-semibold text-[#F8FAFC] truncate">{user?.fullName || 'User'}</div>
              <div className="text-[11px] text-[#94A3B8] truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 rounded border border-[#EF4444]/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#263449] bg-[#0D1525]/80 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-xs text-[#94A3B8] flex items-center gap-2">
              <span>DarkWatch</span>
              <span>/</span>
              <span className="text-[#F8FAFC] font-medium capitalize">
                {location.pathname.replace('/dashboard', '').replace('/', '') || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/scan"
              className="px-3.5 py-1.5 text-xs font-semibold text-[#080D18] bg-[#00D4FF] hover:bg-[#00b8de] rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Scan Target</span>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0D1525] border-b border-[#263449] px-4 py-3 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
