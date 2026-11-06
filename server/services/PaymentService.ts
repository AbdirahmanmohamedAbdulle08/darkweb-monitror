import crypto from 'crypto';
import { db } from '../database/db.ts';
import { LocalPaymentProvider } from '../providers/payments/LocalPaymentProvider.ts';
import { CardPaymentProvider } from '../providers/payments/CardPaymentProvider.ts';
import type { PaymentOrder, PricingPlan, ReportRecord } from '../../src/types/index.ts';

export class PaymentService {
  private evcProvider = new LocalPaymentProvider('evc_plus');
  private waafiProvider = new LocalPaymentProvider('waafi');
  private cardProvider = new CardPaymentProvider();

  public getPricingPlans(): PricingPlan[] {
    return Array.from(db.pricingPlans.values()).filter(p => p.isActive);
  }

  public getAllPricingPlans(): PricingPlan[] {
    return Array.from(db.pricingPlans.values());
  }

  public updatePricingPlan(id: string, updates: Partial<PricingPlan>): PricingPlan | null {
    const plan = db.pricingPlans.get(id);
    if (!plan) return null;
    const updated = { ...plan, ...updates };
    db.pricingPlans.set(id, updated);
    db.logAudit({
      action: 'PRICING_PLAN_UPDATED',
      resourceType: 'pricing_plan',
      resourceId: id,
      details: updates,
    });
    return updated;
  }

  /**
   * Creates a pending payment order and dispatches it to the selected payment adapter.
   */
  public async createOrder(params: {
    userId: string;
    planId: string;
    scanId?: string;
    paymentCategory: 'local' | 'card';
    paymentMethod: 'evc_plus' | 'waafi' | 'card';
    customerPhone?: string;
    customerEmail?: string;
  }): Promise<{ success: boolean; order?: PaymentOrder; message?: string; checkoutUrl?: string }> {
    const { userId, planId, scanId, paymentCategory, paymentMethod, customerPhone, customerEmail } = params;

    const plan = db.pricingPlans.get(planId);
    if (!plan) {
      return { success: false, message: 'Invalid pricing plan selected.' };
    }

    // Free plan handling
    if (plan.amount === 0) {
      const orderId = 'ord_' + crypto.randomUUID();
      const orderRef = 'FREE-' + Date.now().toString(36).toUpperCase();
      const freeOrder: PaymentOrder = {
        id: orderId,
        userId,
        planId,
        scanId,
        orderReference: orderRef,
        amount: 0,
        currency: 'USD',
        paymentCategory: 'local',
        paymentMethod: 'evc_plus',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.paymentOrders.set(orderId, freeOrder);

      // Unlock report entitlement if associated with scan
      if (scanId) {
        this.unlockReport(userId, scanId, orderId, 'free');
      }

      return { success: true, order: freeOrder, message: 'Free tier activated.' };
    }

    const orderId = 'ord_' + crypto.randomUUID();
    const orderReference = `DW-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Select provider adapter
    let provider = this.cardProvider as any;
    if (paymentMethod === 'evc_plus') {
      provider = this.evcProvider;
    } else if (paymentMethod === 'waafi') {
      provider = this.waafiProvider;
    }

    // Check configuration
    if (!provider.isConfigured()) {
      const order: PaymentOrder = {
        id: orderId,
        userId,
        planId,
        scanId,
        orderReference,
        amount: plan.amount,
        currency: plan.currency,
        paymentCategory,
        paymentMethod,
        status: 'setup_required',
        customerPhone,
        customerEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.paymentOrders.set(orderId, order);

      return {
        success: false,
        order,
        message: `Payment provider setup required. Merchant API credentials for ${provider.name} have not been configured on this server.`,
      };
    }

    // Create pending order in database
    const order: PaymentOrder = {
      id: orderId,
      userId,
      planId,
      scanId,
      orderReference,
      amount: plan.amount,
      currency: plan.currency,
      paymentCategory,
      paymentMethod,
      status: 'pending',
      customerPhone,
      customerEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.paymentOrders.set(orderId, order);

    const intentResult = await provider.initiatePayment({
      orderReference,
      amount: plan.amount,
      currency: plan.currency,
      customerPhone,
      customerEmail,
      metadata: { userId, planId, scanId },
    });

    if (!intentResult.success && intentResult.status !== 'pending') {
      order.status = intentResult.status;
      order.updatedAt = new Date().toISOString();
      db.paymentOrders.set(orderId, order);

      return {
        success: false,
        order,
        message: intentResult.message,
      };
    }

    order.providerReference = intentResult.providerReference;
    order.updatedAt = new Date().toISOString();
    db.paymentOrders.set(orderId, order);

    db.logAudit({
      userId,
      action: 'PAYMENT_ORDER_CREATED',
      resourceType: 'payment_order',
      resourceId: orderId,
      details: { amount: plan.amount, method: paymentMethod, reference: orderReference },
    });

    return {
      success: true,
      order,
      message: intentResult.message,
      checkoutUrl: intentResult.checkoutUrl,
    };
  }

  /**
   * Verifies incoming webhook signature and finalizes payment transaction.
   */
  public async handleWebhook(
    method: 'evc_plus' | 'waafi' | 'card',
    payload: Record<string, unknown>,
    signature?: string
  ): Promise<{ success: boolean; message: string; orderId?: string }> {
    let provider = this.cardProvider as any;
    if (method === 'evc_plus') provider = this.evcProvider;
    if (method === 'waafi') provider = this.waafiProvider;

    const verification = await provider.verifyWebhook(payload, signature);
    if (!verification.isValid || !verification.orderReference) {
      return {
        success: false,
        message: verification.error || 'Invalid webhook payload or signature mismatch.',
      };
    }

    // Lookup order by reference
    let matchedOrder: PaymentOrder | null = null;
    for (const order of db.paymentOrders.values()) {
      if (order.orderReference === verification.orderReference) {
        matchedOrder = order;
        break;
      }
    }

    if (!matchedOrder) {
      return { success: false, message: 'Order reference not found in database records.' };
    }

    // Idempotency check: if already marked paid, return success without re-crediting
    if (matchedOrder.status === 'paid') {
      return { success: true, message: 'Order was previously verified and finalized.', orderId: matchedOrder.id };
    }

    // Verify transaction amount matches plan price
    if (verification.amount !== undefined && verification.amount < matchedOrder.amount) {
      matchedOrder.status = 'failed';
      matchedOrder.updatedAt = new Date().toISOString();
      db.paymentOrders.set(matchedOrder.id, matchedOrder);
      return { success: false, message: 'Payment rejected: received amount is less than expected amount.' };
    }

    // Finalize order
    matchedOrder.status = verification.status === 'paid' ? 'paid' : 'failed';
    matchedOrder.providerReference = verification.providerReference || matchedOrder.providerReference;
    matchedOrder.updatedAt = new Date().toISOString();
    db.paymentOrders.set(matchedOrder.id, matchedOrder);

    // Record transaction
    const txId = 'tx_' + crypto.randomUUID();
    db.paymentTransactions.set(txId, {
      id: txId,
      orderId: matchedOrder.id,
      userId: matchedOrder.userId,
      transactionReference: verification.providerReference || `tx_${Date.now()}`,
      amount: matchedOrder.amount,
      currency: matchedOrder.currency,
      status: matchedOrder.status,
      rawPayload: payload,
      createdAt: new Date().toISOString(),
    });

    if (matchedOrder.status === 'paid') {
      // Unlock report entitlement
      if (matchedOrder.scanId) {
        this.unlockReport(matchedOrder.userId, matchedOrder.scanId, matchedOrder.id, 'premium');
      }

      // Notify user
      const notifId = 'notif_' + crypto.randomUUID();
      db.notifications.set(notifId, {
        id: notifId,
        userId: matchedOrder.userId,
        title: 'Payment Confirmed',
        message: `Your payment of $${matchedOrder.amount.toFixed(2)} USD for order ${matchedOrder.orderReference} was verified. Deep Forensic report unlocked.`,
        type: 'payment_confirmed',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      db.logAudit({
        userId: matchedOrder.userId,
        action: 'PAYMENT_VERIFIED_AND_UNLOCKED',
        resourceType: 'payment_order',
        resourceId: matchedOrder.id,
        details: { reference: matchedOrder.orderReference, amount: matchedOrder.amount },
      });
    }

    return {
      success: matchedOrder.status === 'paid',
      message: matchedOrder.status === 'paid' ? 'Payment verified and report unlocked.' : 'Payment marked failed.',
      orderId: matchedOrder.id,
    };
  }

  private unlockReport(userId: string, scanId: string, orderId: string, reportType: 'free' | 'premium') {
    const scan = db.scans.get(scanId);
    const reportId = 'rep_' + crypto.randomUUID();
    const title = `${reportType === 'premium' ? 'Deep Forensic Threat' : 'Exposure Summary'} Report: ${scan?.targetValue || 'Scan Target'}`;

    const report: ReportRecord = {
      id: reportId,
      userId,
      scanId,
      orderId,
      reportType,
      title,
      isUnlocked: true,
      unlockedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.reports.set(reportId, report);
  }

  public getUserOrders(userId: string): PaymentOrder[] {
    const orders: PaymentOrder[] = [];
    for (const order of db.paymentOrders.values()) {
      if (order.userId === userId) {
        orders.push(order);
      }
    }
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllOrders(): PaymentOrder[] {
    return Array.from(db.paymentOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const paymentService = new PaymentService();
