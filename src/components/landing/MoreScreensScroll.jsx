import { useRef, useEffect } from 'react';
import PhoneFrame from '@/components/landing/PhoneFrame';
import DashboardSnapshot from '@/components/landing/snapshots/DashboardSnapshot';
import MyScansSnapshot from '@/components/landing/snapshots/MyScansSnapshot';
import LeaderboardSnapshot from '@/components/landing/snapshots/LeaderboardSnapshot';
import ProfileSnapshot from '@/components/landing/snapshots/ProfileSnapshot';

const SCREENS = [
  { label: 'Dashboard', Component: DashboardSnapshot },
  { label: 'My Scans', Component: MyScansSnapshot },
  { label: 'Rank', Component: LeaderboardSnapshot },
  { label: 'Profile', Component: ProfileSnapshot },
];

// Native scroll-snap carousel — smooth, momentum-based, snaps each phone into
// place. Replaces the old scroll-hijack (sticky + framer useScroll) which felt
// janky and stole page scroll. Progress bar tracks the container's own scroll.
export default function MoreScreensScroll() {
  const scrollRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = Math.max(1, el.scrollWidth - el.clientWidth);
      if (barRef.current) barRef.current.style.width = `${Math.min(100, (el.scrollLeft / max) * 100)}%`;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="relative z-10 pt-10 pb-6 sm:pt-14 sm:pb-8 overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-[0.12] pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 mb-8 sm:mb-10" />

      <div
        ref={scrollRef}
        className="relative flex gap-6 sm:gap-10 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-6 py-8 scroll-smooth"
      >
        {SCREENS.map(({ label, Component }) => (
          <div key={label} className="snap-start flex-shrink-0 w-[62vw] sm:w-[260px] flex flex-col items-center">
            <div className="w-full max-w-[min(260px,28vh)] transition-transform duration-300 hover:-translate-y-1.5">
              <PhoneFrame>
                <Component />
              </PhoneFrame>
            </div>
            <span className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 max-w-xs mx-auto px-4">
        <div className="h-[2px] bg-border rounded-full overflow-hidden">
          <div ref={barRef} className="h-full bg-gradient-to-r from-olo to-olo-glow rounded-full" style={{ width: '0%' }} />
        </div>
      </div>
    </section>
  );
}