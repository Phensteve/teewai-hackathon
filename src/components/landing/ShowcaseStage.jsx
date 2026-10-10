import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import ScanSnapshot from '@/components/landing/snapshots/ScanSnapshot';
import ResultsSnapshot from '@/components/landing/snapshots/ResultsSnapshot';
import PlanSnapshot from '@/components/landing/snapshots/PlanSnapshot';

const STEPS = [
  {
    tab: 'Scan',
    title: 'Scan.',
    lead: 'In one photo.',
    body: 'Open the camera, smile, snap. teewai reads your enamel and gums from a single frame, right from your phone.',
    Snapshot: ScanSnapshot,
    points: ['Quick scan or full 5 angle scan', 'White card shade calibration', 'Works on any phone camera'],
    pills: [
      { text: 'Shade A2', sub: 'VITA matched', side: 'left', top: '16%' },
      { text: 'Analyzing…', sub: '90s average', side: 'right', top: '58%' },
    ],
  },
  {
    tab: 'Score',
    title: 'Score.',
    lead: 'Instantly.',
    body: 'Two numbers that actually mean something: whiteness and dental health, graded against clinical shade scales.',
    Snapshot: ResultsSnapshot,
    points: ['VITA shade match, precise', 'Gums, plaque and enamel graded', 'Stain sources named'],
    pills: [
      { text: '78', sub: 'whiteness score', side: 'left', top: '20%' },
      { text: '84', sub: 'dental health', side: 'right', top: '62%' },
    ],
  },
  {
    tab: 'Plan',
    title: 'Plan.',
    lead: 'Built around you.',
    body: 'Evidence based habits and products picked for your stains, with a realistic shade target and a timeline.',
    Snapshot: PlanSnapshot,
    points: ['Habits picked for your stains', 'Products at every budget', 'A realistic shade target date'],
    pills: [
      { text: '4 weeks', sub: 'to shade A1', side: 'left', top: '18%' },
      { text: '3 habits', sub: 'daily plan', side: 'right', top: '60%' },
    ],
  },
];

const N = STEPS.length;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

// Phone frame — fills its sized parent.
function Phone({ snapshot: Snapshot }) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute -inset-6 bg-olo/15 blur-[70px] rounded-full pointer-events-none" />
      <div className="relative w-full h-full rounded-[1.5rem] border-[3px] border-olo-deep/30 bg-olo-deep p-1.5 shadow-2xl shadow-olo/20">
        <div className="relative rounded-[1.2rem] overflow-hidden bg-background h-full">
          <Snapshot />
        </div>
      </div>
    </div>
  );
}

// Scroll-pinned showcase. A tall outer (one viewport per step) wraps a sticky
// full-screen inner. Scroll progress selects the active step; copy, phone and
// pills crossfade together (opacity + transform both eased) so nothing ever
// overlaps mid-transition. Every band is height-budgeted in svh so the stage
// always fits one viewport — no clipping, no collisions on small phones.
export default function ShowcaseStage() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = el.firstElementChild.clientHeight;
        const total = Math.max(1, el.offsetHeight - vh);
        const passed = Math.max(0, Math.min(total, -rect.top));
        setProgress(passed / total);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = Math.min(N - 1, Math.max(0, Math.floor(progress * N)));

  return (
    <section ref={sectionRef} className="relative z-10" style={{ height: `${N * 100}vh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.12] pointer-events-none" />
        <div className="absolute inset-0 radial-olo pointer-events-none" />

        <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col">
          {/* Header band — top padding clears the fixed navbar.
              Navbar: 132px mobile (2-line disclaimer + nav), 116px desktop.
              pt = navbar + 8px = 140px mobile / 124px desktop. */}
          <div className="shrink-0 pt-[max(8.75rem,14svh)] lg:pt-[max(7.75rem,11svh)] text-center lg:text-left">
            <p className="hidden lg:block text-sm text-muted-foreground/70">
              Scroll to move through the real screens.
            </p>
          </div>

          {/* Main band — copy + pinned phone */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-start lg:justify-center gap-2 sm:gap-3 lg:gap-16 pt-1 sm:pt-2">
            {/* Copy — all steps stacked, crossfaded */}
            <div className="relative w-full lg:w-[40%] shrink-0 h-[7rem] sm:h-[10rem] lg:h-[26rem]">
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <div
                    key={s.tab}
                    aria-hidden={!on}
                    className="absolute inset-0 flex flex-col justify-center text-center lg:text-left"
                    style={{
                      opacity: on ? 1 : 0,
                      transform: `translateY(${on ? 0 : 18}px)`,
                      transition: `opacity 0.55s ${EASE}, transform 0.6s ${EASE}`,
                      pointerEvents: on ? 'auto' : 'none',
                      willChange: 'opacity, transform',
                    }}
                  >
                    <h3 className="font-heading font-800 text-[1.65rem] sm:text-4xl lg:text-6xl tracking-tight leading-[1.05]">
                      {s.title} <span className="text-olo/55">{s.lead}</span>
                    </h3>
                    <p className="mt-2.5 sm:mt-4 lg:mt-6 text-[0.8125rem] sm:text-base lg:text-lg leading-relaxed text-muted-foreground max-w-md text-balance mx-auto lg:mx-0">
                      {s.body}
                    </p>
                    {/* Desktop-only detail — fills the column beside the taller
                        phone so the layout reads full instead of gappy. */}
                    <ul className="hidden lg:flex flex-col gap-3 mt-8">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-center gap-3 text-[0.9375rem] text-foreground/80">
                          <span className="w-5 h-5 rounded-full bg-olo/12 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-olo" />
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Phone — height-driven so it can never overflow the viewport.
                lg reduced from 72svh to 64svh to fit the navbar-clearing header
                on laptops (700–800px viewports). max-h-[660px] caps tall screens. */}
            <div className="relative shrink-0 h-[48svh] sm:h-[52svh] lg:h-[64svh] max-h-[660px] aspect-[390/844]">
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <div
                    key={s.tab}
                    className="absolute inset-0"
                    style={{
                      opacity: on ? 1 : 0,
                      transform: `translateY(${on ? 0 : 14}px) scale(${on ? 1 : 0.97})`,
                      transition: `opacity 0.55s ${EASE}, transform 0.65s ${EASE}`,
                      willChange: 'opacity, transform',
                    }}
                  >
                    <Phone snapshot={s.Snapshot} />
                  </div>
                );
              })}

              {/* Floating pills — desktop only, where there is real room beside
                  the phone. On tablet they collided with the frame. */}
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <div
                    key={`p-${s.tab}`}
                    className="absolute inset-0 pointer-events-none hidden lg:block"
                    style={{
                      opacity: on ? 1 : 0,
                      transition: `opacity 0.5s ${EASE}`,
                      willChange: 'opacity',
                    }}
                  >
                    {s.pills.map((p) => (
                      <div
                        key={p.text + p.sub}
                        className={`absolute z-20 flex flex-col rounded-2xl glass-light border border-olo/20 shadow-xl px-4 py-3 ${p.side === 'left' ? '-left-16' : '-right-16'}`}
                        style={{
                          top: p.top,
                          transform: `translateX(${on ? 0 : p.side === 'left' ? -12 : 12}px)`,
                          transition: `transform 0.65s ${EASE}`,
                        }}
                      >
                        <span className="font-heading font-700 text-lg leading-none text-olo">{p.text}</span>
                        <span className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">{p.sub}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer band — tab rail + progress */}
          <div className="shrink-0 pb-[max(1.25rem,3svh)] lg:pb-10 flex flex-col items-center gap-2.5">
            <div className="flex gap-1.5 sm:gap-2">
              {STEPS.map((s, i) => (
                <span
                  key={s.tab}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-500 ${
                    active === i
                      ? 'bg-olo text-olo-deep shadow-lg shadow-olo/30'
                      : 'bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${active === i ? 'bg-olo-deep scale-125' : 'bg-muted-foreground/40'}`}
                  />
                  {s.tab}
                </span>
              ))}
            </div>
            <div className="w-40 sm:w-44 h-[3px] bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-olo to-olo-glow rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}