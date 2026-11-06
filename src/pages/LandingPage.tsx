import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Search,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Key,
  Globe,
  Zap,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout.tsx';
import { ScannerComponent } from '../components/ScannerComponent.tsx';
import { api } from '../services/api.ts';

export function LandingPage() {
  const navigate = useNavigate();

  // Password checker tool state
  const [testPassword, setTestPassword] = useState('');
  const [passChecking, setPassChecking] = useState(false);
  const [passResult, setPassResult] = useState<{ isCompromised: boolean; seenCount: number } | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPassword) return;
    setPassChecking(true);
    setPassResult(null);

    try {
      const res = await api.checkPasswordPwned(testPassword);
      setPassResult(res);
    } catch {
      // Failed
    } finally {
      setPassChecking(false);
    }
  };

  const faqs = [
    {
      q: 'Does DarkWatch Intelligence store or view plaintext passwords?',
      a: 'Never. DarkWatch strictly adheres to zero-knowledge cryptographic principles. We never capture, index, or store plaintext passwords, session cookies, or private tokens. Password checks utilize the k-Anonymity mathematical model where only a 5-character SHA-1 hash prefix is queried.',
    },
    {
      q: 'Why is ownership verification required prior to scanning?',
      a: 'To prevent malicious actors from performing unauthorized reconnaissance against third-party personal identities or private corporate domains, DarkWatch enforces email code confirmation and DNS TXT / HTTP challenge verification before querying external feeds.',
    },
    {
      q: 'Which threat intelligence sources are queried?',
      a: 'Our primary external threat feed is the official Have I Been Pwned (HIBP) API v3 and the Pwned Passwords cryptographic repository, aggregating over 14 billion documented compromised account records across historical commercial breaches.',
    },
    {
      q: 'What payment methods are supported for Deep Forensic Reports?',
      a: 'DarkWatch supports both regional mobile money (EVC Plus, Waafi) and international credit/debit card processing. Payment adapters verify transaction status server-side via cryptographic webhooks before unlocking report records.',
    },
    {
      q: 'Can I monitor multiple emails and corporate domains continuously?',
      a: 'Yes. With an Individual Pro account, verified assets are added to continuous surveillance watchlists with instant notification alerts whenever newly indexed breach dumps emerge.',
    },
  ];

  return (
    <PublicLayout>
      {/* 1. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-[#263449] text-xs text-[#00D4FF]">
              <Shield className="w-3.5 h-3.5" />
              <span>Real-Data Threat Intelligence & Breach Monitoring</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.1] text-balance">
              Discover Your Digital Exposure Before Attackers Do.
            </h1>

            <p className="text-base md:text-lg text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              Monitor your digital exposure, discover known data breaches, and understand security risks with actionable threat intelligence.
            </p>
          </div>

          {/* Interactive Exposure Scanner Anchor */}
          <div id="scanner" className="max-w-3xl mx-auto">
            <ScannerComponent />
          </div>

          {/* Trust & Transparency Markers */}
          <div className="max-w-3xl mx-auto mt-8 flex flex-wrap items-center justify-between text-xs text-[#64748B] gap-4 px-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>Zero Plaintext Storage</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>Have I Been Pwned v3 Grounded</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>Transparent Rule-Based Risk Engine</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Platform Capabilities */}
      <section id="capabilities" className="py-20 border-t border-[#263449] bg-[#0D1525]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#00D4FF] mb-2">
              Platform Architecture
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
              Enterprise Threat Intelligence Engineered for Individuals
            </h2>
            <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
              DarkWatch consolidates verified historical compromise corpuses, rule-based exposure classification, and AI-assisted mitigation blueprints into a unified surveillance console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center text-[#00D4FF]">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F8FAFC]">
                Historical Breach Catalogue
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Direct integration with Have I Been Pwned v3 indexes over 800 confirmed breaches and 14 billion accounts without fabricating synthetic records.
              </p>
            </div>

            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F8FAFC]">
                Transparent Risk Scoring
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Multi-factor risk evaluation analyzes breach recency, sensitive data classes (PII, credentials, financial records), and verified verification status.
              </p>
            </div>

            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F8FAFC]">
                AI Remediation Blueprint
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Powered by Google Gemini 3.8 Flash to transform complex raw data attributes into prioritized, executive-ready mitigation roadmaps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive k-Anonymity Password Tester */}
      <section className="py-20 border-t border-[#263449] bg-[#080D18]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-8 bg-[#111827] border border-[#263449] rounded-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-[#00D4FF] font-semibold uppercase tracking-wider mb-1">
                  <Key className="w-3.5 h-3.5" />
                  <span>Interactive Cryptographic Tool</span>
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">
                  Pwned Passwords SHA-1 k-Anonymity Check
                </h3>
              </div>
              <span className="text-xs text-[#94A3B8] bg-[#080D18] px-3 py-1 rounded border border-[#263449]">
                Zero-Knowledge Query
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Test whether a passphrase has been exposed in public breach corpuses. Only the first 5 characters of your SHA-1 hash are transmitted; your actual password never leaves your browser unhashed.
            </p>

            <form onSubmit={handleCheckPassword} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={testPassword}
                  onChange={e => setTestPassword(e.target.value)}
                  placeholder="Enter sample passphrase to check k-anonymity index..."
                  className="w-full bg-[#080D18] border border-[#263449] rounded-lg px-4 py-3 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D4FF]"
                />
                <button
                  type="submit"
                  disabled={passChecking || !testPassword}
                  className="mt-2 md:mt-0 md:absolute md:right-2 md:top-2 md:bottom-2 px-4 py-1.5 bg-[#172235] hover:bg-[#202f47] text-[#00D4FF] border border-[#00D4FF]/30 font-semibold text-xs rounded transition-colors disabled:opacity-50"
                >
                  {passChecking ? 'Querying Prefix...' : 'Check Range'}
                </button>
              </div>

              {passResult && (
                <div
                  className={`p-4 rounded-lg border text-xs flex items-center justify-between ${
                    passResult.isCompromised
                      ? 'bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]'
                      : 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {passResult.isCompromised ? (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {passResult.isCompromised
                        ? `Compromised: Passphrase seen ${passResult.seenCount.toLocaleString()} times in documented breaches. Do not use!`
                        : 'Clean: This exact passphrase has zero occurrences in the connected Pwned Passwords corpus.'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#94A3B8]">k-Anonymity Verified</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 4. How It Works (Editorial Numbering) */}
      <section id="how-it-works" className="py-20 border-t border-[#263449] bg-[#0D1525]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#00D4FF] mb-2">
              Workflow Pipeline
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
              How Threat Intelligence is Executed
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="text-xs font-mono font-bold text-[#00D4FF]">01. Ownership Validation</div>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Strict Authorization</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                One-time email verification codes or DNS TXT challenges guarantee that only authorized owners can scan an asset.
              </p>
            </div>

            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="text-xs font-mono font-bold text-[#00D4FF]">02. Source Interrogation</div>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">HIBP v3 Querying</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                The server securely contacts Have I Been Pwned endpoints using commercial credentials, preserving user privacy.
              </p>
            </div>

            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="text-xs font-mono font-bold text-[#00D4FF]">03. Risk Normalization</div>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Rule-Based Scoring</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Incident count, data classes, and breach recency are synthesized into an auditable 0-100 risk score and severity level.
              </p>
            </div>

            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="text-xs font-mono font-bold text-[#00D4FF]">04. Strategic Remediation</div>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Actionable Defense</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Google Gemini generates concrete, prioritized remediation tasks and exports verifiable PDF/CSV dossiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Supported Intelligence Sources */}
      <section id="sources" className="py-20 border-t border-[#263449] bg-[#080D18]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#00D4FF] mb-2">
              Data Feeds & Transparency
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
              Verified Threat Intelligence Sources
            </h2>
            <p className="text-sm text-[#94A3B8] mt-2">
              Clear attribution and scope limitations: DarkWatch queries structured repositories and does not claim to index the entire Dark Web.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F8FAFC]">Have I Been Pwned API v3</span>
                <span className="text-xs font-mono text-[#00D4FF]">Commercial Feed</span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Industry-standard breach index maintained by Troy Hunt. Covers historical, documented, and verified breach incidents including Adobe, LinkedIn, Canva, and hundreds more.
              </p>
              <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#263449]">
                Scope: Publicly documented commercial breaches · Requires active HIBP API key
              </div>
            </div>

            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F8FAFC]">Pwned Passwords Range API</span>
                <span className="text-xs font-mono text-[#22C55E]">k-Anonymity Model</span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Over 900 million compromised SHA-1 password hashes queryable without exposing private passphrases over the wire.
              </p>
              <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#263449]">
                Scope: Hash prefix lookups · Zero plaintext credential transmission
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Plans */}
      <section id="pricing" className="py-20 border-t border-[#263449] bg-[#0D1525]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#00D4FF]">
              Pricing & Entitlements
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
              Transparent Threat Intelligence Access
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Free preliminary exposure summaries, pay-per-report deep dossiers, and continuous surveillance tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#94A3B8]">Free Tier</div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">Exposure Summary</h3>
                <div className="text-2xl font-bold font-mono text-[#F8FAFC]">$0</div>
                <p className="text-xs text-[#94A3B8]">
                  Basic scan with masked identifiers and general risk classification.
                </p>
                <ul className="space-y-2 text-xs text-[#94A3B8] pt-2 border-t border-[#263449]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Masked breach identifiers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Overall risk score calculation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Basic remediation roadmap</span>
                  </li>
                </ul>
              </div>
              <a
                href="#scanner"
                className="w-full py-2.5 text-center text-xs font-semibold text-[#F8FAFC] bg-[#172235] hover:bg-[#202f47] border border-[#263449] rounded-lg transition-colors block"
              >
                Run Free Scan
              </a>
            </div>

            {/* Pay-Per-Report Tier (Featured) */}
            <div className="p-6 bg-[#172235] border border-[#00D4FF]/40 rounded-xl flex flex-col justify-between space-y-6 relative shadow-lg shadow-[#00D4FF]/5">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#00D4FF]">Pay-Per-Report</div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">Single Deep Report</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono text-[#F8FAFC]">$9.99</span>
                  <span className="text-xs text-[#94A3B8]">/ report</span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Full forensic disclosure with AI briefing and downloadable branded PDF dossier.
                </p>
                <ul className="space-y-2 text-xs text-[#F8FAFC] pt-2 border-t border-[#263449]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Unmasked breach metadata & sources</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Detailed timeline & data categories</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>AI executive remediation briefing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Downloadable DarkWatch PDF & CSV</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/auth?mode=register"
                className="w-full py-2.5 text-center text-xs font-semibold text-[#080D18] bg-[#00D4FF] hover:bg-[#00b8de] rounded-lg transition-colors block"
              >
                Order Single Report
              </Link>
            </div>

            {/* Pro Subscription */}
            <div className="p-6 bg-[#111827] border border-[#263449] rounded-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#7C3AED]">Continuous Surveillance</div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">Individual Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono text-[#F8FAFC]">$19.99</span>
                  <span className="text-xs text-[#94A3B8]">/ month</span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Automated background surveillance across multiple verified emails and domains.
                </p>
                <ul className="space-y-2 text-xs text-[#94A3B8] pt-2 border-t border-[#263449]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Up to 5 verified watchlist assets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Continuous automated breach alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Unlimited PDF & CSV report exports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Priority risk classification</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/auth?mode=register"
                className="w-full py-2.5 text-center text-xs font-semibold text-[#F8FAFC] bg-[#172235] hover:bg-[#202f47] border border-[#263449] rounded-lg transition-colors block"
              >
                Subscribe to Pro
              </Link>
            </div>
          </div>

          <div className="text-center text-xs text-[#64748B] mt-8">
            Supported payment methods: EVC Plus · Waafi Mobile Money · International Visa / Mastercard
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="py-20 border-t border-[#263449] bg-[#080D18]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#00D4FF] mb-2">
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
              Security, Verification, and Operations
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#263449] bg-[#111827] rounded-lg overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-[#F8FAFC] hover:text-[#00D4FF] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-[#94A3B8] leading-relaxed border-t border-[#263449]/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
