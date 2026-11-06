import React, { useState } from 'react';
import { User, Lock, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';

export function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword !== confirmPassword) {
      setStatusMessage({ success: false, text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setStatusMessage({ success: false, text: 'Password must be at least 8 characters long.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.updatePassword({ currentPassword, newPassword });
      setStatusMessage({ success: true, text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setStatusMessage({ success: false, text: err instanceof Error ? err.message : 'Password update failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Account & Security Settings</h1>
          <p className="text-xs text-[#94A3B8]">
            Manage profile identifiers, credentials, and cryptographic security settings.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00D4FF]">
            <User className="w-3.5 h-3.5" />
            <span>Profile Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[#94A3B8]">Full Name</span>
              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded text-[#F8FAFC] font-medium">
                {user?.fullName || 'User'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#94A3B8]">Authorized Email</span>
              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded text-[#F8FAFC] font-mono">
                {user?.email}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#94A3B8]">Access Role</span>
              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded text-[#00D4FF] font-semibold uppercase">
                {user?.role}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#94A3B8]">Account Status</span>
              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded text-[#22C55E] font-semibold capitalize">
                {user?.status}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00D4FF]">
            <Lock className="w-3.5 h-3.5" />
            <span>Authentication Credentials</span>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5 max-w-md">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#080D18] border border-[#263449] rounded p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">New Password (min 8 characters)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#080D18] border border-[#263449] rounded p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#080D18] border border-[#263449] rounded p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
              />
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  statusMessage.success
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                    : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                }`}
              >
                {statusMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
