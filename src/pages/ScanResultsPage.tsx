import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Shield,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { PublicLayout } from '../layouts/PublicLayout.tsx';
import { generatePDFReport, downloadCSVFindings } from '../utils/reportGenerator.ts';
import type { Scan, ScanFinding } from '../types/index.ts';

export function ScanResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<ScanFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getScanById(id)
      .then(res => {
        setScan(res.scan);
        setFindings(res.findings || []);
      })
      .catch(err => {
        setError(err.message || 'Failed to retrieve scan dossier.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center space-y-4">
          <Clock className="w-8 h-8 text-[#00D4FF] animate-spin mx-auto" />
          <h2 className="text-base font-semibold text-[#F8FAFC]">Retrieving Threat Intelligence Dossier...</h2>
          <p className="text-xs text-[#94A3B8]">Loading cryptographic validation records and breach telemetry...</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !scan) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-[#EF4444] mx-auto" />
          <h2 className="text-lg font-bold text-[#F8FAFC]">Dossier Access Error</h2>
          <p className="text-xs text-[#94A3B8]">{error || 'The requested scan record does not exist or access is restricted.'}</p>
          <div className="pt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#172235] text-xs font-semibold text-[#F8FAFC] rounded border border-[#263449] hover:bg-[#202f47]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Scanner</span>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const severityColor =
    scan.severity === 'Critical'
      ? 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10'
      : scan.severity === 'High'
      ? 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10'
      : scan.severity === 'Medium'
      ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
      : 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10';

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Back Link & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#263449] pb-6">
          <div className="space-y-1.5">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#00D4FF]">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Live Scanner</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Threat Intelligence Dossier
            </h1>
            <div className="text-xs text-[#94A3B8] flex items-center gap-2">
              <span className="font-mono text-[#00D4FF]">{scan.id}</span>
              <span>·</span>
              <span>Provider: {scan.provider}</span>
              <span>·</span>
              <span>Date: {new Date(scan.createdAt).toUTCString()}</span>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => generatePDFReport(scan, findings)}
              className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => downloadCSVFindings(`DarkWatch_${scan.targetValue}`, findings)}
              className="px-4 py-2 bg-[#172235] hover:bg-[#202f47] text-[#F8FAFC] border border-[#263449] font-medium text-xs rounded transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-[#111827] border border-[#263449] rounded-xl">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Target Entity</div>
            <div className="text-sm font-mono font-bold text-[#F8FAFC] truncate">{scan.targetValue}</div>
            <div className="text-[10px] text-[#64748B] uppercase">{scan.targetType} Asset</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Calculated Risk Index</div>
            <div className="text-2xl font-mono font-bold text-[#F8FAFC]">{scan.riskScore}/100</div>
            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${severityColor}`}>
              {scan.severity} Severity
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Confirmed Breaches</div>
            <div className="text-2xl font-mono font-bold text-[#F8FAFC]">{scan.breachCount}</div>
            <div className="text-[10px] text-[#64748B]">Documented In Feed</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase">Dossier Status</div>
            <div className="text-sm font-semibold text-[#22C55E] flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>Verified Scan</span>
            </div>
            <div className="text-[10px] text-[#64748B]">Have I Been Pwned v3 Grounded</div>
          </div>
        </div>

        {/* AI Executive Briefing */}
        <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00D4FF]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Threat Intelligence Briefing</span>
          </div>
          <p className="text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-line">
            {scan.aiSummary || 'Target evaluated against authenticated historical breach feeds.'}
          </p>
        </div>

        {/* Incident Findings Table / Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
              Confirmed Incident Exposures ({findings.length})
            </h3>
            <span className="text-xs text-[#94A3B8]">Ordered by chronological recency</span>
          </div>

          {findings.length === 0 ? (
            <div className="p-8 bg-[#111827] border border-[#263449] rounded-xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-[#22C55E] mx-auto" />
              <div className="text-sm font-semibold text-[#F8FAFC]">Zero Incident Matches</div>
              <p className="text-xs text-[#94A3B8]">
                No matching breach records were found in the connected threat intelligence source.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map(f => (
                <div
                  key={f.id}
                  className="p-5 bg-[#111827] border border-[#263449] rounded-xl space-y-3 hover:border-[#00D4FF]/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#263449]/50 pb-3">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                        <span>{f.title || f.breachName}</span>
                        {f.isVerified && (
                          <span className="text-[10px] text-[#22C55E] font-normal flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Verified Incident</span>
                          </span>
                        )}
                        {f.isSensitive && (
                          <span className="text-[10px] text-[#EF4444] font-normal border border-[#EF4444]/30 bg-[#EF4444]/10 px-1.5 py-0.2 rounded">
                            Sensitive Breach
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#94A3B8] font-mono">
                        Incident Date: {f.breachDate} · Root Domain: {f.domain || 'N/A'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-[#64748B] uppercase">Accounts Compromised</div>
                      <div className="text-xs font-mono font-bold text-[#00D4FF]">
                        {f.pwnCount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-relaxed">{f.description}</p>

                  <div className="pt-2 border-t border-[#263449]/40 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-[#64748B] font-semibold uppercase">Exposed Attributes:</span>
                    {f.dataClasses.map(cls => (
                      <span
                        key={cls}
                        className="text-[11px] font-mono bg-[#080D18] text-[#CBD5E1] border border-[#263449] px-2 py-0.5 rounded"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strategic Remediation Roadmap */}
        {scan.aiRemediation && scan.aiRemediation.length > 0 && (
          <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#22C55E]">
              <Shield className="w-3.5 h-3.5" />
              <span>Strategic Remediation Blueprint</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#CBD5E1]">
              {scan.aiRemediation.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-[#00D4FF] font-bold shrink-0">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rule-Based Scoring Factor Breakdown */}
        {scan.scoringFactors && scan.scoringFactors.length > 0 && (
          <div className="p-6 bg-[#0D1525] border border-[#263449] rounded-xl space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Risk Score Evaluation Factors
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {scan.scoringFactors.map((factor, idx) => (
                <div key={idx} className="p-3 bg-[#111827] border border-[#263449] rounded-lg space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[#F8FAFC]">
                    <span>{factor.factor}</span>
                    <span className="font-mono text-[#00D4FF]">+{factor.weight} pts</span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
