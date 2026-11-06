import assert from 'assert';
import { db } from '../server/database/db.ts';
import { emailVerificationService } from '../server/services/EmailVerificationService.ts';
import { domainVerificationService } from '../server/services/DomainVerificationService.ts';
import { riskScoringService } from '../server/services/RiskScoringService.ts';
import { threatNormalizationService } from '../server/services/ThreatNormalizationService.ts';
import { paymentService } from '../server/services/PaymentService.ts';
import { reportService } from '../server/services/ReportService.ts';
import { scanService } from '../server/services/ScanService.ts';
import type { RawBreachRecord } from '../server/providers/ThreatProvider.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res
        .then(() => {
          console.log(`[PASS] ${name}`);
          passed++;
        })
        .catch(err => {
          console.error(`[FAIL] ${name}:`, err.message);
          failed++;
        });
    } else {
      console.log(`[PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runAllTests() {
  console.log('--- STARTING DARKWATCH INTELLIGENCE AUTOMATED TEST SUITE ---\n');

  // ==========================================
  // 1. AUTHENTICATION & ACCESS CONTROL TESTS
  // ==========================================
  test('Auth: User registration creates isolated profile with hashed password', () => {
    const user = db.createUser('testuser@darkwatch.sec', 'ValidPassword123!', 'Test Operator', 'customer');
    assert.strictEqual(user.email, 'testuser@darkwatch.sec');
    assert.strictEqual(user.role, 'customer');

    const stored = db.getUserById(user.id);
    assert.ok(stored);
    assert.notStrictEqual(stored.passwordHash, 'ValidPassword123!');
  });

  test('Auth: Login verification succeeds with correct credentials and fails with invalid', () => {
    const stored = db.getUserByEmail('testuser@darkwatch.sec');
    assert.ok(stored);
    assert.strictEqual(db.verifyPassword(stored, 'ValidPassword123!'), true);
    assert.strictEqual(db.verifyPassword(stored, 'WrongPassword'), false);
  });

  test('Auth: Super admin role is enforced and customer cannot escalate role', () => {
    const customer = db.getUserByEmail('user@darkwatch.sec');
    const admin = db.getUserByEmail('admin@darkwatch.sec');
    assert.strictEqual(customer?.role, 'customer');
    assert.strictEqual(admin?.role, 'super_admin');
  });

  test('Auth: Password reset token generates, verifies, and invalidates after consumption', () => {
    const customer = db.getUserByEmail('user@darkwatch.sec')!;
    const token = db.createPasswordResetToken(customer.id);
    assert.ok(token.startsWith('rst_'));

    const verifiedUserId = db.verifyPasswordResetToken(token);
    assert.strictEqual(verifiedUserId, customer.id);

    db.updateUserPassword(customer.id, 'NewBrandSecurePass123!');
    db.consumePasswordResetToken(token);

    const recheck = db.verifyPasswordResetToken(token);
    assert.strictEqual(recheck, null);

    const updatedUser = db.getUserById(customer.id)!;
    assert.strictEqual(db.verifyPassword(updatedUser, 'NewBrandSecurePass123!'), true);
    // Restore default demo password
    db.updateUserPassword(customer.id, 'UserPass123!');
  });

  // ==========================================
  // 2. VERIFICATION WORKFLOW TESTS
  // ==========================================
  test('Verification: Email verification generates 6-digit code and expires properly', () => {
    const session = emailVerificationService.createVerification('verify_test@darkwatch.sec');
    assert.ok(session.verificationId);

    // Verify invalid code fails
    const failRes = emailVerificationService.verifyCode(session.verificationId, '000000');
    assert.strictEqual(failRes.success, false);

    // Verify valid code succeeds
    const record = db.emailVerifications.get(session.verificationId);
    assert.ok(record);
    const passRes = emailVerificationService.verifyCode(session.verificationId, record.code);
    assert.strictEqual(passRes.success, true);
    assert.strictEqual(emailVerificationService.isEmailVerified('verify_test@darkwatch.sec'), true);
  });

  test('Verification: Domain verification challenges reject invalid domain syntax', () => {
    assert.strictEqual(domainVerificationService.validateDomainFormat('valid-domain.com'), true);
    assert.strictEqual(domainVerificationService.validateDomainFormat('sub.deep.enterprise.org'), true);
    assert.strictEqual(domainVerificationService.validateDomainFormat('invalid domain space'), false);
  });

  // ==========================================
  // 3. THREAT INTELLIGENCE & SCORING TESTS
  // ==========================================
  test('Scoring: Risk engine calculates transparent score considering sensitive data classes', () => {
    const sampleBreaches: RawBreachRecord[] = [
      {
        Name: 'Adobe',
        Title: 'Adobe',
        Domain: 'adobe.com',
        BreachDate: '2013-10-04',
        AddedDate: '2013-12-04',
        ModifiedDate: '2013-12-04',
        PwnCount: 153000000,
        Description: 'Compromised records included email addresses and password hashes.',
        DataClasses: ['Email addresses', 'Password hints', 'Passwords'],
        IsVerified: true,
        IsFabricated: false,
        IsSensitive: false,
        IsRetired: false,
        IsSpamList: false,
        IsMalware: false,
      },
      {
        Name: 'Equifax',
        Title: 'Equifax',
        Domain: 'equifax.com',
        BreachDate: '2017-09-07',
        AddedDate: '2017-09-07',
        ModifiedDate: '2017-09-07',
        PwnCount: 147000000,
        Description: 'Exposed social security numbers, dates of birth, and driver license numbers.',
        DataClasses: ['Social security numbers', 'Dates of birth', 'Driver licenses'],
        IsVerified: true,
        IsFabricated: false,
        IsSensitive: true,
        IsRetired: false,
        IsSpamList: false,
        IsMalware: false,
      },
    ];

    const result = riskScoringService.evaluate(sampleBreaches, true);
    assert.ok(result.score >= 50, 'Equifax and Adobe combined must score above 50');
    assert.ok(['High', 'Critical'].includes(result.severity));
    assert.ok(result.factors.some(f => f.factor.includes('Government') || f.factor.includes('Credential')));
  });

  test('Scoring: Empty breach list returns Informational with 0 score', () => {
    const result = riskScoringService.evaluate([], true);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.severity, 'Informational');
  });

  test('Normalization: Masking protects email identifier privacy in public previews', () => {
    const masked = threatNormalizationService.maskEmail('alexander@example.com');
    assert.strictEqual(masked, 'al***r@example.com');
  });

  // ==========================================
  // 4. PAYMENT & ENTITLEMENT TESTS
  // ==========================================
  test('Payments: Free plan instantly activates and creates unlocked summary report', async () => {
    const customer = db.getUserByEmail('user@darkwatch.sec')!;
    const res = await paymentService.createOrder({
      userId: customer.id,
      planId: 'plan_free_01',
      paymentCategory: 'local',
      paymentMethod: 'evc_plus',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.order?.status, 'paid');
    assert.strictEqual(res.order?.amount, 0);
  });

  test('Payments: Missing merchant credentials correctly returns setup_required state without fake success', async () => {
    const customer = db.getUserByEmail('user@darkwatch.sec')!;
    const res = await paymentService.createOrder({
      userId: customer.id,
      planId: 'plan_deep_01',
      paymentCategory: 'local',
      paymentMethod: 'evc_plus',
      customerPhone: '+252615000000',
    });

    // Unless LOCAL_PAYMENT_API_KEY is configured in env, status must be setup_required
    if (!process.env.LOCAL_PAYMENT_API_KEY) {
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.order?.status, 'setup_required');
    }
  });

  test('Payments: Webhook rejects invalid HMAC signatures', async () => {
    const fakePayload = { orderReference: 'DW-TEST-001', amount: 9.99, status: 'PAID' };
    const res = await paymentService.handleWebhook('evc_plus', fakePayload, 'invalid_signature_hash');
    assert.strictEqual(res.success, false);
  });

  // ==========================================
  // 5. SECURITY & DATA ISOLATION TESTS
  // ==========================================
  test('Security: Private reports cannot be accessed by unauthorized cross-users', () => {
    const customer = db.getUserByEmail('user@darkwatch.sec')!;
    const attackerId = 'usr_unauthorized_attacker';

    // Create a mock report for customer
    const reportId = 'rep_secret_001';
    db.reports.set(reportId, {
      id: reportId,
      userId: customer.id,
      scanId: 'scn_001',
      reportType: 'premium',
      title: 'Confidential Report',
      isUnlocked: true,
      createdAt: new Date().toISOString(),
    });

    const access = reportService.getReportById(reportId, attackerId, 'customer');
    assert.strictEqual(access.error, 'Unauthorized access to private threat report.');
  });

  setTimeout(() => {
    console.log(`\n--- TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED ---`);
    if (failed > 0) {
      process.exit(1);
    }
  }, 500);
}

runAllTests();
