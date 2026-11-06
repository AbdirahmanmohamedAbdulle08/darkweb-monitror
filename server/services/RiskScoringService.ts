import type { RiskFactor, Severity } from '../../src/types/index.ts';
import type { RawBreachRecord } from '../providers/ThreatProvider.ts';

export interface RiskScoringResult {
  score: number;
  severity: Severity;
  factors: RiskFactor[];
  classifiedAt: string;
}

export class RiskScoringService {
  /**
   * Transparent, rule-based risk evaluation model based on data breach parameters.
   */
  public evaluate(breaches: RawBreachRecord[], isTargetVerified: boolean): RiskScoringResult {
    if (!breaches || breaches.length === 0) {
      return {
        score: 0,
        severity: 'Informational',
        factors: [
          {
            factor: 'No Recorded Compromise',
            weight: 0,
            description: 'No confirmed historical breach records detected in active threat intelligence feeds.',
            severity: 'Informational',
          },
        ],
        classifiedAt: new Date().toISOString(),
      };
    }

    let score = 0;
    const factors: RiskFactor[] = [];

    // 1. Incident Count Weight (Base baseline)
    const incidentCount = breaches.length;
    let incidentWeight = 0;
    if (incidentCount === 1) incidentWeight = 10;
    else if (incidentCount <= 3) incidentWeight = 20;
    else if (incidentCount <= 7) incidentWeight = 30;
    else incidentWeight = 40;

    score += incidentWeight;
    factors.push({
      factor: 'Confirmed Incident Frequency',
      weight: incidentWeight,
      description: `Target identified in ${incidentCount} distinct documented security incident(s).`,
      severity: incidentCount > 4 ? 'High' : incidentCount > 1 ? 'Medium' : 'Low',
    });

    // 2. Data Sensitivity Weight
    let hasPlaintextPasswords = false;
    let hasPasswordHashes = false;
    let hasFinancialData = false;
    let hasGovernmentIds = false;
    let hasPII = false;

    for (const b of breaches) {
      const classes = (b.DataClasses || []).map(c => c.toLowerCase());
      if (classes.some(c => c.includes('password') || c.includes('secret') || c.includes('pin'))) {
        hasPasswordHashes = true;
      }
      if (classes.some(c => c.includes('credit') || c.includes('bank') || c.includes('payment') || c.includes('financial'))) {
        hasFinancialData = true;
      }
      if (classes.some(c => c.includes('social security') || c.includes('ssn') || c.includes('passport') || c.includes('national id'))) {
        hasGovernmentIds = true;
      }
      if (classes.some(c => c.includes('name') || c.includes('address') || c.includes('phone') || c.includes('dob') || c.includes('birth'))) {
        hasPII = true;
      }
      if (b.IsSensitive) {
        hasPlaintextPasswords = true; // sensitive flagged breach
      }
    }

    if (hasGovernmentIds) {
      score += 25;
      factors.push({
        factor: 'Government / National ID Exposure',
        weight: 25,
        description: 'Breach payloads include national identification numbers, passports, or social security markers.',
        severity: 'Critical',
      });
    }

    if (hasFinancialData) {
      score += 20;
      factors.push({
        factor: 'Financial & Payment Exposure',
        weight: 20,
        description: 'Exposed records contain credit card numbers, billing addresses, or banking details.',
        severity: 'High',
      });
    }

    if (hasPasswordHashes || hasPlaintextPasswords) {
      const pWeight = hasPlaintextPasswords ? 20 : 15;
      score += pWeight;
      factors.push({
        factor: hasPlaintextPasswords ? 'Sensitive / Credential Compromise' : 'Hashed Credential Exposure',
        weight: pWeight,
        description: hasPlaintextPasswords
          ? 'High-risk sensitive incident with direct authentication secrets or unhashed credential exposure.'
          : 'Cryptographic password hashes or salt parameters leaked in breach dumps.',
        severity: hasPlaintextPasswords ? 'Critical' : 'High',
      });
    }

    if (hasPII && !hasGovernmentIds) {
      score += 10;
      factors.push({
        factor: 'Personally Identifiable Information (PII)',
        weight: 10,
        description: 'Full names, email addresses, phone numbers, or dates of birth leaked, enabling spear-phishing.',
        severity: 'Medium',
      });
    }

    // 3. Recency Impact (breaches in the last 2-3 years carry higher exploitability)
    const currentYear = new Date().getFullYear();
    let hasRecentBreach = false;
    for (const b of breaches) {
      if (b.BreachDate) {
        const year = parseInt(b.BreachDate.split('-')[0], 10);
        if (!isNaN(year) && currentYear - year <= 3) {
          hasRecentBreach = true;
          break;
        }
      }
    }

    if (hasRecentBreach) {
      score += 10;
      factors.push({
        factor: 'Incident Recency',
        weight: 10,
        description: 'At least one breach occurred within the last 36 months; credentials may still be actively weaponized.',
        severity: 'High',
      });
    }

    // 4. Verification Multiplier
    if (!isTargetVerified) {
      factors.push({
        factor: 'Unverified Ownership Deduction',
        weight: 0,
        description: 'Evaluation conducted on public query; score represents raw exposure index.',
        severity: 'Informational',
      });
    }

    // Normalize final score between 0 and 100
    const finalScore = Math.min(100, Math.max(0, score));

    // Determine Severity Level
    let severity: Severity = 'Informational';
    if (finalScore >= 80) {
      severity = 'Critical';
    } else if (finalScore >= 55) {
      severity = 'High';
    } else if (finalScore >= 30) {
      severity = 'Medium';
    } else if (finalScore > 0) {
      severity = 'Low';
    }

    return {
      score: finalScore,
      severity,
      factors,
      classifiedAt: new Date().toISOString(),
    };
  }
}

export const riskScoringService = new RiskScoringService();
