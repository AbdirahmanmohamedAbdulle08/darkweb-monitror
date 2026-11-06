import crypto from 'crypto';
import { hibpProvider } from '../providers/HIBPProvider.ts';
import type { ProviderQueryResult } from '../providers/ThreatProvider.ts';

export class ThreatIntelligenceService {
  /**
   * Queries configured intelligence sources for email breaches.
   */
  public async queryEmailExposure(email: string): Promise<ProviderQueryResult> {
    return await hibpProvider.searchEmailBreaches(email);
  }

  /**
   * Queries configured intelligence sources for domain breaches.
   */
  public async queryDomainExposure(domain: string): Promise<ProviderQueryResult> {
    return await hibpProvider.searchDomainBreaches(domain);
  }

  /**
   * Cryptographically verifies if a password appears in compromised breach corpuses
   * using SHA-1 k-Anonymity (never sends the plain password or the full hash to external servers).
   */
  public async checkPasswordPwned(password: string): Promise<{ isCompromised: boolean; seenCount: number }> {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const matches = await hibpProvider.checkPasswordHashPrefix(prefix);
    for (const line of matches) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix && hashSuffix.toUpperCase() === suffix) {
        const count = parseInt(countStr, 10);
        return { isCompromised: true, seenCount: isNaN(count) ? 1 : count };
      }
    }

    return { isCompromised: false, seenCount: 0 };
  }

  public getProviderStatus() {
    return {
      hibp: {
        name: hibpProvider.name,
        code: hibpProvider.code,
        configured: hibpProvider.isConfigured(),
        status: hibpProvider.isConfigured() ? 'active' : 'not_configured',
      },
    };
  }
}

export const threatIntelligenceService = new ThreatIntelligenceService();
