import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, History, ArrowRight, Shield, Download, FileSpreadsheet } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import { generatePDFReport, downloadCSVFindings } from '../../utils/reportGenerator.ts';
import type { Scan } from '../../types/index.ts';

export function MyScansPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMyScans()
      .then(res => setScans(res.scans || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = scans.filter(s => {
    const matchesSearch = s.targetValue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || s.severity.toLowerCase() === severityFilter.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">My Scan Records</h1>
            <p className="text-xs text-[#94A3B8]">
              Audit history of verified email and authorized domain exposure evaluations.
            </p>
          </div>

          <Link
            to="/dashboard/scan"
            className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors"
          >
            New Scan
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter by target email or domain..."
              className="w-full bg-[#111827] border border-[#263449] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D4FF]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-[#111827] border border-[#263449] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="informational">Informational</option>
            </select>
          </div>
        </div>

        {/* Scans Table */}
        <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">Loading scans...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8] space-y-2">
              <History className="w-8 h-8 text-[#64748B] mx-auto" />
              <div>No scans match your criteria.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#94A3B8]">
                <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                  <tr>
                    <th className="px-5 py-3">Target Asset</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Risk Score</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Breaches</th>
                    <th className="px-5 py-3">Scan Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/50">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-[#172235]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC]">
                        {s.targetValue}
                      </td>
                      <td className="px-5 py-3.5 uppercase text-[10px]">{s.targetType}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC] tabular-nums">
                        {s.riskScore}/100
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            s.severity === 'Critical'
                              ? 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10'
                              : s.severity === 'High'
                              ? 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10'
                              : s.severity === 'Medium'
                              ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
                              : 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10'
                          }`}
                        >
                          {s.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-[#00D4FF]">
                        {s.breachCount}
                      </td>
                      <td className="px-5 py-3.5 text-[11px]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => generatePDFReport(s, s.findings || [])}
                          title="Download PDF"
                          className="p-1 hover:text-[#00D4FF] text-[#64748B] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/scan/${s.id}`)}
                          className="px-2.5 py-1 bg-[#172235] hover:bg-[#202f47] text-[#00D4FF] border border-[#263449] rounded text-[11px] font-medium transition-colors"
                        >
                          View Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
