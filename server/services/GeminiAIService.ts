import { GoogleGenAI } from '@google/genai';
import type { ScanFinding } from '../../src/types/index.ts';

export class GeminiAIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  public isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  /**
   * Generates an executive threat briefing summarizing confirmed exposure records.
   */
  public async generateThreatSummary(
    target: string,
    targetType: 'email' | 'domain',
    findings: ScanFinding[],
    riskScore: number,
    severity: string
  ): Promise<string> {
    if (!this.ai || !this.isAvailable()) {
      return this.getFallbackSummary(target, findings, riskScore, severity);
    }

    try {
      const breachList = findings
        .slice(0, 10)
        .map(f => `- ${f.title} (${f.breachDate}): Exposed categories: ${f.dataClasses.join(', ')}`)
        .join('\n');

      const prompt = `You are a Senior Cyber Threat Intelligence Analyst for DarkWatch Intelligence.
Provide a concise, 2-paragraph executive security briefing for the following scan target:
Target: ${target} (${targetType})
Calculated Risk Score: ${riskScore}/100
Severity Level: ${severity}
Discovered Breaches (${findings.length} total):
${breachList}

Instructions:
1. Explain the immediate exposure risk and attack vectors (e.g. credential stuffing, phishing, identity fraud).
2. Avoid generic hype or roleplay. Write professional, actionable threat intelligence prose. Keep under 180 words.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text?.trim();
      return text || this.getFallbackSummary(target, findings, riskScore, severity);
    } catch {
      return this.getFallbackSummary(target, findings, riskScore, severity);
    }
  }

  /**
   * Generates tailored remediation recommendations based on the breached data categories.
   */
  public async generateRemediationAdvice(
    target: string,
    findings: ScanFinding[],
    severity: string
  ): Promise<string[]> {
    if (!this.ai || !this.isAvailable()) {
      return this.getFallbackRemediation(findings, severity);
    }

    try {
      const allDataClasses = Array.from(new Set(findings.flatMap(f => f.dataClasses)));

      const prompt = `You are an enterprise incident response specialist.
Target: ${target}
Compromised Data Categories: ${allDataClasses.join(', ')}
Severity Level: ${severity}

Provide exactly 4 to 6 concise, bulleted remediation steps prioritized by urgency.
Each recommendation must be a single imperative sentence under 25 words (e.g. "Rotate passwords across all primary and secondary accounts using a dedicated password manager.").
Output ONLY a JSON array of strings: ["Step 1", "Step 2", ...]`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawJson = (response.text || '[]').trim();
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => String(item).trim());
      }
      return this.getFallbackRemediation(findings, severity);
    } catch {
      return this.getFallbackRemediation(findings, severity);
    }
  }

  private getFallbackSummary(
    target: string,
    findings: ScanFinding[],
    riskScore: number,
    severity: string
  ): string {
    if (findings.length === 0) {
      return `Target ${target} has no confirmed records in the connected public threat intelligence catalog. Maintain proactive credential hygiene and standard defensive controls.`;
    }
    return `Security assessment for ${target} identified ${findings.length} documented compromise incident(s), yielding an evaluated risk score of ${riskScore}/100 (${severity}). Discovered exposures involve sensitive attributes and authentication metadata. Immediate remediation and access reviews are recommended to prevent unauthorized credential stuffing and lateral identity exploitation.`;
  }

  private getFallbackRemediation(findings: ScanFinding[], severity: string): string[] {
    const advice: string[] = [
      'Immediately rotate passwords across all accounts sharing credentials with affected platforms.',
      'Enforce hardware or software-based Time-based One-Time Password (TOTP) two-factor authentication.',
      'Audit connected third-party OAuth app authorizations and invalidate stale API sessions.',
    ];

    const hasFinancial = findings.some(f =>
      f.dataClasses.some(c => c.toLowerCase().includes('credit') || c.toLowerCase().includes('bank') || c.toLowerCase().includes('payment'))
    );

    if (hasFinancial) {
      advice.push('Initiate credit file monitoring and place temporary fraud alerts with primary credit reporting bureaus.');
    }

    if (severity === 'Critical' || severity === 'High') {
      advice.push('Adopt an audited password manager to generate unique 16+ character passphrases for every distinct online identity.');
    }

    advice.push('Maintain active watchlists in DarkWatch Intelligence to receive real-time notifications when new dumps are cataloged.');

    return advice;
  }
}

export const geminiAIService = new GeminiAIService();
