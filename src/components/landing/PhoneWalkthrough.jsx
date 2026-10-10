import { useState, useEffect } from 'react';
import PhoneFrame from '@/components/landing/PhoneFrame';
import DashboardSnapshot from '@/components/landing/snapshots/DashboardSnapshot';
import ScanSnapshot from '@/components/landing/snapshots/ScanSnapshot';
import ResultsSnapshot from '@/components/landing/snapshots/ResultsSnapshot';
import MyScansSnapshot from '@/components/landing/snapshots/MyScansSnapshot';
import LeaderboardSnapshot from '@/components/landing/snapshots/LeaderboardSnapshot';
import SubscriptionSnapshot from '@/components/landing/snapshots/SubscriptionSnapshot';
import ProfileSnapshot from '@/components/landing/snapshots/ProfileSnapshot';

const SCREENS = [
  { label: 'Dashboard', Component: DashboardSnapshot },
  { label: 'Scan', Component: ScanSnapshot },
  { label: 'Results', Component: ResultsSnapshot },
  { label: 'My Scans', Component: MyScansSnapshot },
  { label: 'Rank', Component: LeaderboardSnapshot },
  { label: 'Plan', Component: SubscriptionSnapshot },
  { label: 'Profile', Component: ProfileSnapshot },
];

const SCREEN_DURATION = 2800;

export default function PhoneWalkthrough() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => (prev + 1) % SCREENS.length);
    }, SCREEN_DURATION);
    return () => clearInterval(id);
  }, []);

  const { label, Component } = SCREENS[idx];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[280px] rounded-[2.4rem] border-[3px] border-foreground/15 bg-foreground p-1.5 shadow-2xl shadow-olo/20 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground rounded-b-xl z-30" />
        <div className="relative rounded-[1.8rem] overflow-hidden bg-background aspect-[9/19.5]">
          {SCREENS.map(({ Component: C, label: l }, i) => (
            <div
              key={l}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: i === idx ? 1 : 0, pointerEvents: i === idx ? 'auto' : 'none' }}
            >
              <C />
            </div>
          ))}
        </div>
      </div>
      {/* Progress dots + label */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs font-medium text-olo uppercase tracking-wider">{label}</span>
        <div className="flex gap-1.5">
          {SCREENS.map((s, i) => (
            <div
              key={s.label}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === idx ? '1.5rem' : '0.375rem',
                backgroundColor: i === idx ? 'hsl(var(--olo))' : 'hsl(var(--muted-foreground) / 0.3)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}