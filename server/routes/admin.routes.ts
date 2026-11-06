import { Router } from 'express';
import { db } from '../database/db.ts';
import { requireAdmin } from '../middleware/auth.middleware.ts';
import { paymentService } from '../services/PaymentService.ts';
import { scanService } from '../services/ScanService.ts';
import { hibpProvider } from '../providers/HIBPProvider.ts';
import { geminiAIService } from '../services/GeminiAIService.ts';

const router = Router();

// Enforce admin privileges on all sub-routes
router.use(requireAdmin);

// 1. Admin System Overview
router.get('/overview', (_req, res) => {
  const users = Array.from(db.profiles.values());
  const scans = Array.from(db.scans.values());
  const orders = Array.from(db.paymentOrders.values());

  const totalUsers = users.length;
  const totalScans = scans.length;
  const criticalScans = scans.filter(s => s.severity === 'Critical').length;
  const totalRevenue = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);

  res.json({
    metrics: {
      totalUsers,
      totalScans,
      criticalScans,
      totalRevenue,
      activeWatchlists: db.watchlists.size,
    },
    systemHealth: {
      hibpConfigured: hibpProvider.isConfigured(),
      geminiConfigured: geminiAIService.isAvailable(),
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      localPaymentConfigured: Boolean(process.env.LOCAL_PAYMENT_API_KEY),
      cardPaymentConfigured: Boolean(process.env.CARD_PAYMENT_SECRET_KEY),
    },
  });
});

// 2. Users Management
router.get('/users', (_req, res) => {
  const users = Array.from(db.profiles.values()).map(({ passwordHash, ...u }) => u);
  res.json({ users });
});

router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (role !== 'customer' && role !== 'super_admin') {
    res.status(400).json({ error: 'Role must be customer or super_admin.' });
    return;
  }

  const user = db.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  user.role = role;
  user.updatedAt = new Date().toISOString();
  db.profiles.set(user.id, user);

  db.logAudit({
    userId: req.user!.id,
    action: 'ADMIN_ROLE_CHANGED',
    resourceType: 'user',
    resourceId: user.id,
    details: { targetEmail: user.email, newRole: role },
  });

  const { passwordHash, ...profile } = user;
  res.json({ success: true, user: profile });
});

router.patch('/users/:id/status', (req, res) => {
  const { status } = req.body;
  if (status !== 'active' && status !== 'suspended') {
    res.status(400).json({ error: 'Status must be active or suspended.' });
    return;
  }

  const user = db.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  user.status = status;
  user.updatedAt = new Date().toISOString();
  db.profiles.set(user.id, user);

  db.logAudit({
    userId: req.user!.id,
    action: 'ADMIN_USER_STATUS_CHANGED',
    resourceType: 'user',
    resourceId: user.id,
    details: { targetEmail: user.email, status },
  });

  const { passwordHash, ...profile } = user;
  res.json({ success: true, user: profile });
});

// 3. Scans Management
router.get('/scans', (_req, res) => {
  const scans = scanService.getAllScans();
  res.json({ scans });
});

// 4. Payment Orders & Transactions
router.get('/payments', (_req, res) => {
  const orders = paymentService.getAllOrders();
  const transactions = Array.from(db.paymentTransactions.values());
  res.json({ orders, transactions });
});

// 5. Pricing Plans Management
router.get('/pricing-plans', (_req, res) => {
  const plans = paymentService.getAllPricingPlans();
  res.json({ plans });
});

router.patch('/pricing-plans/:id', (req, res) => {
  const { amount, isActive, description, name } = req.body;
  const updated = paymentService.updatePricingPlan(req.params.id, {
    ...(amount !== undefined ? { amount: Number(amount) } : {}),
    ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(name !== undefined ? { name } : {}),
  });

  if (!updated) {
    res.status(404).json({ error: 'Pricing plan not found.' });
    return;
  }

  res.json({ success: true, plan: updated });
});

// 6. Threat Intelligence Providers Status
router.get('/providers', (_req, res) => {
  const providers = Array.from(db.threatSources.values());
  res.json({
    providers,
    runtimeConfig: {
      hibpConfigured: hibpProvider.isConfigured(),
      geminiConfigured: geminiAIService.isAvailable(),
    },
  });
});

// 7. Audit Logs
router.get('/audit-logs', (_req, res) => {
  res.json({ logs: db.auditLogs });
});

// 8. System API Health
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: 'connected',
        engine: process.env.SUPABASE_URL ? 'Supabase PostgreSQL' : 'Integrated Relational Store',
        profilesCount: db.profiles.size,
        scansCount: db.scans.size,
      },
      threatIntelligence: {
        provider: 'Have I Been Pwned v3',
        status: hibpProvider.isConfigured() ? 'active' : 'not_configured',
        apiKeyPresent: hibpProvider.isConfigured(),
        notice: hibpProvider.isConfigured()
          ? 'Commercial API key active'
          : 'Threat intelligence provider is not configured. Add HIBP_API_KEY to server environment.',
      },
      aiEngine: {
        model: 'gemini-3.8-flash',
        status: geminiAIService.isAvailable() ? 'active' : 'not_configured',
        apiKeyPresent: geminiAIService.isAvailable(),
      },
      payments: {
        localMobileMoney: {
          methods: ['EVC Plus', 'Waafi'],
          configured: Boolean(process.env.LOCAL_PAYMENT_API_KEY),
          status: process.env.LOCAL_PAYMENT_API_KEY ? 'active' : 'setup_required',
        },
        internationalCards: {
          methods: ['Visa', 'Mastercard', 'Amex'],
          configured: Boolean(process.env.CARD_PAYMENT_SECRET_KEY),
          status: process.env.CARD_PAYMENT_SECRET_KEY ? 'active' : 'setup_required',
        },
      },
    },
  });
});

export default router;
