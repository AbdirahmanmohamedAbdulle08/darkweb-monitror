import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Trash2, CheckCircle, Clock, AlertCircle, Shield, Globe, Mail, Search } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import type { WatchlistItem } from '../../types/index.ts';

export function WatchlistsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Add Asset form state
  const [assetType, setAssetType] = useState<'email' | 'domain'>('email');
  const [assetValue, setAssetValue] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchWatchlists = () => {
    setLoading(true);
    api
      .getWatchlists()
      .then(res => setItems(res.watchlists || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const handleToggleMonitoring = async (id: string) => {
    try {
      const res = await api.toggleWatchlistMonitoring(id);
      setItems(items.map(item => (item.id === id ? res.item : item)));
    } catch {
      // Failed
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this asset from your surveillance watchlist?')) return;
    try {
      await api.removeWatchlist(id);
      setItems(items.filter(item => item.id !== id));
    } catch {
      // Failed
    }
  };

  const handleScanAsset = async (item: WatchlistItem) => {
    setScanningId(item.id);
    try {
      const res = await api.executeAuthenticatedScan(item.assetValue, item.assetType);
      if (res.success && res.scan) {
        navigate(`/scan/${res.scan.id}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Scan query failed.');
    } finally {
      setScanningId(null);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSubmitting(true);

    try {
      const res = await api.addWatchlist(assetType, assetValue);
      setActionSuccess(res.message);
      setAssetValue('');
      fetchWatchlists();
      setTimeout(() => {
        setShowAddModal(false);
        setActionSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to add asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Asset Surveillance Watchlists</h1>
            <p className="text-xs text-[#94A3B8]">
              Manage authorized personal email addresses and verified corporate domains under continuous surveillance.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Monitored Asset</span>
          </button>
        </div>

        {/* Watchlist Table */}
        <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">Loading watchlists...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8] space-y-2">
              <Eye className="w-8 h-8 text-[#64748B] mx-auto" />
              <div>No assets currently in your watchlist.</div>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 px-3 py-1.5 bg-[#172235] hover:bg-[#202f47] border border-[#263449] text-[#00D4FF] rounded text-xs font-semibold"
              >
                Add First Asset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#94A3B8]">
                <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                  <tr>
                    <th className="px-5 py-3">Asset Target</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Ownership Verification</th>
                    <th className="px-5 py-3">Surveillance Status</th>
                    <th className="px-5 py-3">Last Evaluated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/50">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-[#172235]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC] flex items-center gap-2">
                        {item.assetType === 'email' ? (
                          <Mail className="w-3.5 h-3.5 text-[#00D4FF]" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-[#7C3AED]" />
                        )}
                        <span>{item.assetValue}</span>
                      </td>
                      <td className="px-5 py-3.5 uppercase text-[10px]">{item.assetType}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            item.verificationStatus === 'verified'
                              ? 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10'
                              : 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10'
                          }`}
                        >
                          {item.verificationStatus === 'verified' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{item.verificationStatus}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleMonitoring(item.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            item.isMonitored
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/20'
                              : 'bg-[#172235] text-[#94A3B8] border border-[#263449] hover:text-[#F8FAFC]'
                          }`}
                        >
                          {item.isMonitored ? 'Active Surveillance' : 'Paused'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-[11px]">
                        {item.lastScannedAt ? new Date(item.lastScannedAt).toLocaleDateString() : 'Pending Query'}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleScanAsset(item)}
                          disabled={scanningId === item.id}
                          className="px-2.5 py-1 bg-[#172235] hover:bg-[#202f47] text-[#00D4FF] border border-[#263449] rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                          title="Run immediate threat scan"
                        >
                          {scanningId === item.id ? 'Scanning...' : 'Scan Now'}
                        </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] rounded transition-colors inline-flex items-center"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Asset Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#111827] border border-[#263449] rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#263449] pb-3">
                <h3 className="text-sm font-bold text-[#F8FAFC]">Add Asset to Surveillance Watchlist</h3>
                <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-[#F8FAFC]">
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#94A3B8]">Asset Classification</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetType('email')}
                      className={`p-2.5 rounded text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                        assetType === 'email'
                          ? 'bg-[#172235] border-[#00D4FF] text-[#00D4FF]'
                          : 'bg-[#080D18] border-[#263449] text-[#94A3B8]'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Personal Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetType('domain')}
                      className={`p-2.5 rounded text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                        assetType === 'domain'
                          ? 'bg-[#172235] border-[#00D4FF] text-[#00D4FF]'
                          : 'bg-[#080D18] border-[#263449] text-[#94A3B8]'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Authorized Domain</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#94A3B8]">
                    {assetType === 'email' ? 'Email Address' : 'Domain Root (e.g. company.com)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={assetValue}
                    onChange={e => setAssetValue(e.target.value)}
                    placeholder={assetType === 'email' ? 'user@domain.com' : 'enterprise.com'}
                    className="w-full bg-[#080D18] border border-[#263449] rounded p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div className="p-3 bg-[#080D18] border border-[#263449] rounded text-[11px] text-[#94A3B8] leading-relaxed">
                  Notice: To maintain strict compliance and prevent unauthorized surveillance, added assets must be verified via ownership challenges before automated threat scans occur.
                </div>

                {actionError && (
                  <div className="p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-xs text-[#EF4444] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {actionSuccess && (
                  <div className="p-2.5 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded text-xs text-[#22C55E] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Add to Watchlist'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
