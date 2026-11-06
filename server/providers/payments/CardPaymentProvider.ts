import crypto from 'crypto';
import type { PaymentProvider, PaymentIntentRequest, PaymentIntentResult, WebhookVerificationResult } from './PaymentProvider.ts';

export class CardPaymentProvider implements PaymentProvider {
  public name = 'International Card Gateway';
  public method: 'card' = 'card';
  public category: 'card' = 'card';

  public isConfigured(): boolean {
    return Boolean(process.env.CARD_PAYMENT_SECRET_KEY && process.env.CARD_PAYMENT_SECRET_KEY.trim().length > 0);
  }

  public async initiatePayment(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        orderReference: request.orderReference,
        status: 'setup_required',
        message: 'Payment provider setup required. Card payment secret credentials have not been configured on the server.',
      };
    }

    try {
      const secretKey = process.env.CARD_PAYMENT_SECRET_KEY!;
      const endpoint = process.env.CARD_PAYMENT_GATEWAY_URL || 'https://api.stripe.com/v1/checkout/sessions';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'mode': 'payment',
          'client_reference_id': request.orderReference,
          'line_items[0][price_data][currency]': request.currency.toLowerCase(),
          'line_items[0][price_data][unit_amount]': String(Math.round(request.amount * 100)),
          'line_items[0][price_data][product_data][name]': 'DarkWatch Threat Report',
          'line_items[0][quantity]': '1',
          'success_url': `${process.env.APP_URL || ''}/dashboard/reports?order=${request.orderReference}&status=success`,
          'cancel_url': `${process.env.APP_URL || ''}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          orderReference: request.orderReference,
          status: 'failed',
          message: `Card gateway returned error: ${response.status}`,
        };
      }

      const session = await response.json();
      return {
        success: true,
        orderReference: request.orderReference,
        providerReference: session.id,
        status: 'pending',
        message: 'Checkout session created successfully.',
        checkoutUrl: session.url,
      };
    } catch (err: unknown) {
      return {
        success: false,
        orderReference: request.orderReference,
        status: 'failed',
        message: `Connection error with card payment gateway: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async verifyWebhook(payload: Record<string, unknown>, signature?: string): Promise<WebhookVerificationResult> {
    const webhookSecret = process.env.CARD_PAYMENT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return {
        isValid: false,
        error: 'Card webhook secret is not configured on the server.',
      };
    }

    if (!signature) {
      return {
        isValid: false,
        error: 'Missing webhook signature header.',
      };
    }

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

    const event = payload as {
      type?: string;
      data?: {
        object?: {
          client_reference_id?: string;
          amount_total?: number;
          currency?: string;
          payment_status?: string;
          id?: string;
        };
      };
    };

    const session = event.data?.object;
    if (!session || !session.client_reference_id) {
      return {
        isValid: false,
        error: 'Webhook payload missing client_reference_id.',
      };
    }

    return {
      isValid: true,
      orderReference: session.client_reference_id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency?.toUpperCase() || 'USD',
      status: session.payment_status === 'paid' ? 'paid' : 'failed',
      providerReference: session.id,
    };
  }
}
