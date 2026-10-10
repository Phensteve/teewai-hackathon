import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { scans as insforgeScans } from '@/lib/insforgeDb';
import BackButton from '@/components/BackButton';
import Spinner from '@/components/Spinner';
import { CalendarHeart, Plus, Trash2, Check, Target, Flag, ArrowRight } from 'lucide-react';

// Pre-event confidence track (behavioral moat). A user picks an upcoming
// event (wedding, interview, date…), sets a target shade, and gets a daily
// progressive habit checklist + countdown to build confidence toward the
// big day. Daily habit completion is stored in localStorage (per goal, per
// day) — no backend round-trip needed for the daily loop.

const EVENT_TYPES = [
  { key: 'wedding', label: 'Wedding', emoji: '💍' },
  { key: 'interview', label: 'Job interview', emoji: '💼' },
  { key: 'date', label: 'First date', emoji: '❤️' },
  { key: 'photoshoot', label: 'Photoshoot', emoji: '📸' },
  { key: 'graduation', label: 'Graduation', emoji: '🎓' },
  { key: 'reunion', label: 'Reunion', emoji: '🥂' },
  { key: 'other', label: 'Other', emoji: '✨' },
];

const DAILY_HABITS = [
  { id: 'brush_am', label: 'Morning brush (2 min)', impact: 'Removes overnight plaque' },
  { id: 'brush_pm', label: 'Night brush (2 min)', impact: 'Stops overnight staining' },
  { id: 'floss', label: 'Floss', impact: 'Cleans between teeth' },
  { id: 'rinse', label: 'Rinse with water after coffee/tea', impact: 'Cuts chromogen adhesion' },
  { id: 'water', label: 'Drink 6+ glasses of water', impact: 'Washes away stain particles' },
  { id: 'avoid', label: 'Skip one staining drink today', impact: 'Lowers your daily stain load' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const loadChecklist = (goalId) => {
  try { return JSON.parse(localStorage.getItem(`teewai_goal_${goalId}_${todayStr()}`) || '{}'); }
  catch { return {}; }
};
const saveChecklist = (goalId, state) => {
  localStorage.setItem(`teewai_goal_${goalId}_${todayStr()}`, JSON.stringify(state));
};

export default function SmileGoal() {
  const [goals, setGoals] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ event_name: '', event_type: 'wedding', event_date: '', target_shade: '' });
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [g, scans] = await Promise.all([
        unrufld.entities.SmileGoal.filter({}, '-created_date', 50).catch(() => []),
        insforgeScans.list('-created_date', 1).catch(() => []),
      ]);
      setGoals(g);
      setLatest(scans[0] || null);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const today = todayStr();
  const active = goals.find((g) => !g.completed && new Date(g.event_date) >= new Date(today));
  const past = goals.filter((g) => g.completed || new Date(g.event_date) < new Date(today));

  useEffect(() => {
    setChecklist(active ? loadChecklist(active.id) : {});
  }, [active?.id, today]);

  const createGoal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const suggestion = latest?.shade ? `Brighter than ${latest.shade}` : '';
      await unrufld.entities.SmileGoal.create({
        event_name: form.event_name,
        event_type: form.event_type,
        event_date: form.event_date,
        target_shade: form.target_shade || suggestion,
      });
      setForm({ event_name: '', event_type: 'wedding', event_date: '', target_shade: '' });
      setShowForm(false);
      await load();
    } catch {} finally { setSaving(false); }
  };

  const toggleHabit = (id) => {
    const next = { ...checklist, [id]: !checklist[id] };
    setChecklist(next);
    if (active) saveChecklist(active.id, next);
  };

  const completeGoal = async (g) => {
    await unrufld.entities.SmileGoal.update(g.id, { completed: true }).catch(() => {});
    await load();
  };
  const removeGoal = async (g) => {
    await unrufld.entities.SmileGoal.delete(g.id).catch(() => {});
    await load();
  };

  const daysTo = (d) => Math.ceil((new Date(d) - new Date(today)) / 86400000);
  const doneCount = Object.values(checklist).filter(Boolean).length;
  const pct = Math.round((doneCount / DAILY_HABITS.length) * 100);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackButton fallback="/dashboard" className="mb-4" />
        <div className="mt-10 flex justify-center"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/dashboard" className="mb-4" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <CalendarHeart className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Smile goal</h1>
          <p className="text-sm text-muted-foreground">Pre-event confidence track — hit your shade by the big day.</p>
        </div>
      </div>

      {active ? (
        <div className="space-y-4">
          {/* Countdown hero */}
          <div className="p-5 rounded-3xl bg-olo-deep text-white relative overflow-hidden">
            <div className="absolute inset-0 radial-olo opacity-40" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider">{EVENT_TYPES.find((t) => t.key === active.event_type)?.emoji} {EVENT_TYPES.find((t) => t.key === active.event_type)?.label}</p>
                <h2 className="font-heading font-700 text-xl mt-0.5">{active.event_name}</h2>
                <p className="text-sm text-white/70 mt-1">{new Date(active.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <p className="font-heading font-800 text-4xl text-olo leading-none">{daysTo(active.event_date)}</p>
                <p className="text-xs text-white/60 mt-1">days to go</p>
              </div>
            </div>
          </div>

          {/* Current vs target */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current shade</p>
              <p className="font-heading font-700 text-lg text-olo mt-1">{latest?.shade || 'No scan yet'}</p>
              {latest?.score != null && <p className="text-xs text-muted-foreground">{latest.score}/100 whiteness</p>}
            </div>
            <div className="p-4 rounded-2xl border border-olo/20 bg-olo/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Target className="w-3 h-3" /> Target</p>
              <p className="font-heading font-700 text-lg text-olo mt-1">{active.target_shade || 'Brighter'}</p>
              <p className="text-xs text-muted-foreground">Stick to the daily plan</p>
            </div>
          </div>

          {/* Daily habit checklist */}
          <div className="p-5 rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-600 text-sm">Today's plan</h3>
              <span className="text-xs font-medium text-olo">{doneCount}/{DAILY_HABITS.length} done</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
              <div className="h-full rounded-full bg-olo transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {DAILY_HABITS.map((h) => {
                const done = !!checklist[h.id];
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabit(h.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${done ? 'border-olo bg-olo/10' : 'border-border bg-background hover:border-olo/40'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${done ? 'bg-olo' : 'border border-border'}`}>
                      {done && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`text-sm font-medium block ${done ? 'text-olo' : 'text-foreground'}`}>{h.label}</span>
                      <span className="text-xs text-muted-foreground">{h.impact}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {pct === 100 && (
              <p className="mt-3 text-xs text-center text-olo font-medium">Perfect day — your smile thanks you. ✨</p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => completeGoal(active)} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              <Flag className="w-4 h-4" /> I hit my goal
            </button>
            <button onClick={() => removeGoal(active)} className="inline-flex items-center justify-center gap-2 border border-border text-muted-foreground text-sm font-medium py-2.5 px-3 rounded-xl hover:text-rose-500 hover:border-rose-500/30 transition-colors">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={createGoal} className="p-5 rounded-3xl border border-border bg-card space-y-4">
          <h2 className="font-heading font-600 text-lg">Set your smile goal</h2>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Event name</label>
            <input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} required placeholder="e.g. Tunde's wedding"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Event type</label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {EVENT_TYPES.map((t) => (
                <button key={t.key} type="button" onClick={() => setForm({ ...form, event_type: t.key })}
                  className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${form.event_type === t.key ? 'bg-olo text-white' : 'bg-background border border-border text-muted-foreground hover:border-olo/40'}`}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Event date</label>
            <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required min={today}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Target shade (optional)</label>
            <input value={form.target_shade} onChange={(e) => setForm({ ...form, target_shade: e.target.value })} placeholder={latest?.shade ? `Brighter than ${latest.shade}` : 'e.g. A1'}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            <p className="text-xs text-muted-foreground">We'll compare this to your latest scan shade.</p>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50">
              {saving ? <Spinner size={16} /> : <Plus className="w-4 h-4" />} Start tracking
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-border text-muted-foreground text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-muted/50 transition-colors">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="text-center py-14 p-8 rounded-3xl border border-border bg-card">
          <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4"><CalendarHeart className="w-7 h-7 text-olo" /></div>
          <h3 className="font-heading font-600 text-lg mb-1">No active goal</h3>
          <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">Got a wedding, interview, or big day coming up? Set a date and get a daily plan to hit your shade.</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow">
            <Plus className="w-4 h-4" /> Set your smile goal
          </button>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <h3 className="font-heading font-600 text-sm text-muted-foreground mb-3">Past goals</h3>
          <div className="space-y-2">
            {past.map((g) => (
              <div key={g.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
                <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center text-sm">{EVENT_TYPES.find((t) => t.key === g.event_type)?.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.event_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(g.event_date).toLocaleDateString()}{g.completed ? ' · Completed' : ''}</p>
                </div>
                <button onClick={() => removeGoal(g)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!active && !showForm && (
        <div className="mt-8 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-center">
          A daily habit loop, not a guarantee. Real results depend on your hygiene, enamel, and consistency.
        </div>
      )}
    </div>
  );
}