import { db } from '../database/db.ts';
import { threatNormalizationService } from './ThreatNormalizationService.ts';
import type { ReportRecord, Scan, ScanFinding } from '../../src/types/index.ts';

export class ReportService {
  public getUserReports(userId: string): Array<ReportRecord & { scan?: Scan }> {
    const list: Array<ReportRecord & { scan?: Scan }> = [];
    for (const report of db.reports.values()) {
      if (report.userId === userId) {
        const scan = db.scans.get(report.scanId);
        list.push({ ...report, scan });
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReportById(reportId: string, userId?: string, userRole?: string): {
    report?: ReportRecord;
    scan?: Scan;
    findings?: ScanFinding[] | unknown[];
    error?: string;
  } {
    const report = db.reports.get(reportId);
    if (!report) {
      return { error: 'Report not found.' };
    }

    // Role & ownership check
    if (report.userId !== userId && userRole !== 'super_admin') {
      return { error: 'Unauthorized access to private threat report.' };
    }

    const scan = db.scans.get(report.scanId);
    const rawFindings = db.scanFindings.get(report.scanId) || [];

    // Filter findings based on report entitlement
    let findings: ScanFinding[] | unknown[] = rawFindings;
    if (report.reportType === 'free' && !report.isUnlocked) {
      findings = threatNormalizationService.prepareFreeSummary(rawFindings);
    }

    return {
      report,
      scan,
      findings,
    };
  }

  /**
   * Generates formatted CSV string of the authorized findings.
   */
  public generateCSV(findings: ScanFinding[]): string {
    const headers = [
      'Breach Name',
      'Title',
      'Domain',
      'Breach Date',
      'Compromised Accounts Count',
      'Exposed Data Classes',
      'Verified Incident',
      'Sensitive Exposure',
    ];

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    const rows = findings.map(f => [
      escapeCsv(f.breachName),
      escapeCsv(f.title),
      escapeCsv(f.domain),
      escapeCsv(f.breachDate),
      f.pwnCount.toString(),
      escapeCsv(f.dataClasses.join('; ')),
      f.isVerified ? 'TRUE' : 'FALSE',
      f.isSensitive ? 'TRUE' : 'FALSE',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const reportService = new ReportService();
