import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import { db } from '../database/db.ts';

const resolveTxt = promisify(dns.resolveTxt);

export class DomainVerificationService {
  /**
   * Normalizes domain string (strips protocol, path, port, www).
   */
  public normalizeDomain(input: string): string {
    let clean = input.toLowerCase().trim();
    clean = clean.replace(/^https?:\/\//, '');
    clean = clean.split('/')[0];
    clean = clean.split(':')[0];
    clean = clean.replace(/^www\./, '');
    return clean;
  }

  public validateDomainFormat(domain: string): boolean {
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
    return domainRegex.test(domain);
  }

  /**
   * Creates verification challenges for a domain (DNS TXT and HTTP Well-Known).
   */
  public initiateDomainVerification(domain: string, userId?: string) {
    const cleanDomain = this.normalizeDomain(domain);
    const token = 'dw_verify_' + crypto.randomBytes(16).toString('hex');
    const id = 'v_dom_' + crypto.randomUUID();

    const record = {
      id,
      userId,
      domain: cleanDomain,
      token,
      method: 'dns_txt' as const,
      status: 'pending' as const,
      createdAt: new Date(),
    };

    db.domainVerifications.set(id, record);

    db.logAudit({
      userId,
      action: 'DOMAIN_VERIFICATION_INITIATED',
      resourceType: 'domain_verification',
      resourceId: id,
      details: { domain: cleanDomain, token },
    });

    return {
      verificationId: id,
      domain: cleanDomain,
      token,
      txtRecordName: `_darkwatch-challenge.${cleanDomain}`,
      txtRecordValue: `darkwatch-verification=${token}`,
      httpFilePath: `https://${cleanDomain}/.well-known/darkwatch-verify.txt`,
      httpFileContent: token,
      hibpNotice:
        'Notice: Satisfying DarkWatch domain authorization confirms your domain ownership within our platform. To query HIBP domain breach feeds, the domain must also be authorized under your Have I Been Pwned commercial account credentials.',
    };
  }

  /**
   * Verifies domain ownership via DNS TXT or HTTP verification.
   */
  public async verifyDomain(
    verificationId: string,
    method: 'dns_txt' | 'html_file' = 'dns_txt'
  ): Promise<{ success: boolean; message: string; domain?: string }> {
    const record = db.domainVerifications.get(verificationId);
    if (!record) {
      return { success: false, message: 'Domain verification session not found.' };
    }

    const domain = record.domain;
    const token = record.token;

    // 1. DNS TXT Verification
    if (method === 'dns_txt') {
      try {
        const records = await resolveTxt(`_darkwatch-challenge.${domain}`);
        const flatRecords = records.flat();
        const expectedValue = `darkwatch-verification=${token}`;

        const found = flatRecords.some(r => r.includes(expectedValue) || r.includes(token));
        if (found) {
          record.status = 'verified';
          record.verifiedAt = new Date();
          db.domainVerifications.set(verificationId, record);

          db.logAudit({
            userId: record.userId,
            action: 'DOMAIN_VERIFIED_DNS',
            resourceType: 'domain_verification',
            resourceId: verificationId,
            details: { domain },
          });

          return {
            success: true,
            message: `Domain ${domain} successfully verified via DNS TXT record.`,
            domain,
          };
        }
      } catch (err: unknown) {
        // DNS record not yet propagated or error
      }
    }

    // 2. HTTP Well-Known File Check
    if (method === 'html_file' || method === 'dns_txt') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const url = `https://${domain}/.well-known/darkwatch-verify.txt`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const text = await res.text();
          if (text.trim() === token.trim()) {
            record.status = 'verified';
            record.verifiedAt = new Date();
            db.domainVerifications.set(verificationId, record);

            db.logAudit({
              userId: record.userId,
              action: 'DOMAIN_VERIFIED_HTTP',
              resourceType: 'domain_verification',
              resourceId: verificationId,
              details: { domain },
            });

            return {
              success: true,
              message: `Domain ${domain} successfully verified via HTTP .well-known verification file.`,
              domain,
            };
          }
        }
      } catch (err: unknown) {
        // HTTP verification failed
      }
    }

    // In local sandbox environment without live publicly reachable domain DNS/HTTP:
    // If the token matches the pending record and the domain is localhost/example or explicitly requested for testing:
    return {
      success: false,
      message: `Verification check failed. Neither the DNS TXT record at _darkwatch-challenge.${domain} nor https://${domain}/.well-known/darkwatch-verify.txt could be validated with the expected token.`,
      domain,
    };
  }

  public isDomainVerified(domain: string): boolean {
    const clean = this.normalizeDomain(domain);
    for (const record of db.domainVerifications.values()) {
      if (record.domain === clean && record.status === 'verified') {
        return true;
      }
    }
    return false;
  }
}

export const domainVerificationService = new DomainVerificationService();
