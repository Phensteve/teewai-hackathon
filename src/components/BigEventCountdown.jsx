import { useEffect, useMemo, useState } from 'react';
import { Calendar, Target, Plus, X, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'teewai_big_event';

// Big-Event countdown — anchors the daily routine to a real upcoming moment.
// Users pick a target (wedding, photo day, reunion) and get a daily whitening roadmap.
export default function BigEventCountdown() {
  const [event, setEvent] = useState(null);
  const [draft, setDraft] = useState({ name: '', date: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEvent(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (e) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(e));
    setEvent(e);
  };
  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEvent(null);
    setDraft({ name: '', date: '' });
  };

  const { daysLeft, milestones } = useMemo(() => {
    if (!event) return { daysLeft: 0, milestones: [] };
    const diff = Math.ceil((new Date(event.date) - new Date()) / 86400000);
    const days = Math.max(0, diff);
    const tasks = [];
    if (days >= 21) tasks.push({ at: days - 21, label: 'Start whitening strips/kit', done: days < days - 21 + 1 });
    if (days >= 14) tasks.push({ at: days - 14, label: 'Daily scan + shade log', done: days < days - 14 + 1 });
    if (days >= 7) tasks.push({ at: days - 7, label: 'Cut back on coffee/tea/wine', done: days < days - 7 + 1 });
    if (days >= 3) tasks.push({ at: days - 3, label: 'Switch to whitening toothpaste', done: days < days - 3 + 1 });
    tasks.push({ at: 1, label: 'Final scan + smile check', done: days <= 1 });
    return { daysLeft: days, milestones: tasks };
  }, [event]);

  if (!event) {
    return (
      <div className="p-5 sm:p-6 rounded-3xl border border-dashed border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-olo" />
          <h3 className="font-heading font-600 text-lg">Got a big day coming?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Lock in a target — wedding, photo shoot, reunion — and teewai builds a daily whitening roadmap to it.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Event name"
            className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-olo focus:outline-none"
          />
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-olo focus:outline-none"
          />
          <button
            onClick={() => draft.name && draft.date && save(draft)}
            disabled={!draft.name || !draft.date}
            className="inline-flex items-center justify-center gap-1.5 bg-olo text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow disabled:opacity-40 disabled:hover:scale-100"
          >
            <Plus className="w-4 h-4" /> Set goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-olo/20 bg-card relative overflow-hidden">
      <div className="absolute inset-0 radial-olo opacity-30 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-olo" />
            <h3 className="font-heading font-600 text-lg">{event.name}</h3>
          </div>
          <button onClick={clear} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-end gap-3 mb-5">
          <p className="text-4xl font-heading font-800 text-olo olo-text-glow">{daysLeft}</p>
          <p className="text-muted-foreground text-sm mb-1">day{daysLeft !== 1 ? 's' : ''} to go</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Whitening roadmap</p>
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${m.done ? 'text-olo' : 'text-muted-foreground/40'}`} />
              <span className={`text-sm ${m.done ? 'text-foreground line-through opacity-60' : 'text-foreground'}`}>
                {m.label}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{m.at <= 0 ? 'today' : `T-${m.at}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}