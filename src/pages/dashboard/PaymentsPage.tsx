import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, ShoppingBag, CheckCircle, Clock, AlertCircle, Smartphone, ExternalLink, Shield } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import type { PaymentOrder, PricingPlan } from '../../types/index.ts';

export function PaymentsPage() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(searchParams.get('action') === 'order');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_deep_01');
  const [paymentCategory, setPaymentCategory] = useState<'local' | 'card'>('local');
  const [paymentMethod, setPaymentMethod] = useState<'evc_plus' | 'waafi' | 'card'>('evc_plus');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<{
    success: boolean;
    message: string;
    status?: string;
  } | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    Promise.all([api.getMyOrders(), api.getPricingPlans()])
      .then(([ordersRes, plansRes]) => {
        setOrders(ordersRes.orders || []);
        setPlans(plansRes.plans || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStatus(null);
    setSubmitting(true);

    try {
      const res = await api.createPaymentOrder({
        planId: selectedPlanId,
        paymentCategory,
        paymentMethod,
        customerPhone: paymentCategory === 'local' ? phone : undefined,
      });

      setCheckoutStatus({
        success: res.success,
        message: res.message,
        status: res.order.status,
      });
      fetchOrders();
    } catch (err: unknown) {
      setCheckoutStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Order creation failed.',
        status: 'failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Billing & Payment Invoices</h1>
            <p className="text-xs text-[#94A3B8]">
              Manage report orders, subscription entitlements, and verified transaction receipts.
            </p>
          </div>

          <button
            onClick={() => setShowCheckout(true)}
            className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>New Payment Checkout</span>
          </button>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">Loading transaction records...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-[#64748B] mx-auto" />
              <div className="text-sm font-semibold text-[#F8FAFC]">No Payment Records Found</div>
              <p className="text-xs text-[#94A3B8]">
                You have not placed any orders yet. Purchase a Deep Forensic Report to unlock full unmasked findings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#94A3B8]">
                <thead className="bg-[#080D18] border-b border-[#263449] text-[11px] font-semibold uppercase text-[#94A3B8]">
                  <tr>
                    <th className="px-5 py-3">Order Reference</th>
                    <th className="px-5 py-3">Payment Method</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Transaction Status</th>
                    <th className="px-5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/50">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-[#172235]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC]">
                        {o.orderReference}
                      </td>
                      <td className="px-5 py-3.5 capitalize">
                        {o.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#F8FAFC]">
                        ${o.amount.toFixed(2)} {o.currency}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            o.status === 'paid'
                              ? 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10'
                              : o.status === 'pending'
                              ? 'text-[#00D4FF] border-[#00D4FF]/30 bg-[#00D4FF]/10'
                              : o.status === 'setup_required'
                              ? 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10'
                              : 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10'
                          }`}
                        >
                          {o.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{o.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[11px]">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Checkout Modal */}
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#111827] border border-[#263449] rounded-xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#263449] pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#00D4FF]" />
                  <h3 className="text-sm font-bold text-[#F8FAFC]">DarkWatch Payment Gateway Checkout</h3>
                </div>
                <button onClick={() => setShowCheckout(false)} className="text-[#94A3B8] hover:text-[#F8FAFC]">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                {/* Select Plan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#94A3B8]">Select Product / Entitlement</label>
                  <div className="space-y-2">
                    {plans.map(p => (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPlanId === p.id
                            ? 'bg-[#172235] border-[#00D4FF]'
                            : 'bg-[#080D18] border-[#263449]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="plan"
                            checked={selectedPlanId === p.id}
                            onChange={() => setSelectedPlanId(p.id)}
                            className="text-[#00D4FF] focus:ring-0"
                          />
                          <div>
                            <div className="text-xs font-bold text-[#F8FAFC]">{p.name}</div>
                            <div className="text-[10px] text-[#94A3B8]">{p.description}</div>
                          </div>
                        </div>
                        <div className="text-xs font-mono font-bold text-[#00D4FF] shrink-0">
                          ${p.amount.toFixed(2)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment Category & Method */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#94A3B8]">Payment Gateway Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentCategory('local');
                        setPaymentMethod('evc_plus');
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                        paymentMethod === 'evc_plus'
                          ? 'bg-[#172235] border-[#00D4FF] text-[#00D4FF]'
                          : 'bg-[#080D18] border-[#263449] text-[#94A3B8]'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>EVC Plus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentCategory('local');
                        setPaymentMethod('waafi');
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                        paymentMethod === 'waafi'
                          ? 'bg-[#172235] border-[#00D4FF] text-[#00D4FF]'
                          : 'bg-[#080D18] border-[#263449] text-[#94A3B8]'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Waafi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentCategory('card');
                        setPaymentMethod('card');
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                        paymentMethod === 'card'
                          ? 'bg-[#172235] border-[#00D4FF] text-[#00D4FF]'
                          : 'bg-[#080D18] border-[#263449] text-[#94A3B8]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Card (Visa/MC)</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Money Phone Input if Local */}
                {paymentCategory === 'local' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#94A3B8]">
                      Mobile Money Number (e.g. +25261XXXXXXX)
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+252615000000"
                      className="w-full bg-[#080D18] border border-[#263449] rounded p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#00D4FF]"
                    />
                  </div>
                )}

                {/* Status Response Feedback */}
                {checkoutStatus && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      checkoutStatus.success
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                        : checkoutStatus.status === 'setup_required'
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                        : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {checkoutStatus.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span>
                        {checkoutStatus.status === 'setup_required'
                          ? 'Payment Provider Setup Required'
                          : checkoutStatus.success
                          ? 'Order Initialized'
                          : 'Payment Error'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{checkoutStatus.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#263449]">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="px-4 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#00D4FF] hover:bg-[#00b8de] text-[#080D18] font-semibold text-xs rounded transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Contacting Provider...' : 'Proceed to Checkout'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
