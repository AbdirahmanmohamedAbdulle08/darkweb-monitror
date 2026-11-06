import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Search,
  CreditCard,
  Tag,
  Activity,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Lock,
  Layers,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { UserProfile, Scan, PricingPlan, PaymentOrder, AuditLog, ThreatSource } from '../../types/index.ts';

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'scans' | 'providers' | 'payments' | 'pricing' | 'health' | 'audit'
  >('overview');

  // State
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [providers, setProviders] = useState<ThreatSource[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pricing editor state
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const fetchAdminData = () => {
    setLoading(true);
    Promise.all([
      api.getAdminOverview(),
      api.getAdminUsers(),
      api.getAdminScans(),
      api.getAdminPayments(),
      api.getAdminPricingPlans(),
      api.getAdminProviders(),
      api.getAdminAuditLogs(),
      api.getAdminHealth(),
    ])
      .then(([overviewRes, usersRes, scansRes, paymentsRes, pricingRes, providersRes, auditRes, healthRes]) => {
        setMetrics(overviewRes.metrics);
        setUsers(usersRes.users || []);
        setScans(scansRes.scans || []);
        setOrders(paymentsRes.orders || []);
        setPricingPlans(pricingRes.plans || []);
        setProviders(providersRes.providers || []);
        setAuditLogs(auditRes.logs || []);
        setHealthData(healthRes);
      })
      .catch(() => {
        // Handled
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'super_admin' ? 'customer' : 'super_admin';
    try {
      const res = await api.updateAdminUserRole(userId, newRole);
      setUsers(users.map(u => (u.id === userId ? res.user : u)));
    } catch {
      // Failed
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.updateAdminUserStatus(userId, newStatus);
      setUsers(users.map(u => (u.id === userId ? res.user : u)));
    } catch {
      // Failed
    }
  };

  const handleSavePrice = async (planId: string) => {
    try {
      const res = await api.updateAdminPricingPlan(planId, { amount: editPrice });
      setPricingPlans(pricingPlans.map(p => (p.id === planId ? res.plan : p)));
      setEditingPlan(null);
    } catch {
      // Failed
    }
  };

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex selection:bg-[#7C3AED]/20 selection:text-[#7C3AED]">
      {/* Super Admin Sidebar */}
      <aside className="w-64 border-r border-[#263449] bg-[#0D1525] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#263449] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#7C3AED]" />
            <div>
              <div className="text-sm font-bold text-[#F8FAFC]">DarkWatch</div>
              <div className="text-[10px] text-[#7C3AED] font-semibold uppercase tracking-wider">Super Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'System Overview', icon: Activity },
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'scans', label: 'Platform Scans', icon: Search },
            { id: 'providers', label: 'Threat Feeds', icon: Layers },
            { id: 'payments', label: 'Payment Ledger', icon: CreditCard },
            { id: 'pricing', label: 'Pricing Plans', icon: Tag },
            { id: 'health', label: 'API & Gateway Health', icon: CheckCircle },
            { id: 'audit', label: 'Security Audit Logs', icon: FileCode },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  active
                    ? 'bg-[#172235] text-[#7C3AED] border border-[#263449]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#7C3AED]' : 'text-[#64748B]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#263449] bg-[#0B111F]">
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] rounded border border-[#263449] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#263449] bg-[#0D1525]/80 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="text-xs text-[#94A3B8] flex items-center gap-2">
            <span>Admin Console</span>
            <span>/</span>
            <span className="text-[#F8FAFC] font-medium capitalize">{activeTab}</span>
          </div>

          <button
            onClick={fetchAdminData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] rounded border border-[#263449]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </header>

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: SYSTEM OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Administrative System Telemetry</h2>
                <p className="text-xs text-[#94A3B8]">High-level operational metrics and service status.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Total User Accounts</div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC]">{metrics?.totalUsers || users.length}</div>
                  <div className="text-[10px] text-[#64748B]">Customers & Administrators</div>
                </div>

                <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Total Threat Scans</div>
                  <div className="text-2xl font-bold font-mono text-[#00D4FF]">{metrics?.totalScans || scans.length}</div>
                  <div className="text-[10px] text-[#64748B]">Platform-wide Queries</div>
                </div>

                <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Critical Findings</div>
                  <div className="text-2xl font-bold font-mono text-[#EF4444]">{metrics?.criticalScans || 0}</div>
                  <div className="text-[10px] text-[#64748B]">High-Severity Targets</div>
                </div>

                <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Total Report Revenue</div>
                  <div className="text-2xl font-bold font-mono text-[#22C55E]">
                    ${(metrics?.totalRevenue || 0).toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-[#64748B]">Paid Transactions</div>
                </div>
              </div>

              {/* Service Health Quick Strip */}
              <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Provider Configuration Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#080D18] border border-[#263449] rounded space-y-1">
                    <span className="text-[#94A3B8]">Have I Been Pwned v3</span>
                    <div className="font-semibold text-[#F8FAFC]">
                      {healthData?.services?.threatIntelligence?.apiKeyPresent ? (
                        <span className="text-[#22C55E]">API Key Attached</span>
                      ) : (
                        <span className="text-[#F59E0B]">Setup Required</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[#080D18] border border-[#263449] rounded space-y-1">
                    <span className="text-[#94A3B8]">Google Gemini AI</span>
                    <div className="font-semibold text-[#F8FAFC]">
                      {healthData?.services?.aiEngine?.apiKeyPresent ? (
                        <span className="text-[#22C55E]">Gemini 3.8 Flash Active</span>
                      ) : (
                        <span className="text-[#F59E0B]">Fallback Engine</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[#080D18] border border-[#263449] rounded space-y-1">
                    <span className="text-[#94A3B8]">Mobile Money (EVC/Waafi)</span>
                    <div className="font-semibold text-[#F8FAFC]">
                      {healthData?.services?.payments?.localMobileMoney?.configured ? (
                        <span className="text-[#22C55E]">Gateway Live</span>
                      ) : (
                        <span className="text-[#94A3B8]">Setup Required</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[#080D18] border border-[#263449] rounded space-y-1">
                    <span className="text-[#94A3B8]">Database Architecture</span>
                    <div className="font-semibold text-[#00D4FF]">
                      {healthData?.services?.database?.engine || 'Relational Store'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">User Account Management</h2>
                <p className="text-xs text-[#94A3B8]">Enforce administrative roles and account status.</p>
              </div>

              <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-[#94A3B8]">
                  <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                    <tr>
                      <th className="px-5 py-3">Full Name</th>
                      <th className="px-5 py-3">Email Address</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Registered</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263449]/50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-[#172235]/30">
                        <td className="px-5 py-3.5 font-bold text-[#F8FAFC]">{u.fullName}</td>
                        <td className="px-5 py-3.5 font-mono">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              u.role === 'super_admin'
                                ? 'bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30'
                                : 'bg-[#172235] text-[#94A3B8]'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              u.status === 'active'
                                ? 'text-[#22C55E] bg-[#22C55E]/10'
                                : 'text-[#EF4444] bg-[#EF4444]/10'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleRoleToggle(u.id, u.role)}
                            className="px-2.5 py-1 bg-[#172235] hover:bg-[#202f47] text-[#7C3AED] border border-[#263449] rounded text-[10px] font-semibold"
                          >
                            {u.role === 'super_admin' ? 'Demote' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            className={`px-2.5 py-1 rounded text-[10px] font-semibold border ${
                              u.status === 'active'
                                ? 'text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/10'
                                : 'text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/10'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PLATFORM SCANS */}
          {activeTab === 'scans' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">All Platform Scans</h2>
                <p className="text-xs text-[#94A3B8]">Audit all personal and domain scans across users.</p>
              </div>

              <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-[#94A3B8]">
                  <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                    <tr>
                      <th className="px-5 py-3">Scan Target</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Risk Score</th>
                      <th className="px-5 py-3">Severity</th>
                      <th className="px-5 py-3">Breaches</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263449]/50">
                    {scans.map(s => (
                      <tr key={s.id} className="hover:bg-[#172235]/30">
                        <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC]">{s.targetValue}</td>
                        <td className="px-5 py-3.5 uppercase text-[10px]">{s.targetType}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC]">{s.riskScore}/100</td>
                        <td className="px-5 py-3.5 font-semibold">{s.severity}</td>
                        <td className="px-5 py-3.5 font-mono text-[#00D4FF]">{s.breachCount}</td>
                        <td className="px-5 py-3.5 text-[11px]">{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/scan/${s.id}`}
                            className="px-2.5 py-1 bg-[#172235] hover:bg-[#202f47] text-[#00D4FF] border border-[#263449] rounded text-[11px]"
                          >
                            Dossier
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: THREAT INTELLIGENCE PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Threat Intelligence Providers</h2>
                <p className="text-xs text-[#94A3B8]">Active feed adapters and synchronization metrics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map(p => (
                  <div key={p.id} className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#F8FAFC]">{p.name}</h3>
                      <span className="text-xs font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded border border-[#22C55E]/30">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{p.description}</p>
                    <div className="pt-2 border-t border-[#263449] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#64748B]">Documented Breaches:</span>
                        <div className="font-mono font-bold text-[#F8FAFC]">{p.breachCount}</div>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Catalog Accounts:</span>
                        <div className="font-mono font-bold text-[#00D4FF]">
                          {p.pwnCount ? (p.pwnCount / 1000000000).toFixed(1) + ' Billion' : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT TRANSACTIONS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Payment Orders & Webhook Transactions</h2>
                <p className="text-xs text-[#94A3B8]">Complete audit trail of customer payment orders and status.</p>
              </div>

              <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-[#94A3B8]">
                  <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                    <tr>
                      <th className="px-5 py-3">Order Reference</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263449]/50">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-[#172235]/30">
                        <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC]">{o.orderReference}</td>
                        <td className="px-5 py-3.5 uppercase">{o.paymentMethod.replace('_', ' ')}</td>
                        <td className="px-5 py-3.5 font-mono text-[#F8FAFC]">${o.amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              o.status === 'paid'
                                ? 'text-[#22C55E] bg-[#22C55E]/10'
                                : o.status === 'pending'
                                ? 'text-[#00D4FF] bg-[#00D4FF]/10'
                                : 'text-[#F59E0B] bg-[#F59E0B]/10'
                            }`}
                          >
                            {o.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px]">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PRICING PLANS */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Configurable Pricing Plans</h2>
                <p className="text-xs text-[#94A3B8]">Modify tier prices, intervals, and active status.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pricingPlans.map(plan => (
                  <div key={plan.id} className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#F8FAFC]">{plan.name}</h3>
                      <span className="font-mono text-base font-bold text-[#00D4FF]">
                        ${plan.amount.toFixed(2)} {plan.currency}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">{plan.description}</p>
                    <div className="text-[10px] text-[#64748B] uppercase">Interval: {plan.billingInterval}</div>

                    {editingPlan?.id === plan.id ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-[#263449]">
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={e => setEditPrice(parseFloat(e.target.value))}
                          className="bg-[#080D18] border border-[#263449] rounded p-1.5 text-xs text-[#F8FAFC] w-24"
                        />
                        <button
                          onClick={() => handleSavePrice(plan.id)}
                          className="px-3 py-1 bg-[#22C55E] text-[#080D18] font-bold text-xs rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlan(null)}
                          className="px-2 py-1 text-xs text-[#94A3B8]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setEditPrice(plan.amount);
                        }}
                        className="mt-2 text-xs text-[#00D4FF] hover:underline"
                      >
                        Edit Price
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: API & GATEWAY HEALTH */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">API & Gateway Health Diagnostics</h2>
                <p className="text-xs text-[#94A3B8]">Real-time connectivity reports across external integrations.</p>
              </div>

              <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-[#080D18] border border-[#263449] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#F8FAFC]">Have I Been Pwned API v3</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {healthData?.services?.threatIntelligence?.notice}
                      </div>
                    </div>
                    <span
                      className={`font-semibold uppercase px-2.5 py-1 rounded text-[10px] ${
                        healthData?.services?.threatIntelligence?.status === 'active'
                          ? 'text-[#22C55E] bg-[#22C55E]/10'
                          : 'text-[#F59E0B] bg-[#F59E0B]/10'
                      }`}
                    >
                      {healthData?.services?.threatIntelligence?.status}
                    </span>
                  </div>

                  <div className="p-4 bg-[#080D18] border border-[#263449] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#F8FAFC]">Google Gemini AI API (gemini-3.8-flash)</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Threat summarization and remediation recommendation engine
                      </div>
                    </div>
                    <span
                      className={`font-semibold uppercase px-2.5 py-1 rounded text-[10px] ${
                        healthData?.services?.aiEngine?.status === 'active'
                          ? 'text-[#22C55E] bg-[#22C55E]/10'
                          : 'text-[#F59E0B] bg-[#F59E0B]/10'
                      }`}
                    >
                      {healthData?.services?.aiEngine?.status}
                    </span>
                  </div>

                  <div className="p-4 bg-[#080D18] border border-[#263449] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#F8FAFC]">Local Mobile Money (EVC Plus, Waafi)</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Regional mobile carrier merchant gateway adapter
                      </div>
                    </div>
                    <span
                      className={`font-semibold uppercase px-2.5 py-1 rounded text-[10px] ${
                        healthData?.services?.payments?.localMobileMoney?.configured
                          ? 'text-[#22C55E] bg-[#22C55E]/10'
                          : 'text-[#F59E0B] bg-[#F59E0B]/10'
                      }`}
                    >
                      {healthData?.services?.payments?.localMobileMoney?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Security Audit Logs</h2>
                <p className="text-xs text-[#94A3B8]">Immutable security event records across the application.</p>
              </div>

              <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-[#94A3B8]">
                  <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                    <tr>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Action</th>
                      <th className="px-5 py-3">Resource Type</th>
                      <th className="px-5 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263449]/50">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#172235]/30">
                        <td className="px-5 py-3 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-semibold text-[#F8FAFC]">{log.action}</td>
                        <td className="px-5 py-3 uppercase text-[10px]">{log.resourceType}</td>
                        <td className="px-5 py-3 text-[11px] text-[#94A3B8] font-mono truncate max-w-xs">
                          {JSON.stringify(log.details || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
