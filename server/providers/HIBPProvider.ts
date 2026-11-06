import type { ThreatProvider, ProviderQueryResult, RawBreachRecord } from './ThreatProvider.ts';

export class HIBPProvider implements ThreatProvider {
  public name = 'Have I Been Pwned API v3';
  public code = 'hibp_v3';
  private baseUrl = 'https://haveibeenpwned.com/api/v3';
  private userAgent = 'DarkWatch-Intelligence/1.0';

  public isConfigured(): boolean {
    return Boolean(process.env.HIBP_API_KEY && process.env.HIBP_API_KEY.trim().length > 0);
  }

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.HIBP_API_KEY || '';
    return {
      'hibp-api-key': apiKey.trim(),
      'user-agent': this.userAgent,
      'Accept': 'application/json',
    };
  }

  public async searchEmailBreaches(email: string): Promise<ProviderQueryResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        success: false,
        breaches: [],
        isNotFound: false,
        status: 401,
        errorMessage: 'Threat intelligence provider is not configured. Add HIBP_API_KEY to server environment.',
        limitations: 'Have I Been Pwned queries require an active commercial API key.',
      };
    }

    const encoded = encodeURIComponent(email.trim().toLowerCase());
    const url = `${this.baseUrl}/breachedaccount/${encoded}?truncateResponse=false`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 200) {
        const breaches: RawBreachRecord[] = await response.json();
        return {
          provider: this.name,
          success: true,
          breaches,
          isNotFound: false,
          status: 200,
          limitations: 'Covers publicly documented and verified historical data breaches indexed by HIBP.',
        };
      }

      if (response.status === 404) {
        return {
          provider: this.name,
          success: true,
          breaches: [],
          isNotFound: true,
          status: 404,
          errorMessage: 'No matching breach records were found in the connected intelligence source.',
          limitations: 'Absence of records in HIBP confirms no public breach match; it does not guarantee total immunity from unindexed zero-day breaches.',
        };
      }

      if (response.status === 400) {
        return {
          provider: this.name,
          success: false,
          breaches: [],
          isNotFound: false,
          status: 400,
          errorMessage: 'The email address format was rejected by the intelligence provider.',
        };
      }

      if (response.status === 401) {
        return {
          provider: this.name,
          success: false,
          breaches: [],
          isNotFound: false,
          status: 401,
          errorMessage: 'Threat intelligence provider authentication failed. Invalid HIBP API key.',
        };
      }

      if (response.status === 403) {
        return {
          provider: this.name,
          success: false,
          breaches: [],
          isNotFound: false,
          status: 403,
          errorMessage: 'Access forbidden by threat intelligence provider. Check User-Agent or permission scopes.',
        };
      }

      if (response.status === 429) {
        return {
          provider: this.name,
          success: false,
          breaches: [],
          isNotFound: false,
          status: 429,
          errorMessage: 'Rate limit exceeded for threat intelligence provider. Please retry after a brief delay.',
        };
      }

      if (response.status === 503) {
        return {
          provider: this.name,
          success: false,
          breaches: [],
          isNotFound: false,
          status: 503,
          errorMessage: 'The external threat intelligence provider is currently unavailable.',
        };
      }

      return {
        provider: this.name,
        success: false,
        breaches: [],
        isNotFound: false,
        status: response.status,
        errorMessage: `Threat provider returned unexpected HTTP status: ${response.status}`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        provider: this.name,
        success: false,
        breaches: [],
        isNotFound: false,
        status: 500,
        errorMessage: `Network error reaching threat intelligence source: ${errorMsg}`,
      };
    }
  }

  public async searchDomainBreaches(domain: string): Promise<ProviderQueryResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        success: false,
        breaches: [],
        isNotFound: false,
        status: 401,
        errorMessage: 'Threat intelligence provider is not configured. Add HIBP_API_KEY to server environment.',
      };
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0];
    const url = `${this.baseUrl}/breaches?domain=${encodeURIComponent(cleanDomain)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 200) {
        const breaches: RawBreachRecord[] = await response.json();
        return {
          provider: this.name,
          success: true,
          breaches,
          isNotFound: breaches.length === 0,
          status: 200,
          errorMessage: breaches.length === 0 ? 'No matching breach records were found for this domain.' : undefined,
          limitations: 'Domain breach searches in HIBP return incidents explicitly associated with this domain root.',
        };
      }

      if (response.status === 404) {
        return {
          provider: this.name,
          success: true,
          breaches: [],
          isNotFound: true,
          status: 404,
          errorMessage: 'No matching breach records were found in the connected intelligence source.',
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          provider: this.name,
          success: false,
          breaches: [],
          isNotFound: false,
          status: response.status,
          errorMessage: 'HIBP domain search requires an enterprise key with verified domain authorization.',
        };
      }

      return {
        provider: this.name,
        success: false,
        breaches: [],
        isNotFound: false,
        status: response.status,
        errorMessage: `Domain search failed with status ${response.status}`,
      };
    } catch (err: unknown) {
      return {
        provider: this.name,
        success: false,
        breaches: [],
        isNotFound: false,
        status: 500,
        errorMessage: `Network error querying domain intelligence: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async getBreachCatalog(): Promise<RawBreachRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/breaches`, {
        method: 'GET',
        headers: {
          'user-agent': this.userAgent,
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch {
      return [];
    }
  }

  // Pwned Passwords k-Anonymity range check (public API, no auth required)
  public async checkPasswordHashPrefix(prefix5: string): Promise<string[]> {
    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix5}`, {
        headers: { 'user-agent': this.userAgent },
      });
      if (response.ok) {
        const text = await response.text();
        return text.split('\r\n').map(line => line.trim()).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const hibpProvider = new HIBPProvider();
