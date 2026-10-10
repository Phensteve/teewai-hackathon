import { useState } from 'react';
import { CalendarPlus, Check, Bell } from 'lucide-react';
import { downloadTeewaiCalendarReminder } from '@/lib/calendarReminder';

// A compact card that lets the user add a daily recurring "Teewai Smile Scan"
// to their phone's calendar via a one-tap .ics download. The user picks a
// time (default 8:00 AM), taps "Add to calendar", and the phone's calendar
// app opens with the event pre-filled — they just confirm "Add".
export default function CalendarReminderCard() {
  const [time, setTime] = useState('08:00');
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const [h, m] = time.split(':').map(Number);
    downloadTeewaiCalendarReminder(h, m);
    setAdded(true);
    setTimeout(() => setAdded(false), 4000);
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors">
      <div className="flex items-center gap-3">
        <span className="icon-tool">
          <CalendarPlus />
        </span>
        <div className="flex-1">
          <p className="text-caption font-heading font-600">Daily scan reminder</p>
          <p className="text-caption text-muted-foreground">
            Add a daily scan to your phone's calendar.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:border-olo"
          aria-label="Reminder time"
        />
        <button
          onClick={handleAdd}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-olo text-white text-xs font-semibold hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {added ? (
            <>
              <Check className="w-3.5 h-3.5" /> Added — check your calendar
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5" /> Add to calendar
            </>
          )}
        </button>
      </div>
    </div>
  );
}