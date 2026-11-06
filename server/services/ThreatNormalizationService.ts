import crypto from 'crypto';
import type { ScanFinding } from '../../src/types/index.ts';
import type { RawBreachRecord } from '../providers/ThreatProvider.ts';

export class ThreatNormalizationService {
  /**
   * Normalizes raw external breach objects into standardized DarkWatch findings.
   */
  public normalizeBreaches(rawBreaches: RawBreachRecord[], scanId: string): ScanFinding[] {
    return rawBreaches.map(b => {
      // Strip aggressive HTML tags for clean rendering
      const cleanDesc = (b.Description || '')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        id: 'find_' + crypto.randomUUID(),
        scanId,
        breachName: b.Name || 'Unknown Incident',
        title: b.Title || b.Name || 'Security Incident',
        domain: b.Domain || '',
        breachDate: b.BreachDate || 'Unknown',
        addedDate: b.AddedDate,
        modifiedDate: b.ModifiedDate,
        pwnCount: b.PwnCount || 0,
        description: cleanDesc,
        logoPath: b.LogoPath,
        dataClasses: b.DataClasses || [],
        isVerified: Boolean(b.IsVerified),
        isFabricated: Boolean(b.IsFabricated),
        isSensitive: Boolean(b.IsSensitive),
        isRetired: Boolean(b.IsRetired),
        isSpamList: Boolean(b.IsSpamList),
        isMalware: Boolean(b.IsMalware),
      };
    });
  }

  /**
   * Masks email identifiers for public or unauthenticated scans (e.g. j***n@example.com).
   */
  public maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [user, domain] = parts;
    if (user.length <= 2) {
      return `${user[0]}***@${domain}`;
    }
    const visiblePrefix = user.slice(0, 2);
    const visibleSuffix = user.slice(-1);
    return `${visiblePrefix}***${visibleSuffix}@${domain}`;
  }

  /**
   * Filters findings for a Free Tier report:
   * Masks sensitive identifiers and returns high-level exposure metadata.
   */
  public prepareFreeSummary(findings: ScanFinding[]) {
    return findings.map(f => ({
      id: f.id,
      title: f.title,
      domain: f.domain,
      breachDate: f.breachDate,
      pwnCount: f.pwnCount,
      dataClasses: f.dataClasses.slice(0, 3), // limit sample classes in free tier
      hasMoreClasses: f.dataClasses.length > 3,
      isVerified: f.isVerified,
      isSensitive: f.isSensitive,
    }));
  }
}

export const threatNormalizationService = new ThreatNormalizationService();
