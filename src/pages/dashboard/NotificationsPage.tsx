import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Shield, Check } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import type { NotificationItem } from '../../types/index.ts';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    setLoading(true);
    api
      .getNotifications()
      .then(res => setNotifications(res.notifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Security Alerts & Notifications</h1>
            <p className="text-xs text-[#94A3B8]">
              Automated surveillance alerts, scan completions, and payment confirmations.
            </p>
          </div>

          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-1.5 bg-[#172235] hover:bg-[#202f47] text-[#00D4FF] border border-[#263449] font-medium text-xs rounded transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="bg-[#111827] border border-[#263449] rounded-xl overflow-hidden divide-y divide-[#263449]/50">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">Loading notification alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8] space-y-2">
              <Bell className="w-8 h-8 text-[#64748B] mx-auto" />
              <div>No alerts in your feed.</div>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  n.isRead ? 'opacity-70 bg-[#080D18]' : 'bg-[#111827]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-[#172235] border border-[#263449] text-[#00D4FF] mt-0.5">
                    {n.type === 'exposure_found' ? (
                      <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#F8FAFC]">{n.title}</div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{n.message}</p>
                    <div className="text-[10px] text-[#64748B] font-mono">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-[11px] text-[#00D4FF] hover:underline shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
