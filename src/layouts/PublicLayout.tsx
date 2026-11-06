import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Terminal, ArrowRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex flex-col selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-50 bg-[#080D18]/90 backdrop-blur-md border-b border-[#263449]">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F8FAFC] hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0"
          >
            <Shield className="w-5 h-5 text-[#00D4FF]" />
            <span>DarkWatch Intelligence</span>
          </Link>

          {/* Zone 2: 4-5 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#94A3B8]">
            <a href="#scanner" className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0">
              Live Scanner
            </a>
            <a href="#capabilities" className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#how-it-works" className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#sources" className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0">
              Threat Feeds
            </a>
            <a href="#pricing" className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                onClick={() => navigate(user.role === 'super_admin' ? '/admin' : '/dashboard')}
                className="px-4 py-2 text-xs font-semibold text-[#080D18] bg-[#00D4FF] rounded-lg hover:bg-[#00b8de] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth?mode=login"
                  className="px-3.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="px-4 py-2 text-xs font-semibold text-[#080D18] bg-[#00D4FF] rounded-lg hover:bg-[#00b8de] transition-colors whitespace-nowrap shrink-0"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#263449] bg-[#0D1525] py-12 text-sm text-[#94A3B8]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-base font-bold text-[#F8FAFC]">
              <Shield className="w-4 h-4 text-[#00D4FF]" />
              <span>DarkWatch Intelligence</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Discover. Monitor. Protect. High-fidelity threat intelligence and breach exposure monitoring platform for authorized personal and enterprise assets.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#scanner" className="hover:text-[#F8FAFC] transition-colors">Personal Email Scan</a>
              </li>
              <li>
                <a href="#scanner" className="hover:text-[#F8FAFC] transition-colors">Authorized Domain Scan</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#F8FAFC] transition-colors">Deep Forensic Reports</a>
              </li>
              <li>
                <a href="#sources" className="hover:text-[#F8FAFC] transition-colors">Have I Been Pwned v3 Feed</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] mb-3">
              Security & Privacy
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#22C55E]" />
                <span>Zero Plaintext Passwords</span>
              </li>
              <li>
                <span>Strict Ownership Authorization</span>
              </li>
              <li>
                <span>SHA-1 k-Anonymity Hashes</span>
              </li>
              <li>
                <span>PostgreSQL Row-Level Security</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] mb-3">
              Data Transparency
            </h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-2">
              Primary intelligence queries use the Have I Been Pwned API v3. DarkWatch processes and scores public exposure records without indexing private stolen credentials.
            </p>
            <div className="text-[11px] text-[#64748B]">
              &copy; {new Date().getFullYear()} DarkWatch Intelligence. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
