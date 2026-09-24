import { Notification } from '@/types';
import { Bell } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 transition ${
        notification.isRead ? 'border-slate-100 bg-white' : 'border-amber-200 bg-amber-50'
      }`}
      onClick={() => !notification.isRead && onRead?.(notification._id)}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        notification.isRead ? 'bg-slate-100' : 'bg-amber-100'
      }`}>
        <Bell className={`h-5 w-5 ${notification.isRead ? 'text-slate-400' : 'text-amber-600'}`} />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-slate-900">{notification.title}</h4>
        <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>
        <p className="mt-1 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
      </div>
      {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
    </div>
  );
}
