import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, FileSpreadsheet, Lock, CheckCircle, Shield, ShoppingCart } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import { generatePDFReport, downloadCSVFindings } from '../../utils/reportGenerator.ts';
import type { ReportRecord, Scan } from '../../types/index.ts';

export function ReportsPage() {
  const [reports, setReports] = useState<Array<ReportRecord & { scan?: Scan }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMyReports()
      .then(res => setReports(res.reports || []))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = async (report: ReportRecord & { scan?: Scan }) => {
    if (!report.scan) return;
    const fullScan = await api.getScanById(report.scanId);
    generatePDFReport(fullScan.scan, fullScan.findings || []);
  };

  const handleDownloadCSV = async (report: ReportRecord & { scan?: Scan }) => {
    if (!report.scan) return;
    const fullScan = await api.getScanById(report.scanId);
    downloadCSVFindings(`DarkWatch_Report_${report.scan.targetValue}`, fullScan.findings || []);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Threat Intelligence Reports</h1>
            <p className="text-xs text-[#94A3B8]">
              Archive of verified forensic threat intelligence dossiers and structured CSV data exports.
            </p>
          </div>

          <Link
            to="/dashboard/payments?action=order"
            className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Order Deep Forensic Report</span>
          </Link>
        </div>

        {/* Reports Archive */}
        <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">Loading reports archive...</div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-[#64748B] mx-auto" />
              <div className="text-sm font-semibold text-[#F8FAFC]">No Generated Reports Yet</div>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                Completed scans automatically generate verified reports. You can also order Deep Forensic Reports for full unmasked attribution.
              </p>
              <Link
                to="/dashboard/scan"
                className="inline-block mt-2 px-3.5 py-1.5 bg-[#172235] hover:bg-[#202f47] border border-[#263449] text-[#00D4FF] rounded text-xs font-semibold"
              >
                Scan an Asset First
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#263449]/50">
              {reports.map(r => (
                <div
                  key={r.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#172235]/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#F8FAFC]">{r.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          r.reportType === 'premium'
                            ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/30'
                            : 'bg-[#172235] text-[#94A3B8] border border-[#263449]'
                        }`}
                      >
                        {r.reportType === 'premium' ? 'Deep Forensic Dossier' : 'Exposure Summary'}
                      </span>
                    </div>
                    <div className="text-xs text-[#94A3B8] font-mono">
                      Target: {r.scan?.targetValue || 'Scan Asset'} · Generated: {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleDownloadPDF(r)}
                      className="px-3.5 py-1.5 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCSV(r)}
                      className="px-3.5 py-1.5 bg-[#172235] hover:bg-[#202f47] text-[#F8FAFC] border border-[#263449] font-medium text-xs rounded transition-colors flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#00D4FF]" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
