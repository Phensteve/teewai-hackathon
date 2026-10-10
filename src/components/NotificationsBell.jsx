import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Gift, Info, AlertCircle, CheckCheck } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';

export default function NotificationsBell({ side = 'left' }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    try {
      // Gift notifications are written to the Base44 Notification entity by the
      // admin grantScans flow — read them from there (RLS scopes to the user via
      // user_id). The InsForge notifications table is unused for this.
      const list = await unrufld.entities.Notification.list('-created_date', 20);
      setNotifications(list || []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadList = notifications.filter((n) => !n.read);
    if (!unreadList.length) return;
    setMarking(true);
    try {
      for (const n of unreadList) {
        await unrufld.entities.Notification.update(n.id, { read: true });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {} finally {
      setMarking(false);
    }
  };

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) setTimeout(markAllRead, 1500);
  };

  const accentFor = (type) => (type === 'gift' ? 'text-olo bg-olo/10' : type === 'warning' ? 'text-amber-500 bg-amber-500/10' : 'text-sky-500 bg-sky-500/10');
  const iconFor = (type) => (type === 'gift' ? Gift : type === 'warning' ? AlertCircle : Info);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-olo text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute ${side === 'right' ? 'left-full top-0 ml-2' : 'right-0 top-full mt-2'} w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden origin-top`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-heading font-600 text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-olo" /> Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} disabled={marking} className="text-xs text-olo hover:underline disabled:opacity-50">
                {marking ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-6 h-6 text-olo" />
                </div>
                <p className="text-sm text-muted-foreground">You're all caught up</p>
                <p className="text-xs text-muted-foreground/60 mt-1">New rewards and updates will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = iconFor(n.type);
                return (
                  <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-border last:border-0 transition-colors ${!n.read ? 'bg-olo/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentFor(n.type)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {n.created_date ? new Date(n.created_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-olo flex-shrink-0 mt-2" />}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}