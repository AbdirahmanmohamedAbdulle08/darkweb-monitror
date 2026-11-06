import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  AlertTriangle,
  History,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  CreditCard,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import type { Scan, WatchlistItem, ScanFinding } from '../../types/index.ts';

export function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyScans(), api.getWatchlists()])
      .then(([scansRes, watchlistsRes]) => {
        setScans(scansRes.scans || []);
        setWatchlists(watchlistsRes.watchlists || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute metrics from actual database records
  const totalScans = scans.length;
  const totalBreaches = scans.reduce((acc, s) => acc + s.breachCount, 0);
  const criticalExposures = scans.filter(s => s.severity === 'Critical').length;
  const highExposures = scans.filter(s => s.severity === 'High').length;
  const mediumExposures = scans.filter(s => s.severity === 'Medium').length;
  const lowExposures = scans.filter(s => s.severity === 'Low').length;
  const cleanScans = scans.filter(s => s.severity === 'Informational' || s.breachCount === 0).length;
  const activeMonitors = watchlists.filter(w => w.isMonitored).length;

  // Flatten latest findings across all scans
  const latestFindings: Array<ScanFinding & { targetValue: string }> = [];
  for (const s of scans) {
    if (s.findings) {
      for (const f of s.findings) {
        latestFindings.push({ ...f, targetValue: s.targetValue });
      }
    }
  }

  // Calculate risk percentages
  const safeDiv = (count: number) => (totalScans > 0 ? Math.round((count / totalScans) * 100) : 0);
  const critPct = safeDiv(criticalExposures);
  const highPct = safeDiv(highExposures);
  const medPct = safeDiv(mediumExposures);
  const lowPct = safeDiv(lowExposures);
  const cleanPct = safeDiv(cleanScans);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Threat Intelligence Command</h1>
            <p className="text-xs text-[#94A3B8]">
              Continuous asset surveillance and breach telemetry summary for {user?.email}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/scan"
              className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Initiate Scan</span>
            </Link>
          </div>
        </div>

        {/* 4 Primary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Total Scans Executed</div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">{totalScans}</div>
            <div className="text-[10px] text-[#64748B]">Personal & Domain Scans</div>
          </div>

          <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Confirmed Breaches</div>
            <div className="text-2xl font-bold font-mono text-[#00D4FF]">{totalBreaches}</div>
            <div className="text-[10px] text-[#64748B]">Documented Incidents</div>
          </div>

          <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Critical & High Risks</div>
            <div className="text-2xl font-bold font-mono text-[#EF4444]">{criticalExposures + highExposures}</div>
            <div className="text-[10px] text-[#64748B]">Requires Immediate Remediation</div>
          </div>

          <div className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Monitored Assets</div>
            <div className="text-2xl font-bold font-mono text-[#22C55E]">{activeMonitors}</div>
            <div className="text-[10px] text-[#64748B]">Active Watchlist Assets</div>
          </div>
        </div>

        {/* Middle Row: Risk Distribution + Account Subscription Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Distribution Widget (2 cols) */}
          <div className="lg:col-span-2 p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Risk Severity Distribution
                </h2>
                <div className="text-xs text-[#94A3B8]">Evaluated risk breakdown across all monitored entities</div>
              </div>
              <span className="text-xs font-mono text-[#00D4FF]">{totalScans} evaluated</span>
            </div>

            {/* Distribution Bar */}
            <div className="w-full h-3 rounded-full bg-[#080D18] border border-[#263449] overflow-hidden flex">
              {critPct > 0 && <div style={{ width: `${critPct}%` }} className="h-full bg-[#EF4444]" title={`Critical: ${critPct}%`} />}
              {highPct > 0 && <div style={{ width: `${highPct}%` }} className="h-full bg-[#F59E0B]" title={`High: ${highPct}%`} />}
              {medPct > 0 && <div style={{ width: `${medPct}%` }} className="h-full bg-yellow-400" title={`Medium: ${medPct}%`} />}
              {lowPct > 0 && <div style={{ width: `${lowPct}%` }} className="h-full bg-[#22C55E]" title={`Low: ${lowPct}%`} />}
              {cleanPct > 0 && <div style={{ width: `${cleanPct}%` }} className="h-full bg-[#00D4FF]" title={`Clean: ${cleanPct}%`} />}
              {totalScans === 0 && <div className="w-full h-full bg-[#263449]" />}
            </div>

            {/* Legend & Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded-lg">
                <div className="flex items-center gap-1.5 text-[#EF4444] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span>Critical</span>
                </div>
                <div className="font-mono text-sm font-bold text-[#F8FAFC] mt-1">{criticalExposures}</div>
                <div className="text-[10px] text-[#64748B]">{critPct}% of scans</div>
              </div>

              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded-lg">
                <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  <span>High</span>
                </div>
                <div className="font-mono text-sm font-bold text-[#F8FAFC] mt-1">{highExposures}</div>
                <div className="text-[10px] text-[#64748B]">{highPct}% of scans</div>
              </div>

              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded-lg">
                <div className="flex items-center gap-1.5 text-yellow-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span>Medium</span>
                </div>
                <div className="font-mono text-sm font-bold text-[#F8FAFC] mt-1">{mediumExposures}</div>
                <div className="text-[10px] text-[#64748B]">{medPct}% of scans</div>
              </div>

              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded-lg">
                <div className="flex items-center gap-1.5 text-[#22C55E] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span>Low</span>
                </div>
                <div className="font-mono text-sm font-bold text-[#F8FAFC] mt-1">{lowExposures}</div>
                <div className="text-[10px] text-[#64748B]">{lowPct}% of scans</div>
              </div>

              <div className="p-2.5 bg-[#080D18] border border-[#263449] rounded-lg">
                <div className="flex items-center gap-1.5 text-[#00D4FF] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                  <span>Clean</span>
                </div>
                <div className="font-mono text-sm font-bold text-[#F8FAFC] mt-1">{cleanScans}</div>
                <div className="text-[10px] text-[#64748B]">{cleanPct}% of scans</div>
              </div>
            </div>
          </div>

          {/* Account Subscription Widget (1 col) */}
          <div className="p-6 bg-[#172235] border border-[#00D4FF]/30 rounded-xl flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00D4FF]">
                  Account Subscription
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40">
                  Active
                </span>
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Individual Pro Ready</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Enjoy continuous asset surveillance, AI threat briefing, and Deep Forensic reports.
              </p>

              <div className="pt-2 border-t border-[#263449] text-xs space-y-1.5 text-[#CBD5E1]">
                <div className="flex justify-between">
                  <span>Monitored Assets Limit:</span>
                  <span className="font-mono font-bold text-[#F8FAFC]">{watchlists.length} / 5</span>
                </div>
                <div className="flex justify-between">
                  <span>Automated Surveillance:</span>
                  <span className="text-[#22C55E] font-medium">Enabled</span>
                </div>
              </div>
            </div>

            <Link
              to="/dashboard/payments?action=order"
              className="w-full py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded text-center transition-colors block"
            >
              Order Deep Forensic Report
            </Link>
          </div>
        </div>

        {/* Bottom Two-Column Split: Recent Scans + Latest Discovered Findings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Scans (2 cols) */}
          <div className="lg:col-span-2 p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                Recent Threat Scans
              </h2>
              <Link to="/dashboard/scans" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1">
                <span>View All Scans</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">Loading recent scans...</div>
            ) : scans.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-[#263449] rounded-lg">
                <Search className="w-6 h-6 text-[#64748B] mx-auto" />
                <div className="text-xs text-[#94A3B8]">No scans executed yet in your account.</div>
                <Link
                  to="/dashboard/scan"
                  className="inline-block mt-2 px-3 py-1.5 text-xs font-semibold text-[#080D18] bg-[#00D4FF] rounded"
                >
                  Run First Scan
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#263449]/50">
                {scans.slice(0, 5).map(s => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/scan/${s.id}`)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-[#172235]/40 px-2 rounded transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-bold text-[#F8FAFC]">{s.targetValue}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {s.targetType.toUpperCase()} · {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-xs font-mono font-bold text-[#00D4FF]">{s.breachCount} breaches</div>
                        <div
                          className={`text-[10px] font-semibold ${
                            s.severity === 'Critical'
                              ? 'text-[#EF4444]'
                              : s.severity === 'High'
                              ? 'text-[#F59E0B]'
                              : s.severity === 'Medium'
                              ? 'text-yellow-400'
                              : 'text-[#22C55E]'
                          }`}
                        >
                          {s.severity} ({s.riskScore}/100)
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#64748B]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Discovered Findings Feed (1 col) */}
          <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                Latest Findings Feed
              </h2>
              <Link to="/dashboard/findings" className="text-xs text-[#00D4FF] hover:underline">
                Catalog
              </Link>
            </div>

            {latestFindings.length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-[#263449] rounded-lg">
                <CheckCircle className="w-6 h-6 text-[#22C55E] mx-auto" />
                <div className="text-xs text-[#94A3B8]">No exposure findings recorded.</div>
                <p className="text-[10px] text-[#64748B]">Scans with confirmed breaches will stream here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {latestFindings.slice(0, 4).map(f => (
                  <div key={f.id} className="p-3 bg-[#080D18] border border-[#263449] rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#00D4FF]">
                      <span>{f.title}</span>
                      <span className="text-[10px] font-mono text-[#94A3B8]">{f.breachDate}</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] line-clamp-2">{f.description}</div>
                    <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-1">
                      <span>Target: {f.targetValue}</span>
                      <span className="font-mono text-[#22C55E]">{f.pwnCount.toLocaleString()} accts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
