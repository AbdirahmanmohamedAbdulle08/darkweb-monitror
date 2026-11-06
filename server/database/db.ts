import crypto from 'crypto';
import type {
  UserProfile,
  Scan,
  ScanFinding,
  PricingPlan,
  PaymentOrder,
  WatchlistItem,
  ReportRecord,
  NotificationItem,
  ThreatSource,
  AuditLog,
  Severity,
  ScanStatus,
} from '../../src/types/index.ts';

// In-memory relational store with Supabase parity
class DarkWatchDatabase {
  public profiles: Map<string, UserProfile & { passwordHash: string }> = new Map();
  public emailVerifications: Map<
    string,
    {
      id: string;
      userId?: string;
      email: string;
      code: string;
      tokenHash: string;
      status: 'pending' | 'verified' | 'expired';
      expiresAt: Date;
      verifiedAt?: Date;
      createdAt: Date;
    }
  > = new Map();
  public domainVerifications: Map<
    string,
    {
      id: string;
      userId?: string;
      domain: string;
      token: string;
      method: 'dns_txt' | 'html_file';
      status: 'pending' | 'verified' | 'failed';
      verifiedAt?: Date;
      createdAt: Date;
    }
  > = new Map();
  public scans: Map<string, Scan> = new Map();
  public scanFindings: Map<string, ScanFinding[]> = new Map(); // scanId -> findings
  public threatSources: Map<string, ThreatSource> = new Map();
  public pricingPlans: Map<string, PricingPlan> = new Map();
  public paymentOrders: Map<string, PaymentOrder> = new Map();
  public paymentTransactions: Map<
    string,
    {
      id: string;
      orderId: string;
      userId: string;
      transactionReference: string;
      amount: number;
      currency: string;
      status: string;
      rawPayload: Record<string, unknown>;
      createdAt: string;
    }
  > = new Map();
  public reports: Map<string, ReportRecord> = new Map();
  public watchlists: Map<string, WatchlistItem> = new Map();
  public notifications: Map<string, NotificationItem> = new Map();
  public passwordResetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.seedDefaults();
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private seedDefaults() {
    // 1. Seed Pricing Plans
    const plans: PricingPlan[] = [
      {
        id: 'plan_free_01',
        name: 'Free Exposure Summary',
        slug: 'free-summary',
        description: 'Instant preliminary exposure scan with masked metadata and essential remediation guidance.',
        amount: 0,
        currency: 'USD',
        billingInterval: 'free',
        isActive: true,
        features: [
          'Masked breach identifiers',
          'Overall risk score calculation',
          'High-level severity classification',
          'Standard remediation roadmap',
          'Single asset query',
        ],
      },
      {
        id: 'plan_deep_01',
        name: 'Single Deep Threat Report',
        slug: 'single-deep-report',
        description: 'Comprehensive forensic exposure report for a single verified email or authorized domain.',
        amount: 9.99,
        currency: 'USD',
        billingInterval: 'one_time',
        isActive: true,
        features: [
          'Unmasked breach records & threat sources',
          'Chronological breach timeline & exposed data classes',
          'AI-generated executive remediation briefing',
          'Downloadable branded DarkWatch PDF report',
          'Structured CSV findings export',
          'Permanent report archive in customer portal',
        ],
      },
      {
        id: 'plan_pro_monthly_01',
        name: 'Individual Pro Monthly',
        slug: 'pro-monthly',
        description: 'Continuous asset surveillance with automated dark web detection and instant security alerts.',
        amount: 19.99,
        currency: 'USD',
        billingInterval: 'monthly',
        isActive: true,
        features: [
          'Continuous 24/7 dark web exposure surveillance',
          'Up to 5 verified emails and authorized domains',
          'Instant alert notifications upon newly indexed breaches',
          'Unlimited Deep Forensic PDF & CSV report generation',
          'Priority risk scoring & AI mitigation assistant',
          'Cancel anytime with instant entitlement updates',
        ],
      },
      {
        id: 'plan_pro_annual_01',
        name: 'Individual Pro Annual',
        slug: 'pro-annual',
        description: 'Comprehensive annual cybersecurity monitoring with two months complimentary savings.',
        amount: 189.99,
        currency: 'USD',
        billingInterval: 'annual',
        isActive: true,
        features: [
          'All Pro Monthly features included',
          'Up to 10 verified emails and domains in watchlist',
          '2 months free annual discount',
          'Priority threat intelligence provider sync',
          'Dedicated account security audit logs',
          'Direct customer support',
        ],
      },
    ];

    for (const plan of plans) {
      this.pricingPlans.set(plan.id, plan);
    }

    // 2. Seed Threat Sources
    const sources: ThreatSource[] = [
      {
        id: 'source_hibp_01',
        name: 'Have I Been Pwned API v3',
        providerCode: 'hibp_v3',
        status: process.env.HIBP_API_KEY ? 'active' : 'degraded',
        description: 'Official commercial threat intelligence feed aggregating confirmed publicly documented data breaches.',
        breachCount: 820,
        pwnCount: 14500000000,
        lastSyncAt: new Date().toISOString(),
      },
      {
        id: 'source_pwned_passwords_01',
        name: 'Pwned Passwords Range API',
        providerCode: 'pwned_passwords',
        status: 'active',
        description: 'k-Anonymity model for checking SHA-1 hash prefixes of compromised passwords securely.',
        breachCount: 1,
        pwnCount: 900000000,
        lastSyncAt: new Date().toISOString(),
      },
    ];

    for (const source of sources) {
      this.threatSources.set(source.id, source);
    }

    // 3. Seed Default Super Admin and Demo Customer accounts
    const adminId = 'usr_admin_0001';
    this.profiles.set(adminId, {
      id: adminId,
      email: 'admin@darkwatch.sec',
      fullName: 'Chief Intelligence Officer',
      role: 'super_admin',
      status: 'active',
      passwordHash: this.hashPassword('AdminPass123!'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const customerId = 'usr_customer_0001';
    this.profiles.set(customerId, {
      id: customerId,
      email: 'user@darkwatch.sec',
      fullName: 'Alex Vance',
      role: 'customer',
      status: 'active',
      passwordHash: this.hashPassword('UserPass123!'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed sample watchlist for demo customer
    this.watchlists.set('wl_001', {
      id: 'wl_001',
      userId: customerId,
      assetType: 'email',
      assetValue: 'user@darkwatch.sec',
      isMonitored: true,
      verificationStatus: 'verified',
      lastScannedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    });

    // Seed notification
    this.notifications.set('notif_001', {
      id: 'notif_001',
      userId: customerId,
      title: 'Welcome to DarkWatch Intelligence',
      message: 'Your personal threat intelligence account is ready. Verify your assets to enable continuous surveillance.',
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    this.logAudit({
      userId: adminId,
      action: 'SYSTEM_BOOTSTRAP',
      resourceType: 'system',
      details: { message: 'Database initialized with seed plans, sources, and roles' },
    });
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
    const log: AuditLog = {
      id: 'log_' + crypto.randomUUID(),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    // Keep max 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }

  // Auth Operations
  public getUserByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    for (const user of this.profiles.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public getUserById(id: string) {
    return this.profiles.get(id) || null;
  }

  public createUser(email: string, password: string, fullName: string, role: 'customer' | 'super_admin' = 'customer'): UserProfile {
    const id = 'usr_' + crypto.randomUUID();
    const profile: UserProfile & { passwordHash: string } = {
      id,
      email: email.toLowerCase().trim(),
      fullName,
      role,
      status: 'active',
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(id, profile);
    this.logAudit({
      userId: id,
      action: 'USER_REGISTERED',
      resourceType: 'user',
      resourceId: id,
      details: { email: profile.email, role },
    });
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  public verifyPassword(user: UserProfile & { passwordHash: string }, plainText: string): boolean {
    return user.passwordHash === this.hashPassword(plainText);
  }

  public updateUserPassword(userId: string, newPassword: string) {
    const user = this.profiles.get(userId);
    if (!user) return false;
    user.passwordHash = this.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    this.profiles.set(userId, user);
    this.logAudit({
      userId,
      action: 'PASSWORD_UPDATED',
      resourceType: 'user',
      resourceId: userId,
    });
    return true;
  }

  public createPasswordResetToken(userId: string): string {
    const token = 'rst_' + crypto.randomBytes(24).toString('hex');
    this.passwordResetTokens.set(token, {
      userId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });
    return token;
  }

  public verifyPasswordResetToken(token: string): string | null {
    const record = this.passwordResetTokens.get(token);
    if (!record) return null;
    if (new Date() > record.expiresAt) {
      this.passwordResetTokens.delete(token);
      return null;
    }
    return record.userId;
  }

  public consumePasswordResetToken(token: string) {
    this.passwordResetTokens.delete(token);
  }
}

export const db = new DarkWatchDatabase();
