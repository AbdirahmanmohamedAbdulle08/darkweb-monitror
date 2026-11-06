import { Router } from 'express';
import { paymentService } from '../services/PaymentService.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

// 1. Get Active Pricing Plans
router.get('/plans', (_req, res) => {
  const plans = paymentService.getPricingPlans();
  res.json({ plans });
});

// 2. Create Payment Order
router.post('/create-order', requireAuth, async (req, res) => {
  const { planId, scanId, paymentCategory, paymentMethod, customerPhone, customerEmail } = req.body;

  if (!planId || !paymentCategory || !paymentMethod) {
    res.status(400).json({ error: 'planId, paymentCategory, and paymentMethod are required.' });
    return;
  }

  if (paymentMethod !== 'evc_plus' && paymentMethod !== 'waafi' && paymentMethod !== 'card') {
    res.status(400).json({ error: 'Unsupported payment method.' });
    return;
  }

  const result = await paymentService.createOrder({
    userId: req.user!.id,
    planId,
    scanId,
    paymentCategory,
    paymentMethod,
    customerPhone,
    customerEmail: customerEmail || req.user!.email,
  });

  if (!result.success) {
    res.status(result.order?.status === 'setup_required' ? 503 : 400).json({
      error: result.message,
      status: result.order?.status,
      order: result.order,
    });
    return;
  }

  res.status(201).json({
    success: true,
    order: result.order,
    message: result.message,
    checkoutUrl: result.checkoutUrl,
  });
});

// 3. Webhook Callback Endpoint
router.post('/webhook/:method', async (req, res) => {
  const method = req.params.method as 'evc_plus' | 'waafi' | 'card';
  const signature = (req.headers['x-webhook-signature'] ||
    req.headers['stripe-signature'] ||
    req.headers['signature']) as string | undefined;

  const result = await paymentService.handleWebhook(method, req.body, signature);

  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json({ success: true, message: result.message, orderId: result.orderId });
});

// 4. Get User Orders
router.get('/my-orders', requireAuth, (req, res) => {
  const orders = paymentService.getUserOrders(req.user!.id);
  res.json({ orders });
});

export default router;
