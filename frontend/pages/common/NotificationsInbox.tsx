import React, { useEffect, useState } from 'react';
import { notificationService } from '../../services/api';
import { Notification } from '../../types';

const NotificationsInbox: React.FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setItems(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: number | string) => {
    try {
      await notificationService.markRead(String(id));
      setItems((s) => s.map((it) => (it.id === String(id) ? { ...it, is_read: true } : it)));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Notifications</h2>
      {items.length === 0 && <p>No notifications</p>}
      <ul>
        {items.map((n) => (
          <li key={n.id} className={`p-3 mb-2 rounded border ${n.is_read ? 'bg-white' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-slate-600">{n.message}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="mt-2 text-sm text-primary">Mark read</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsInbox;
