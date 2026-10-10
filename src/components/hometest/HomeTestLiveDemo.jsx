import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ScanLine } from 'lucide-react';
import SmartCTA from './SmartCTA';

// Loaded on demand so the three.js chunk never blocks the page's first paint.
const DemoTeeth3D = lazy(() => import('./DemoTeeth3D'));

function CountUp({ to, duration = 1200 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const p = Math.min(1, elapsed / duration);
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.5 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{val}</span>;
}

export default function HomeTestLiveDemo() {
  const [phase, setPhase] = useState('idle');
  const [mounted3D, setMounted3D] = useState(false);
  const sectionRef = useRef(null);
  const timers = useRef([]);

  // The 3D arch flies in when the section enters view, holds perfectly still
  // through the scan, and drifts back out (large + faded) when the user leaves.
  useEffect(() => {
    if (!sectionRef.current) return;
    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const obs = new IntersectionObserver(([entry]) => {
      clearTimers();
      if (entry.isIntersecting) {
        setMounted3D(true);
        timers.current.push(setTimeout(() => setPhase('entering'), 120));
        timers.current.push(setTimeout(() => setPhase('scanning'), 1900));
        timers.current.push(setTimeout(() => setPhase('results'), 4400));
      } else {
        setPhase('leaving');
      }
    }, { threshold: 0.35 });
    obs.observe(sectionRef.current);
    return () => { obs.disconnect(); clearTimers(); };
  }, []);

  const isScanning = phase === 'scanning';
  const showScores = phase === 'results';

  return (
    <section id="demo" ref={sectionRef} className="relative px-4 py-24 sm:py-32">
      <div className="max-w-2xl mx-auto">
        <div data-reveal className="text-center mb-10">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">Live demo</span>
          <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3">See teewai <span className="font-600 text-[#5eead4]">score a smile</span></h2>
        </div>
        <div data-reveal className="relative">
          <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-3 sm:p-5 overflow-hidden">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a1a1a] to-[#06121a]">
              {/* 3D teeth arch — rotates in the background, shrinks into the
                  scan window, freezes for the scan, then drifts back out. */}
              <div className="absolute inset-0">
                {mounted3D && (
                  <Suspense fallback={null}>
                    <DemoTeeth3D phase={phase} highlight={isScanning} />
                  </Suspense>
                )}
              </div>

              {/* Scanning line — sweeps once */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-0 right-0 h-[2px] bg-[#2dd4bf]" style={{ boxShadow: '0 0 20px 4px rgba(45,212,191,0.7)', animation: 'scan-line 2.5s ease-in-out' }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(45,212,191,0.08) 50%, transparent 55%)' }} />
                </div>
              )}

              {/* Status badge */}
              <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-lg flex items-center gap-2">
                <ScanLine className={`w-4 h-4 text-[#2dd4bf] ${isScanning ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium text-white">
                  {phase === 'idle' || phase === 'leaving' ? 'Ready when you are' : phase === 'entering' ? 'Calibrating the lens…' : isScanning ? 'Reading each tooth…' : 'Done \u2014 here\u2019s your shade'}
                </span>
              </div>

              {/* Score badge */}
              <div className="absolute bottom-3 right-3 glass px-4 py-2 rounded-xl transition-all duration-500" style={{ opacity: showScores ? 1 : 0, transform: showScores ? 'translateY(0)' : 'translateY(8px)' }}>
                <span className="text-xs text-white/60">Score</span>
                <div className="text-2xl font-heading font-800 text-[#5eead4] leading-tight">
                  {showScores ? <CountUp to={87} /> : '—'}
                </div>
              </div>

            </div>
          </div>

          {/* Score cards */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Whiteness', value: showScores ? <CountUp to={87} /> : '—', sub: '/ 100' },
              { label: 'Shade', value: showScores ? 'A1' : '—', sub: 'VITA scale' },
              { label: 'Health', value: showScores ? <CountUp to={92} /> : '—', sub: 'Dental score' },
            ].map((s, i) => (
              <div key={s.label} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.05] text-center transition-all duration-500"
                style={{ opacity: showScores ? 1 : 0.4, transitionDelay: `${i * 150}ms` }}>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">{s.label}</div>
                <div className="mt-1 text-lg sm:text-2xl font-heading font-700 text-[#5eead4]">{s.value}</div>
                <div className="text-[10px] text-white/50">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div data-reveal className="text-center mt-10">
          <SmartCTA loggedInTo="/dashboard" className="inline-flex items-center gap-2 bg-[#0d9f8e] text-white font-semibold px-8 py-4 rounded-2xl text-base hover:scale-[1.03] transition-transform" style={{ boxShadow: '0 0 60px -10px rgba(13,159,142,0.65)' }}>
            Ready to try it?
          </SmartCTA>
        </div>
      </div>
    </section>
  );
}