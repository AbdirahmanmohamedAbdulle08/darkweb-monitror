import crypto from 'crypto';
import { db } from '../database/db.ts';
import { threatIntelligenceService } from './ThreatIntelligenceService.ts';
import { threatNormalizationService } from './ThreatNormalizationService.ts';
import { riskScoringService } from './RiskScoringService.ts';
import { geminiAIService } from './GeminiAIService.ts';
import { emailVerificationService } from './EmailVerificationService.ts';
import { domainVerificationService } from './DomainVerificationService.ts';
import type { Scan, ScanFinding } from '../../src/types/index.ts';

export interface ScanExecutionParams {
  target: string;
  targetType: 'email' | 'domain';
  userId?: string;
  isPublicScan?: boolean;
  skipVerificationCheck?: boolean; // For authenticated users testing their verified watchlist
}

export class ScanService {
  public async executeScan(params: ScanExecutionParams): Promise<{
    success: boolean;
    scan?: Scan;
    findings?: ScanFinding[];
    error?: string;
    requiresVerification?: boolean;
  }> {
    const { targetType, userId, isPublicScan = false, skipVerificationCheck = false } = params;
    let normalizedTarget = params.target.trim().toLowerCase();

    // 1. Validation
    if (targetType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedTarget)) {
        return { success: false, error: 'Invalid email address format.' };
      }

      // Check ownership verification
      if (!skipVerificationCheck) {
        const isVerified = emailVerificationService.isEmailVerified(normalizedTarget);
        if (!isVerified) {
          return {
            success: false,
            requiresVerification: true,
            error: 'Email ownership verification is required before initiating an exposure scan.',
          };
        }
      }
    } else if (targetType === 'domain') {
      normalizedTarget = domainVerificationService.normalizeDomain(normalizedTarget);
      if (!domainVerificationService.validateDomainFormat(normalizedTarget)) {
        return { success: false, error: 'Invalid domain name format.' };
      }

      // Domain authorization check
      if (!skipVerificationCheck) {
        const isVerified = domainVerificationService.isDomainVerified(normalizedTarget);
        if (!isVerified) {
          return {
            success: false,
            requiresVerification: true,
            error: 'Authorized domain verification required. You may only scan domains you own or have explicit authorization to monitor.',
          };
        }
      }
    } else {
      return { success: false, error: 'Unsupported scan target type.' };
    }

    const scanId = 'scn_' + crypto.randomUUID();

    // 2. Query External Threat Intelligence Provider
    const queryResult =
      targetType === 'email'
        ? await threatIntelligenceService.queryEmailExposure(normalizedTarget)
        : await threatIntelligenceService.queryDomainExposure(normalizedTarget);

    if (!queryResult.success && !queryResult.isNotFound) {
      // Record failed scan audit
      db.logAudit({
        userId,
        action: 'SCAN_FAILED',
        resourceType: 'scan',
        resourceId: scanId,
        details: { target: normalizedTarget, error: queryResult.errorMessage, status: queryResult.status },
      });

      return {
        success: false,
        error: queryResult.errorMessage || 'Threat intelligence provider query failed.',
      };
    }

    const rawBreaches = queryResult.breaches || [];

    // 3. Normalize Breaches into ScanFindings
    const findings = threatNormalizationService.normalizeBreaches(rawBreaches, scanId);

    // 4. Calculate Risk Score & Severity
    const riskEval = riskScoringService.evaluate(rawBreaches, true);

    // 5. Generate AI Executive Summary & Remediation via Google Gemini API
    const aiSummary = await geminiAIService.generateThreatSummary(
      normalizedTarget,
      targetType,
      findings,
      riskEval.score,
      riskEval.severity
    );

    const aiRemediation = await geminiAIService.generateRemediationAdvice(
      normalizedTarget,
      findings,
      riskEval.severity
    );

    // 6. Build and Persist Scan Object
    const scan: Scan = {
      id: scanId,
      userId: userId || null,
      targetType,
      targetValue: normalizedTarget,
      status: queryResult.isNotFound ? 'no_findings' : 'completed',
      riskScore: riskEval.score,
      severity: riskEval.severity,
      breachCount: findings.length,
      provider: queryResult.provider,
      scoringFactors: riskEval.factors,
      aiSummary,
      aiRemediation,
      isPublicScan,
      findings,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    db.scans.set(scanId, scan);
    db.scanFindings.set(scanId, findings);

    // 7. Update user notifications & watchlists if authenticated
    if (userId) {
      // Create notification
      const notifId = 'notif_' + crypto.randomUUID();
      db.notifications.set(notifId, {
        id: notifId,
        userId,
        title: findings.length > 0 ? `Exposure Found: ${normalizedTarget}` : `Clean Scan: ${normalizedTarget}`,
        message:
          findings.length > 0
            ? `Identified ${findings.length} breach incidents for ${normalizedTarget}. Risk score: ${riskEval.score}/100 (${riskEval.severity}).`
            : `No matching records found for ${normalizedTarget} in active threat feeds.`,
        type: findings.length > 0 ? 'exposure_found' : 'scan_completed',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Update watchlist lastScannedAt
      for (const item of db.watchlists.values()) {
        if (item.userId === userId && item.assetValue === normalizedTarget) {
          item.lastScannedAt = new Date().toISOString();
          db.watchlists.set(item.id, item);
          break;
        }
      }
    }

    db.logAudit({
      userId,
      action: 'SCAN_COMPLETED',
      resourceType: 'scan',
      resourceId: scanId,
      details: {
        target: normalizedTarget,
        breachCount: findings.length,
        riskScore: riskEval.score,
        severity: riskEval.severity,
      },
    });

    return {
      success: true,
      scan,
      findings,
    };
  }

  public getScanById(scanId: string, requestingUserId?: string, userRole?: string): { scan?: Scan; findings?: ScanFinding[]; error?: string } {
    const scan = db.scans.get(scanId);
    if (!scan) {
      return { error: 'Scan not found.' };
    }

    // Access control:
    // - Public scans are readable by all
    // - Authenticated scans are accessible only by owner or super_admin
    if (!scan.isPublicScan && scan.userId && scan.userId !== requestingUserId && userRole !== 'super_admin') {
      return { error: 'Access denied. You are not authorized to view this private scan.' };
    }

    const findings = db.scanFindings.get(scanId) || [];
    return {
      scan: { ...scan, findings },
      findings,
    };
  }

  public getUserScans(userId: string): Scan[] {
    const results: Scan[] = [];
    for (const scan of db.scans.values()) {
      if (scan.userId === userId) {
        results.push({
          ...scan,
          findings: db.scanFindings.get(scan.id) || [],
        });
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllScans(): Scan[] {
    const results: Scan[] = [];
    for (const scan of db.scans.values()) {
      results.push({
        ...scan,
        findings: db.scanFindings.get(scan.id) || [],
      });
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const scanService = new ScanService();
