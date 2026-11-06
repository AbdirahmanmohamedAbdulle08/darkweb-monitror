import { Router } from 'express';
import { scanService } from '../services/ScanService.ts';
import { emailVerificationService } from '../services/EmailVerificationService.ts';
import { domainVerificationService } from '../services/DomainVerificationService.ts';
import { threatIntelligenceService } from '../services/ThreatIntelligenceService.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

// 1. Initiate Email Verification
router.post('/verify-email-request', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Valid email address is required.' });
    return;
  }

  const session = emailVerificationService.createVerification(email, req.user?.id);
  res.json({
    success: true,
    verificationId: session.verificationId,
    email: session.email,
    expiresAt: session.expiresAt,
    previewCode: session.previewCode, // Sent in dev/sandbox mode when external email provider is not connected
    message: 'Verification code generated. Please check your inbox or use the verification code provided.',
  });
});

// 2. Confirm Email Verification
router.post('/verify-email-confirm', (req, res) => {
  const { verificationId, code } = req.body;
  if (!verificationId || !code) {
    res.status(400).json({ error: 'Verification ID and 6-digit code are required.' });
    return;
  }

  const result = emailVerificationService.verifyCode(verificationId, code);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json(result);
});

// 3. Initiate Domain Verification
router.post('/verify-domain-request', (req, res) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'Domain name is required.' });
    return;
  }

  const cleanDomain = domainVerificationService.normalizeDomain(domain);
  if (!domainVerificationService.validateDomainFormat(cleanDomain)) {
    res.status(400).json({ error: 'Invalid domain syntax. Example: company.com' });
    return;
  }

  const details = domainVerificationService.initiateDomainVerification(cleanDomain, req.user?.id);
  res.json({
    success: true,
    ...details,
  });
});

// 4. Confirm Domain Verification
router.post('/verify-domain-confirm', async (req, res) => {
  const { verificationId, method } = req.body;
  if (!verificationId) {
    res.status(400).json({ error: 'Verification ID is required.' });
    return;
  }

  const result = await domainVerificationService.verifyDomain(verificationId, method || 'dns_txt');
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json(result);
});

// 5. Execute Public Scan
router.post('/public', async (req, res) => {
  const { target, targetType, verificationId } = req.body;

  if (!target || !targetType) {
    res.status(400).json({ error: 'Scan target and targetType (email or domain) are required.' });
    return;
  }

  if (targetType !== 'email' && targetType !== 'domain') {
    res.status(400).json({ error: 'Target type must be either email or domain.' });
    return;
  }

  // Check verification
  let isVerified = false;
  if (targetType === 'email') {
    isVerified = emailVerificationService.isEmailVerified(target);
  } else {
    isVerified = domainVerificationService.isDomainVerified(target);
  }

  if (!isVerified) {
    res.status(403).json({
      error: 'Ownership authorization required. You must verify ownership of this asset before performing a threat intelligence query.',
      requiresVerification: true,
    });
    return;
  }

  const result = await scanService.executeScan({
    target,
    targetType,
    userId: req.user?.id,
    isPublicScan: true,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    scan: result.scan,
    findings: result.findings,
  });
});

// 6. Execute Authenticated Scan
router.post('/authenticated', requireAuth, async (req, res) => {
  const { target, targetType } = req.body;

  if (!target || !targetType) {
    res.status(400).json({ error: 'Scan target and targetType are required.' });
    return;
  }

  const result = await scanService.executeScan({
    target,
    targetType,
    userId: req.user!.id,
    isPublicScan: false,
    skipVerificationCheck: false,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error, requiresVerification: result.requiresVerification });
    return;
  }

  res.json({
    success: true,
    scan: result.scan,
    findings: result.findings,
  });
});

// 7. Pwned Passwords Range Check (SHA-1 k-Anonymity)
router.post('/pwned-password', async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password string required for hash checking.' });
    return;
  }

  const result = await threatIntelligenceService.checkPasswordPwned(password);
  res.json({
    success: true,
    ...result,
  });
});

// 8. Get User Scans
router.get('/my-scans', requireAuth, (req, res) => {
  const scans = scanService.getUserScans(req.user!.id);
  res.json({ scans });
});

// 9. Get Single Scan by ID
router.get('/:id', (req, res) => {
  const result = scanService.getScanById(req.params.id, req.user?.id, req.user?.role);
  if (result.error) {
    res.status(result.error.includes('Access denied') ? 403 : 404).json({ error: result.error });
    return;
  }

  res.json({
    scan: result.scan,
    findings: result.findings,
  });
});

export default router;
