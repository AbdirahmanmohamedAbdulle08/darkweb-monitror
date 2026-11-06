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
  EmailVerificationSession,
  DomainVerificationDetails,
} from '../types/index.ts';

const TOKEN_KEY = 'darkwatch_auth_token';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  public clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return data as T;
  }

  // --- Auth Endpoints ---
  public async register(payload: { email: string; password: string; fullName: string }) {
    const data = await this.request<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.token);
    return data;
  }

  public async login(payload: { email: string; password: string }) {
    const data = await this.request<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.token);
    return data;
  }

  public async getMe() {
    return this.request<{ user: UserProfile }>('/api/auth/me');
  }

  public async updatePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>('/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string; previewToken?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(payload: { token: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Scan & Verification Endpoints ---
  public async requestEmailVerification(email: string) {
    return this.request<EmailVerificationSession & { success: boolean; message: string }>(
      '/api/scan/verify-email-request',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  public async confirmEmailVerification(verificationId: string, code: string) {
    return this.request<{ success: boolean; message: string; email?: string }>(
      '/api/scan/verify-email-confirm',
      {
        method: 'POST',
        body: JSON.stringify({ verificationId, code }),
      }
    );
  }

  public async requestDomainVerification(domain: string) {
    return this.request<DomainVerificationDetails & { verificationId: string; success: boolean }>(
      '/api/scan/verify-domain-request',
      {
        method: 'POST',
        body: JSON.stringify({ domain }),
      }
    );
  }

  public async confirmDomainVerification(verificationId: string, method: 'dns_txt' | 'html_file') {
    return this.request<{ success: boolean; message: string; domain?: string }>(
      '/api/scan/verify-domain-confirm',
      {
        method: 'POST',
        body: JSON.stringify({ verificationId, method }),
      }
    );
  }

  public async executePublicScan(target: string, targetType: 'email' | 'domain', verificationId?: string) {
    return this.request<{ success: boolean; scan: Scan; findings: ScanFinding[] }>('/api/scan/public', {
      method: 'POST',
      body: JSON.stringify({ target, targetType, verificationId }),
    });
  }

  public async executeAuthenticatedScan(target: string, targetType: 'email' | 'domain') {
    return this.request<{ success: boolean; scan: Scan; findings: ScanFinding[] }>('/api/scan/authenticated', {
      method: 'POST',
      body: JSON.stringify({ target, targetType }),
    });
  }

  public async checkPasswordPwned(password: string) {
    return this.request<{ success: boolean; isCompromised: boolean; seenCount: number }>(
      '/api/scan/pwned-password',
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
  }

  public async getMyScans() {
    return this.request<{ scans: Scan[] }>('/api/scan/my-scans');
  }

  public async getScanById(scanId: string) {
    return this.request<{ scan: Scan; findings: ScanFinding[] }>(`/api/scan/${scanId}`);
  }

  // --- Watchlist Endpoints ---
  public async getWatchlists() {
    return this.request<{ watchlists: WatchlistItem[] }>('/api/watchlist');
  }

  public async addWatchlist(assetType: 'email' | 'domain', assetValue: string) {
    return this.request<{ success: boolean; item: WatchlistItem; message: string }>('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ assetType, assetValue }),
    });
  }

  public async toggleWatchlistMonitoring(id: string) {
    return this.request<{ success: boolean; item: WatchlistItem }>(`/api/watchlist/${id}/toggle-monitoring`, {
      method: 'PATCH',
    });
  }

  public async removeWatchlist(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/watchlist/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Payment Endpoints ---
  public async getPricingPlans() {
    return this.request<{ plans: PricingPlan[] }>('/api/payments/plans');
  }

  public async createPaymentOrder(payload: {
    planId: string;
    scanId?: string;
    paymentCategory: 'local' | 'card';
    paymentMethod: 'evc_plus' | 'waafi' | 'card';
    customerPhone?: string;
    customerEmail?: string;
  }) {
    return this.request<{ success: boolean; order: PaymentOrder; message: string; checkoutUrl?: string }>(
      '/api/payments/create-order',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async getMyOrders() {
    return this.request<{ orders: PaymentOrder[] }>('/api/payments/my-orders');
  }

  // --- Reports Endpoints ---
  public async getMyReports() {
    return this.request<{ reports: Array<ReportRecord & { scan?: Scan }> }>('/api/reports/my-reports');
  }

  public async getReportById(id: string) {
    return this.request<{ report: ReportRecord; scan: Scan; findings: ScanFinding[] }>(`/api/reports/${id}`);
  }

  // --- Notifications Endpoints ---
  public async getNotifications() {
    return this.request<{ notifications: NotificationItem[] }>('/api/notifications');
  }

  public async markNotificationRead(id: string) {
    return this.request<{ success: boolean; notification: NotificationItem }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  public async markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/api/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  // --- Admin Endpoints ---
  public async getAdminOverview() {
    return this.request<{
      metrics: {
        totalUsers: number;
        totalScans: number;
        criticalScans: number;
        totalRevenue: number;
        activeWatchlists: number;
      };
      systemHealth: Record<string, boolean>;
    }>('/api/admin/overview');
  }

  public async getAdminUsers() {
    return this.request<{ users: UserProfile[] }>('/api/admin/users');
  }

  public async updateAdminUserRole(userId: string, role: 'customer' | 'super_admin') {
    return this.request<{ success: boolean; user: UserProfile }>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  public async updateAdminUserStatus(userId: string, status: 'active' | 'suspended') {
    return this.request<{ success: boolean; user: UserProfile }>(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public async getAdminScans() {
    return this.request<{ scans: Scan[] }>('/api/admin/scans');
  }

  public async getAdminPayments() {
    return this.request<{ orders: PaymentOrder[]; transactions: any[] }>('/api/admin/payments');
  }

  public async getAdminPricingPlans() {
    return this.request<{ plans: PricingPlan[] }>('/api/admin/pricing-plans');
  }

  public async updateAdminPricingPlan(id: string, updates: Partial<PricingPlan>) {
    return this.request<{ success: boolean; plan: PricingPlan }>(`/api/admin/pricing-plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async getAdminProviders() {
    return this.request<{ providers: ThreatSource[]; runtimeConfig: Record<string, boolean> }>('/api/admin/providers');
  }

  public async getAdminAuditLogs() {
    return this.request<{ logs: AuditLog[] }>('/api/admin/audit-logs');
  }

  public async getAdminHealth() {
    return this.request<{
      status: string;
      timestamp: string;
      services: Record<string, any>;
    }>('/api/admin/health');
  }
}

export const api = new ApiClient();
