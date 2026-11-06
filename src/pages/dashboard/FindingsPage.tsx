import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, CheckCircle, Search, Layers } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import type { ScanFinding } from '../../types/index.ts';

export function FindingsPage() {
  const [findings, setFindings] = useState<ScanFinding[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMyScans()
      .then(res => {
        const allFindings = (res.scans || []).flatMap(s => s.findings || []);
        // Deduplicate findings by breachName
        const seen = new Set<string>();
        const unique: ScanFinding[] = [];
        for (const f of allFindings) {
          if (!seen.has(f.breachName)) {
            seen.add(f.breachName);
            unique.push(f);
          }
        }
        setFindings(unique);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = findings.filter(
    f =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.breachName.toLowerCase().includes(search.toLowerCase()) ||
      f.dataClasses.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Exposure Findings Catalog</h1>
          <p className="text-xs text-[#94A3B8]">
            Consolidated repository of all unique breach incidents identified across your scanned assets.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search breach titles or data categories..."
            className="w-full bg-[#111827] border border-[#263449] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D4FF]"
          />
        </div>

        {/* Findings Grid */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#94A3B8]">Loading exposure findings...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2 bg-[#111827] border border-[#263449] rounded-xl">
            <AlertTriangle className="w-8 h-8 text-[#64748B] mx-auto" />
            <div className="text-sm font-semibold text-[#F8FAFC]">No Findings Cataloged</div>
            <p className="text-xs text-[#94A3B8]">Execute scans on verified assets to identify breach disclosures.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(f => (
              <div
                key={f.id}
                className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-3 hover:border-[#00D4FF]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[#263449]/50 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-[#F8FAFC]">{f.title}</h3>
                    <div className="text-[11px] text-[#94A3B8] font-mono">
                      Breach Date: {f.breachDate} · Domain: {f.domain || 'N/A'}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#00D4FF] font-bold">
                    {f.pwnCount.toLocaleString()} accts
                  </span>
                </div>

                <p className="text-xs text-[#94A3B8] line-clamp-3 leading-relaxed">{f.description}</p>

                <div className="pt-2 border-t border-[#263449]/40 flex flex-wrap gap-1.5">
                  {f.dataClasses.map(c => (
                    <span
                      key={c}
                      className="text-[10px] font-mono bg-[#080D18] text-[#CBD5E1] border border-[#263449] px-2 py-0.5 rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
