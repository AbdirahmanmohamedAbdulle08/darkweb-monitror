export interface PaymentIntentRequest {
  orderReference: string;
  amount: number;
  currency: string;
  customerPhone?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  success: boolean;
  orderReference: string;
  providerReference?: string;
  status: 'pending' | 'paid' | 'failed' | 'setup_required';
  message: string;
  checkoutUrl?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  orderReference?: string;
  amount?: number;
  currency?: string;
  status?: 'paid' | 'failed';
  providerReference?: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  method: 'evc_plus' | 'waafi' | 'card';
  category: 'local' | 'card';
  isConfigured(): boolean;
  initiatePayment(request: PaymentIntentRequest): Promise<PaymentIntentResult>;
  verifyWebhook(payload: Record<string, unknown>, signature?: string): Promise<WebhookVerificationResult>;
}
