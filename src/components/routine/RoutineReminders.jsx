import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Sun, Moon, Flame } from 'lucide-react';

// Gentle client-side routine reminders: one morning (8am) + one evening (8pm).
// Uses the browser Notification API + a 30s interval checker that fires only
// when the app is open. No backend, no nagging — a single nudge per window,
// once per day. The user's scan streak is shown alongside so the reminder
// ties to their consistency progress.
//
// Permission + enabled state persist in localStorage so it survives reloads.
const STORAGE_KEY = 'teewai_routine_reminders';
const MORNING_HOUR = 8;
const EVENING_HOUR = 20;

export default function RoutineReminders({ streak = 0 }) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const lastFiredRef = useRef({}); // { '2026-10-03-8': true }

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  // Schedule checker — runs every 30s while the app is open.
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;
    const check = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour !== MORNING_HOUR && hour !== EVENING_HOUR) return;
      const key = `${now.toISOString().slice(0, 10)}-${hour}`;
      if (lastFiredRef.current[key]) return;
      lastFiredRef.current[key] = true;
      const isMorning = hour === MORNING_HOUR;
      new Notification(isMorning ? 'Good morning ☀️' : 'Good evening 🌙', {
        body: isMorning
          ? 'Time for your morning smile routine. 2 minutes is all it takes.'
          : "Don't forget your evening routine — floss, then brush before bed.",
        tag: `routine-${isMorning ? 'am' : 'pm'}`,
      });
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [enabled, permission]);

  const handleToggle = async () => {
    if (enabled) {
      setEnabled(false);
      try { localStorage.setItem(STORAGE_KEY, '0'); } catch {}
      return;
    }
    // Turning on — request permission if needed
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
    } else if (Notification.permission !== 'granted') {
      return;
    }
    setEnabled(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  const denied = permission === 'denied';

  return (
    <div className="mb-6 p-4 rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-olo/10' : 'bg-muted'}`}>
            {enabled ? <Bell className="w-5 h-5 text-olo" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-600 text-sm">Routine reminders</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {denied
                ? 'Notifications are blocked. Enable them in your browser settings to get gentle nudges.'
                : enabled
                  ? 'One gentle nudge in the morning, one in the evening. No nagging.'
                  : 'Get a gentle nudge twice a day — morning and evening — so your routine sticks.'}
            </p>
            {enabled && (
              <div className="flex flex-wrap gap-2 mt-2.5 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-olo/8 text-olo font-medium">
                  <Sun className="w-3 h-3" /> 8:00 AM
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-olo/8 text-olo font-medium">
                  <Moon className="w-3 h-3" /> 8:00 PM
                </span>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                    <Flame className="w-3 h-3" /> {streak}-day streak
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={denied}
          className={`flex-shrink-0 relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-olo' : 'bg-muted'} ${denied ? 'opacity-40 cursor-not-allowed' : ''}`}
          aria-label={enabled ? 'Disable reminders' : 'Enable reminders'}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
    </div>
  );
}