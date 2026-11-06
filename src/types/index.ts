export type Severity = 'Informational' | 'Low' | 'Medium' | 'High' | 'Critical';

export type ScanStatus =
  | 'idle'
  | 'validating'
  | 'awaiting_verification'
  | 'queued'
  | 'scanning'
  | 'completed'
  | 'no_findings'
  | 'failed'
  | 'unauthorized';

export type UserRole = 'customer' | 'super_admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
  severity: Severity;
}

export interface ScanFinding {
  id: string;
  scanId: string;
  breachName: string;
  title: string;
  domain: string;
  breachDate: string;
  addedDate?: string;
  modifiedDate?: string;
  pwnCount: number;
  description: string;
  logoPath?: string;
  dataClasses: string[];
  isVerified: boolean;
  isFabricated: boolean;
  isSensitive: boolean;
  isRetired: boolean;
  isSpamList: boolean;
  isMalware: boolean;
}

export interface Scan {
  id: string;
  userId?: string | null;
  targetType: 'email' | 'domain';
  targetValue: string;
  status: ScanStatus;
  riskScore: number;
  severity: Severity;
  breachCount: number;
  provider: string;
  scoringFactors: RiskFactor[];
  aiSummary?: string;
  aiRemediation?: string[];
  isPublicScan: boolean;
  findings?: ScanFinding[];
  createdAt: string;
  completedAt?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  amount: number;
  currency: string;
  billingInterval: 'free' | 'one_time' | 'monthly' | 'annual';
  isActive: boolean;
  features: string[];
}

export interface PaymentOrder {
  id: string;
  userId: string;
  planId: string;
  scanId?: string;
  orderReference: string;
  amount: number;
  currency: string;
  paymentCategory: 'local' | 'card';
  paymentMethod: 'evc_plus' | 'waafi' | 'card';
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'setup_required';
  providerReference?: string;
  customerPhone?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  assetType: 'email' | 'domain';
  assetValue: string;
  isMonitored: boolean;
  verificationStatus: 'pending' | 'verified';
  lastScannedAt?: string;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  userId: string;
  scanId: string;
  orderId?: string;
  reportType: 'free' | 'premium';
  title: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'scan_completed' | 'exposure_found' | 'payment_confirmed' | 'report_unlocked' | 'verification' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface ThreatSource {
  id: string;
  name: string;
  providerCode: string;
  status: 'active' | 'inactive' | 'degraded';
  description: string;
  breachCount: number;
  pwnCount: number;
  lastSyncAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}

export interface EmailVerificationSession {
  verificationId: string;
  email: string;
  expiresAt: string;
  previewCode?: string; // provided for ease in testing/sandbox
}

export interface DomainVerificationDetails {
  domain: string;
  token: string;
  txtRecordName: string;
  txtRecordValue: string;
  httpFilePath: string;
  httpFileContent: string;
  hibpNotice: string;
}
