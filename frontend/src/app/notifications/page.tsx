'use client';

import { useCallback, useEffect, useState } from 'react';
import NotificationItem from '@/components/Notification';
import { notificationService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { joinUserRoom, leaveUserRoom, onNotification } from '@/lib/socket';
import { Notification } from '@/types';
import { Loader2 } from 'lucide-react';

const TYPE_FILTERS = ['all', 'ride', 'payment', 'promotional', 'system'];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const { data } = await notificationService.getNotifications(params);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    joinUserRoom(user.id);
    const unsub = onNotification((payload) => {
      setNotifications((prev) => [{
        _id: payload.id,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        isRead: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    return () => { leaveUserRoom(user.id); unsub?.(); };
  }, [user?.id]);

  const markRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotif = async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-amber-600">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-amber-600 hover:underline">Mark all read</button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === f ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n._id} className="group relative">
            <NotificationItem notification={n} onRead={markRead} />
            <button onClick={() => deleteNotif(n._id)}
              className="absolute right-3 top-3 hidden text-xs text-red-500 group-hover:block">Delete</button>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-center text-slate-500">No notifications</p>}
      </div>
    </div>
  );
}
