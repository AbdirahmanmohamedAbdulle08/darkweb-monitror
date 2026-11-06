import { jsPDF } from 'jspdf';
import type { Scan, ScanFinding } from '../types/index.ts';

export function generatePDFReport(scan: Scan, findings: ScanFinding[] = []): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // 1. Header Banner
  doc.setFillColor(8, 13, 24); // #080D18
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Accent Line
  doc.setFillColor(0, 212, 255); // #00D4FF Cyan
  doc.rect(0, 39, pageWidth, 1.5, 'F');

  // Brand Titles
  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DARKWATCH INTELLIGENCE', 15, 16);

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('DISCOVER. MONITOR. PROTECT.  |  THREAT INTELLIGENCE DOSSIER', 15, 23);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`Document Reference: ${scan.id.toUpperCase()}`, 15, 30);
  doc.text(`Generated: ${new Date().toUTCString()}`, pageWidth - 15, 30, { align: 'right' });

  currentY = 48;

  // 2. Executive Scan Metadata Card
  doc.setFillColor(17, 24, 39); // #111827
  doc.setDrawColor(38, 52, 73); // #263449
  doc.roundedRect(15, currentY, pageWidth - 30, 32, 2, 2, 'FD');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TARGET ASSET', 20, currentY + 8);
  doc.text('EVALUATED RISK SCORE', 105, currentY + 8);
  doc.text('CONFIRMED BREACHES', 155, currentY + 8);

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(11);
  doc.text(`${scan.targetValue} (${scan.targetType.toUpperCase()})`, 20, currentY + 16);

  // Risk Score & Severity
  const severityColors: Record<string, [number, number, number]> = {
    Critical: [239, 68, 68],
    High: [245, 158, 11],
    Medium: [234, 179, 8],
    Low: [34, 197, 94],
    Informational: [0, 212, 255],
  };
  const [r, g, b] = severityColors[scan.severity] || [148, 163, 184];

  doc.setTextColor(r, g, b);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${scan.riskScore}/100 [${scan.severity.toUpperCase()}]`, 105, currentY + 17);

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(12);
  doc.text(`${scan.breachCount} Incident(s)`, 155, currentY + 17);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`Primary Intelligence Provider: ${scan.provider}`, 20, currentY + 25);
  doc.text(`Assessment Status: ${scan.status.toUpperCase()}`, 105, currentY + 25);

  currentY += 40;

  // 3. AI Executive Threat Briefing
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(248, 250, 252);
  doc.text('EXECUTIVE THREAT INTELLIGENCE BRIEFING', 15, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);

  const briefingText =
    scan.aiSummary ||
    'Target evaluated against verified historical breach feeds. Immediate credential hygiene and multi-factor authentication are advised.';
  const splitBriefing = doc.splitTextToSize(briefingText, pageWidth - 30);
  doc.text(splitBriefing, 15, currentY);
  currentY += splitBriefing.length * 4.5 + 6;

  // 4. Incident Findings Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(248, 250, 252);
  doc.text(`CONFIRMED BREACH DOSSIER (${findings.length} RECORDED)`, 15, currentY);
  currentY += 6;

  if (findings.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No matching compromise records identified in the connected intelligence source.', 15, currentY);
    currentY += 10;
  } else {
    for (const f of findings.slice(0, 6)) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(17, 24, 39);
      doc.setDrawColor(38, 52, 73);
      doc.roundedRect(15, currentY, pageWidth - 30, 20, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 212, 255);
      doc.text(f.title || f.breachName, 20, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Incident Date: ${f.breachDate}  |  Accounts Impacted: ${f.pwnCount.toLocaleString()}`, 20, currentY + 11);

      const exposed = `Compromised: ${f.dataClasses.slice(0, 5).join(', ')}${f.dataClasses.length > 5 ? '...' : ''}`;
      doc.text(exposed, 20, currentY + 16);

      currentY += 24;
    }
  }

  // 5. Remediation Roadmap
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(248, 250, 252);
  doc.text('STRATEGIC REMEDIATION ROADMAP', 15, currentY);
  currentY += 6;

  const steps = scan.aiRemediation || [
    'Rotate master passwords and primary authentication secrets.',
    'Enforce hardware/software Two-Factor Authentication (TOTP).',
    'Review external application permissions and invalidate stale tokens.',
    'Monitor financial and identity statements for unauthorized attempts.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);

  for (let i = 0; i < steps.length; i++) {
    const stepText = `${i + 1}. ${steps[i]}`;
    const splitStep = doc.splitTextToSize(stepText, pageWidth - 32);
    doc.text(splitStep, 17, currentY);
    currentY += splitStep.length * 4.2;
  }

  // 6. Footer & Legal Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Notice: DarkWatch Intelligence queries authenticated public threat intelligence repositories (Have I Been Pwned v3). Plaintext passwords and stolen session tokens are never stored, displayed, or retained. Confidential document intended solely for authorized personnel.',
    15,
    285,
    { maxWidth: pageWidth - 30 }
  );

  doc.save(`DarkWatch_Threat_Report_${scan.targetValue.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

export function downloadCSVFindings(filename: string, findings: ScanFinding[]): void {
  const headers = [
    'Breach Name',
    'Title',
    'Domain',
    'Breach Date',
    'Impacted Accounts',
    'Exposed Data Classes',
    'Verified Incident',
    'Sensitive Incident',
  ];

  const escapeField = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;

  const rows = findings.map(f => [
    escapeField(f.breachName),
    escapeField(f.title),
    escapeField(f.domain),
    escapeField(f.breachDate),
    f.pwnCount.toString(),
    escapeField(f.dataClasses.join('; ')),
    f.isVerified ? 'TRUE' : 'FALSE',
    f.isSensitive ? 'TRUE' : 'FALSE',
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
