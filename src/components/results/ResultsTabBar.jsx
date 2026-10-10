import { motion } from 'framer-motion';
import { Gauge, Smile, HeartPulse, ClipboardList, Stethoscope } from 'lucide-react';

const BASE_TABS = [
  { key: 'overview', label: 'Overview', short: 'Overview', icon: Gauge, desc: 'Summary & scores' },
  { key: 'smile', label: 'Your Smile', short: 'Smile', icon: Smile, desc: 'Shade & whitening' },
  { key: 'health', label: 'Health', short: 'Health', icon: HeartPulse, desc: 'Gums & enamel' },
  { key: 'plan', label: 'Your Plan', short: 'Plan', icon: ClipboardList, desc: 'Habits & products' },
];

const EXAM_TAB = { key: 'exam', label: 'Full Exam', short: 'Exam', icon: Stethoscope, desc: 'All 5 angles, zone by zone' };

export default function ResultsTabBar({ tab: rawTab, setTab, vertical = false, isFull = false }) {
  const TABS = isFull ? [EXAM_TAB, ...BASE_TABS] : BASE_TABS;
  // Quick scans have no exam tab, so 'exam' falls back to Overview.
  const tab = !isFull && rawTab === 'exam' ? 'overview' : rawTab;
  if (vertical) {
    return (
      <nav className="glass-light rounded-3xl p-3 flex flex-col gap-1 sticky top-4">
        <div className="px-3 py-2 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sections</p>
        </div>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 rounded-2xl text-left transition-colors flex items-center gap-3 ${
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="results-tab-pill-v"
                  className="absolute inset-0 rounded-2xl bg-olo olo-glow -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">{t.label}</span>
                <span className={`text-[11px] leading-tight mt-0.5 ${active ? 'text-white/70' : 'text-muted-foreground/70'}`}>{t.desc}</span>
              </div>
            </button>
          );
        })}
      </nav>
    );
  }

  // Mobile inline sticky tab bar — sits inline at the top of the content
  // column and sticks below the app's top bar on scroll. Obvious, always
  // reachable, and never overlaps content (unlike a floating dock).
  return (
    <div className="md:hidden sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-30 mb-4">
      <div className="flex gap-1 bg-muted/80 backdrop-blur-md rounded-2xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="results-tab-pill"
                  className="absolute inset-0 rounded-xl bg-olo olo-glow -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className={isFull && !active ? 'hidden min-[420px]:inline' : ''}>{t.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}