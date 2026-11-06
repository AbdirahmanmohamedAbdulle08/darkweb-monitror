import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  Mail,
  Globe,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Lock,
  Key,
  FileCode,
  Info,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { Scan, ScanFinding, ScanStatus } from '../types/index.ts';

interface ScannerProps {
  isAuthenticated?: boolean;
  onScanComplete?: (scan: Scan, findings: ScanFinding[]) => void;
}

export function ScannerComponent({ isAuthenticated = false, onScanComplete }: ScannerProps) {
  const navigate = useNavigate();

  // Mode: email or domain
  const [targetType, setTargetType] = useState<'email' | 'domain'>('email');
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verification state
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null);
  const [domainChallenge, setDomainChallenge] = useState<{
    txtRecordName: string;
    txtRecordValue: string;
    httpFilePath: string;
    httpFileContent: string;
    hibpNotice: string;
  } | null>(null);

  // Result state
  const [completedScan, setCompletedScan] = useState<Scan | null>(null);
  const [completedFindings, setCompletedFindings] = useState<ScanFinding[]>([]);

  // Step 1: Request Verification / Initiate Scan
  const handleInitiateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCompletedScan(null);

    const clean = target.trim();
    if (!clean) {
      setErrorMessage('Please provide an email address or domain.');
      return;
    }

    setStatus('validating');

    if (targetType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clean)) {
        setStatus('idle');
        setErrorMessage('Please enter a valid email address (e.g. user@domain.com).');
        return;
      }

      try {
        setStatus('awaiting_verification');
        const res = await api.requestEmailVerification(clean);
        setVerificationId(res.verificationId);
        if (res.previewCode) {
          setVerificationPreview(res.previewCode);
        }
      } catch (err: unknown) {
        setStatus('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize email verification.');
      }
    } else {
      // Domain validation
      try {
        setStatus('awaiting_verification');
        const res = await api.requestDomainVerification(clean);
        setVerificationId(res.verificationId);
        setDomainChallenge({
          txtRecordName: res.txtRecordName,
          txtRecordValue: res.txtRecordValue,
          httpFilePath: res.httpFilePath,
          httpFileContent: res.httpFileContent,
          hibpNotice: res.hibpNotice,
        });
      } catch (err: unknown) {
        setStatus('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Invalid domain syntax.');
      }
    }
  };

  // Step 2: Confirm Email Verification and Execute Scan
  const handleConfirmEmailVerification = async () => {
    if (!verificationId || !verificationCode) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setStatus('validating');

    try {
      const confirmRes = await api.confirmEmailVerification(verificationId, verificationCode);
      if (!confirmRes.success) {
        setStatus('awaiting_verification');
        setErrorMessage(confirmRes.message);
        return;
      }

      // Execute Scan
      setStatus('scanning');
      const scanRes = isAuthenticated
        ? await api.executeAuthenticatedScan(target.trim(), 'email')
        : await api.executePublicScan(target.trim(), 'email', verificationId);

      setStatus(scanRes.scan.status);
      setCompletedScan(scanRes.scan);
      setCompletedFindings(scanRes.findings || []);
      if (onScanComplete) {
        onScanComplete(scanRes.scan, scanRes.findings || []);
      }
    } catch (err: unknown) {
      setStatus('failed');
      setErrorMessage(err instanceof Error ? err.message : 'Threat scan failed.');
    }
  };

  // Step 2 (Domain): Confirm Domain Verification and Execute Scan
  const handleConfirmDomainVerification = async (method: 'dns_txt' | 'html_file') => {
    if (!verificationId) return;

    setErrorMessage(null);
    setStatus('validating');

    try {
      const confirmRes = await api.confirmDomainVerification(verificationId, method);
      if (!confirmRes.success) {
        setStatus('awaiting_verification');
        setErrorMessage(confirmRes.message);
        return;
      }

      setStatus('scanning');
      const scanRes = isAuthenticated
        ? await api.executeAuthenticatedScan(target.trim(), 'domain')
        : await api.executePublicScan(target.trim(), 'domain', verificationId);

      setStatus(scanRes.scan.status);
      setCompletedScan(scanRes.scan);
      setCompletedFindings(scanRes.findings || []);
      if (onScanComplete) {
        onScanComplete(scanRes.scan, scanRes.findings || []);
      }
    } catch (err: unknown) {
      setStatus('failed');
      setErrorMessage(err instanceof Error ? err.message : 'Domain verification check failed.');
    }
  };

  const resetScanner = () => {
    setStatus('idle');
    setTarget('');
    setVerificationId(null);
    setVerificationCode('');
    setVerificationPreview(null);
    setDomainChallenge(null);
    setCompletedScan(null);
    setCompletedFindings([]);
    setErrorMessage(null);
  };

  return (
    <div className="w-full bg-[#111827] border border-[#263449] rounded-xl p-6 md:p-8">
      {/* Scanner Mode Selector: Functional Segmented Buttons */}
      <div className="flex items-center justify-between gap-4 border-b border-[#263449] pb-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-[#080D18] rounded-lg border border-[#263449]">
          <button
            type="button"
            onClick={() => {
              if (status !== 'scanning') {
                setTargetType('email');
                resetScanner();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              targetType === 'email'
                ? 'bg-[#172235] text-[#00D4FF] border border-[#263449]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Personal Email Scan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (status !== 'scanning') {
                setTargetType('domain');
                resetScanner();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              targetType === 'domain'
                ? 'bg-[#172235] text-[#00D4FF] border border-[#263449]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Authorized Domain Scan</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <Lock className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Strict Ownership Authorization</span>
        </div>
      </div>

      {/* Main Input Form (Idle / Validating) */}
      {(status === 'idle' || status === 'validating' || status === 'failed') && (
        <form onSubmit={handleInitiateScan} className="space-y-4">
          <div className="relative">
            <input
              type={targetType === 'email' ? 'email' : 'text'}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder={targetType === 'email' ? 'Enter personal email address (e.g. name@domain.com)' : 'Enter authorized domain (e.g. enterprise.com)'}
              disabled={status === 'validating'}
              className="w-full bg-[#080D18] border border-[#263449] rounded-lg px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-all"
            />
            <button
              type="submit"
              disabled={status === 'validating'}
              className="mt-3 md:mt-0 md:absolute md:right-2 md:top-2 md:bottom-2 px-6 py-2.5 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {status === 'validating' ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Scan Target</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-[#94A3B8] gap-2 pt-1">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#00D4FF]" />
              {targetType === 'email'
                ? 'Ownership verification required via one-time code to prevent arbitrary querying.'
                : 'Domain queries require DNS TXT or HTTP challenge validation to prevent unauthorized scanning.'}
            </span>
            <span>Feed: Have I Been Pwned API v3</span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      )}

      {/* Step 2A: Email Verification Modal/Panel */}
      {status === 'awaiting_verification' && targetType === 'email' && (
        <div className="space-y-4 p-5 bg-[#080D18] border border-[#263449] rounded-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <Key className="w-4 h-4 text-[#00D4FF]" />
            <span>Verify Ownership of {target}</span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            To ensure zero unauthorized surveillance, enter the 6-digit verification code issued for this address.
          </p>

          {verificationPreview && (
            <div className="p-2.5 bg-[#172235] border border-[#00D4FF]/30 rounded text-xs text-[#00D4FF] flex items-center justify-between">
              <span>Sandbox verification code:</span>
              <span className="font-mono font-bold tracking-wider">{verificationPreview}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              className="flex-1 bg-[#111827] border border-[#263449] rounded px-3 py-2 text-sm font-mono tracking-widest text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
            />
            <button
              onClick={handleConfirmEmailVerification}
              className="px-5 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors"
            >
              Verify & Run Scan
            </button>
            <button
              onClick={resetScanner}
              className="px-3 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              Cancel
            </button>
          </div>

          {errorMessage && (
            <div className="text-xs text-[#EF4444] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2B: Domain Verification Challenge Modal/Panel */}
      {status === 'awaiting_verification' && targetType === 'domain' && domainChallenge && (
        <div className="space-y-4 p-5 bg-[#080D18] border border-[#263449] rounded-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <Globe className="w-4 h-4 text-[#00D4FF]" />
            <span>Domain Authorization Challenge for {target}</span>
          </div>

          <div className="space-y-3 text-xs text-[#94A3B8]">
            <div className="p-3 bg-[#111827] rounded border border-[#263449] space-y-1.5">
              <div className="font-semibold text-[#F8FAFC]">Method 1: DNS TXT Record (Recommended)</div>
              <div>Host/Name: <span className="font-mono text-[#00D4FF]">{domainChallenge.txtRecordName}</span></div>
              <div>Value: <span className="font-mono text-[#00D4FF]">{domainChallenge.txtRecordValue}</span></div>
            </div>

            <div className="p-3 bg-[#111827] rounded border border-[#263449] space-y-1.5">
              <div className="font-semibold text-[#F8FAFC]">Method 2: HTTP Well-Known File</div>
              <div>Path: <span className="font-mono text-[#00D4FF]">{domainChallenge.httpFilePath}</span></div>
              <div>Content: <span className="font-mono text-[#00D4FF]">{domainChallenge.httpFileContent}</span></div>
            </div>

            <div className="p-3 bg-[#172235] rounded border border-[#7C3AED]/40 text-[#94A3B8] text-[11px] leading-relaxed">
              <div className="font-semibold text-[#F8FAFC] mb-1">Provider Coverage Notice:</div>
              {domainChallenge.hibpNotice}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleConfirmDomainVerification('dns_txt')}
              className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors"
            >
              Verify DNS TXT & Scan
            </button>
            <button
              onClick={() => handleConfirmDomainVerification('html_file')}
              className="px-4 py-2 bg-[#172235] hover:bg-[#202f47] text-[#F8FAFC] border border-[#263449] font-medium text-xs rounded transition-colors"
            >
              Verify HTTP File & Scan
            </button>
            <button
              onClick={resetScanner}
              className="px-3 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              Cancel
            </button>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Scanning in Progress */}
      {status === 'scanning' && (
        <div className="p-8 text-center space-y-3">
          <Clock className="w-8 h-8 text-[#00D4FF] animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-[#F8FAFC]">Querying Threat Intelligence Feeds</h4>
          <p className="text-xs text-[#94A3B8]">
            Validating target against Have I Been Pwned v3 API and compiling risk telemetry...
          </p>
        </div>
      )}

      {/* Step 4: Scan Completed or Clean (Real findings display) */}
      {(status === 'completed' || status === 'no_findings') && completedScan && (
        <div className="space-y-6 pt-2">
          {/* Summary Strip */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-[#080D18] border border-[#263449] rounded-lg">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">Exposure Summary for:</div>
              <div className="text-sm font-mono font-bold text-[#F8FAFC]">{completedScan.targetValue}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Provider: {completedScan.provider} · Scanned: {new Date(completedScan.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] uppercase font-semibold text-[#94A3B8]">Risk Score</div>
                <div
                  className={`text-lg font-mono font-bold ${
                    completedScan.severity === 'Critical'
                      ? 'text-[#EF4444]'
                      : completedScan.severity === 'High'
                      ? 'text-[#F59E0B]'
                      : completedScan.severity === 'Medium'
                      ? 'text-yellow-400'
                      : 'text-[#22C55E]'
                  }`}
                >
                  {completedScan.riskScore}/100
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-semibold text-[#94A3B8]">Incidents</div>
                <div className="text-lg font-mono font-bold text-[#F8FAFC]">{completedScan.breachCount}</div>
              </div>

              <button
                onClick={() => navigate(`/scan/${completedScan.id}`)}
                className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>View Full Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Clean / No Findings State */}
          {status === 'no_findings' && (
            <div className="p-6 bg-[#080D18] border border-[#22C55E]/30 rounded-lg text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-[#22C55E] mx-auto" />
              <h4 className="text-sm font-semibold text-[#F8FAFC]">No Breach Records Found</h4>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                No matching breach records were found in the connected intelligence source for this target.
              </p>
            </div>
          )}

          {/* Sample Breaches Preview (Free/Public preview) */}
          {status === 'completed' && completedFindings.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider">
                Confirmed Incident Feeds ({completedFindings.length} Records)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedFindings.slice(0, 4).map(f => (
                  <div
                    key={f.id}
                    className="p-3.5 bg-[#080D18] border border-[#263449] rounded-lg space-y-1.5 hover:border-[#00D4FF]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#00D4FF]">
                      <span>{f.title}</span>
                      <span className="text-[10px] font-mono text-[#94A3B8]">{f.breachDate}</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] line-clamp-2">{f.description}</div>
                    <div className="text-[10px] text-[#64748B] flex items-center gap-1 pt-1">
                      <span>Exposed:</span>
                      <span className="text-[#94A3B8] truncate">{f.dataClasses.slice(0, 3).join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {completedFindings.length > 4 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-[#94A3B8]">
                    + {completedFindings.length - 4} additional documented incidents in full dossier
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Scan Again */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={resetScanner}
              className="text-xs text-[#94A3B8] hover:text-[#00D4FF] transition-colors"
            >
              Perform another scan &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
