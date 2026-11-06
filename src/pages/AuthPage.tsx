import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { PublicLayout } from '../layouts/PublicLayout.tsx';
import { api } from '../services/api.ts';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(
    (searchParams.get('mode') as any) || (searchParams.get('token') ? 'reset' : 'login')
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState(searchParams.get('token') || '');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else if (mode === 'register') {
        await register(email, password, fullName);
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setSuccessMessage(res.message);
        if (res.previewToken) {
          setResetToken(res.previewToken);
        }
      } else if (mode === 'reset') {
        const res = await api.resetPassword({ token: resetToken, newPassword });
        setSuccessMessage(res.message);
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate(demoEmail.includes('admin') ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-[#111827] border border-[#263449] rounded-xl p-8 space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-[#172235] border border-[#263449] text-[#00D4FF] mb-1">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
              {mode === 'login' ? 'Sign in to DarkWatch' : mode === 'register' ? 'Create Threat Portal Account' : 'Reset Password'}
            </h1>
            <p className="text-xs text-[#94A3B8]">
              {mode === 'login'
                ? 'Access your scans, continuous watchlists, and forensic reports.'
                : mode === 'register'
                ? 'Join to verify assets and enable automated dark web surveillance.'
                : 'Enter your email to receive recovery instructions.'}
            </p>
          </div>

          {/* Quick Demo Logins Banner */}
          <div className="p-3.5 bg-[#080D18] border border-[#263449] rounded-lg space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              Instant Evaluation Logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('user@darkwatch.sec', 'UserPass123!')}
                className="px-2.5 py-1.5 bg-[#172235] hover:bg-[#202f47] border border-[#263449] rounded text-[11px] font-medium text-[#00D4FF] transition-colors truncate"
              >
                Demo Customer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@darkwatch.sec', 'AdminPass123!')}
                className="px-2.5 py-1.5 bg-[#172235] hover:bg-[#202f47] border border-[#263449] rounded text-[11px] font-medium text-[#7C3AED] transition-colors truncate"
              >
                Super Admin
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#94A3B8]">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full bg-[#080D18] border border-[#263449] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            )}

            {mode !== 'reset' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#94A3B8]">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-[#080D18] border border-[#263449] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#94A3B8]">Password Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value)}
                    placeholder="Enter reset token (e.g. rst_...)"
                    className="w-full bg-[#080D18] border border-[#263449] rounded-lg p-2.5 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#94A3B8]">New Password (min 8 characters)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#080D18] border border-[#263449] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                    />
                  </div>
                </div>
              </>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#94A3B8]">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-[#00D4FF] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#080D18] border border-[#263449] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
              </div>
            )}

            {mode === 'forgot' && resetToken && (
              <div className="p-3 bg-[#172235] border border-[#00D4FF]/30 rounded-lg text-xs space-y-2">
                <div className="text-[#00D4FF] font-semibold">Sandbox Reset Token Generated:</div>
                <div className="font-mono text-[11px] text-[#F8FAFC] break-all">{resetToken}</div>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="px-3 py-1 bg-[#00D4FF] text-[#080D18] font-bold text-[11px] rounded"
                >
                  Set New Password Now
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg text-xs text-[#22C55E] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                  ? 'Create Account'
                  : mode === 'forgot'
                  ? 'Send Reset Link'
                  : 'Update Password'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center text-xs text-[#94A3B8] pt-2 border-t border-[#263449]">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-[#00D4FF] font-medium hover:underline">
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Return to{' '}
                <button onClick={() => setMode('login')} className="text-[#00D4FF] font-medium hover:underline">
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
