import crypto from 'crypto';
import { db } from '../database/db.ts';

export class EmailVerificationService {
  /**
   * Generates a 6-digit verification code with a 15-minute expiration.
   */
  public createVerification(email: string, userId?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const id = 'v_eml_' + crypto.randomUUID();
    const record = {
      id,
      userId,
      email: normalizedEmail,
      code,
      tokenHash,
      status: 'pending' as const,
      expiresAt,
      createdAt: new Date(),
    };

    db.emailVerifications.set(id, record);

    db.logAudit({
      userId,
      action: 'EMAIL_VERIFICATION_DISPATCHED',
      resourceType: 'email_verification',
      resourceId: id,
      details: { email: normalizedEmail, expiresAt },
    });

    return {
      verificationId: id,
      token,
      email: normalizedEmail,
      expiresAt: expiresAt.toISOString(),
      // In sandbox/development, provide the code so tests and user trials can complete verification without external SMTP
      previewCode: process.env.EMAIL_PROVIDER_API_KEY ? undefined : code,
    };
  }

  /**
   * Verifies an email verification code.
   */
  public verifyCode(verificationId: string, inputCode: string): { success: boolean; message: string; email?: string } {
    const record = db.emailVerifications.get(verificationId);
    if (!record) {
      return { success: false, message: 'Verification session not found or expired.' };
    }

    if (new Date() > record.expiresAt) {
      record.status = 'expired';
      db.emailVerifications.set(verificationId, record);
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    if (record.code !== inputCode.trim()) {
      return { success: false, message: 'Invalid 6-digit verification code. Please check and try again.' };
    }

    record.status = 'verified';
    record.verifiedAt = new Date();
    db.emailVerifications.set(verificationId, record);

    db.logAudit({
      userId: record.userId,
      action: 'EMAIL_VERIFIED',
      resourceType: 'email_verification',
      resourceId: verificationId,
      details: { email: record.email },
    });

    return {
      success: true,
      message: 'Email address successfully verified.',
      email: record.email,
    };
  }

  public isEmailVerified(email: string): boolean {
    const normalized = email.toLowerCase().trim();
    for (const record of db.emailVerifications.values()) {
      if (record.email === normalized && record.status === 'verified') {
        return true;
      }
    }
    return false;
  }
}

export const emailVerificationService = new EmailVerificationService();
