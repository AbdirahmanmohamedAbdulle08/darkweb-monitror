import crypto from 'crypto';
import type { PaymentProvider, PaymentIntentRequest, PaymentIntentResult, WebhookVerificationResult } from './PaymentProvider.ts';

export class LocalPaymentProvider implements PaymentProvider {
  public name: string;
  public method: 'evc_plus' | 'waafi';
  public category: 'local' = 'local';

  constructor(method: 'evc_plus' | 'waafi') {
    this.method = method;
    this.name = method === 'evc_plus' ? 'EVC Plus Mobile Money' : 'Waafi Mobile Money';
  }

  public isConfigured(): boolean {
    return Boolean(process.env.LOCAL_PAYMENT_API_KEY && process.env.LOCAL_PAYMENT_API_KEY.trim().length > 0);
  }

  public async initiatePayment(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        orderReference: request.orderReference,
        status: 'setup_required',
        message: `Payment provider setup required. Merchant API credentials for ${this.name} have not been configured on the server.`,
      };
    }

    if (!request.customerPhone) {
      return {
        success: false,
        orderReference: request.orderReference,
        status: 'failed',
        message: `A valid mobile phone number is required for ${this.name} checkout.`,
      };
    }

    // When configured with real merchant credentials, call the verified merchant gateway
    try {
      const apiKey = process.env.LOCAL_PAYMENT_API_KEY!;
      const endpoint = process.env.LOCAL_PAYMENT_GATEWAY_URL || 'https://api.paymentgateway.local/v1/charge';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: this.method,
          reference: request.orderReference,
          amount: request.amount,
          currency: request.currency,
          phone: request.customerPhone,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          orderReference: request.orderReference,
          status: 'failed',
          message: `Gateway responded with error status: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        orderReference: request.orderReference,
        providerReference: data.transactionId || `loc_${Date.now()}`,
        status: 'pending',
        message: `Payment request dispatched to ${request.customerPhone}. Please approve prompt on your mobile device.`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        orderReference: request.orderReference,
        status: 'failed',
        message: `Connection error with ${this.name} gateway: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async verifyWebhook(payload: Record<string, unknown>, signature?: string): Promise<WebhookVerificationResult> {
    const webhookSecret = process.env.LOCAL_PAYMENT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return {
        isValid: false,
        error: 'Payment webhook secret is not configured on the server.',
      };
    }

    if (!signature) {
      return {
        isValid: false,
        error: 'Missing webhook signature header.',
      };
    }

    // Verify HMAC SHA256 signature
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (computedSignature !== signature) {
      return {
        isValid: false,
        error: 'Invalid webhook signature. Request rejected.',
      };
    }

    const orderRef = String(payload.orderReference || payload.reference || '');
    const amount = Number(payload.amount);
    const currency = String(payload.currency || 'USD');
    const status = payload.status === 'SUCCESS' || payload.status === 'PAID' ? 'paid' : 'failed';

    return {
      isValid: true,
      orderReference: orderRef,
      amount,
      currency,
      status,
      providerReference: String(payload.transactionId || payload.providerReference || ''),
    };
  }
}
