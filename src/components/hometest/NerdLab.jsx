import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Move3d, X } from 'lucide-react';
import NerdStars from './NerdStars';

// The 3D inspector is only mounted once the section is near the viewport, so it
// never costs anything on first paint.
const InspectTeeth3D = lazy(() => import('./InspectTeeth3D'));

export default function NerdLab() {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setMounted(true); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleSelect = useCallback((tooth) => setSelected(tooth), []);

  return (
    <section id="nerds" ref={ref} className="relative px-4 py-24 sm:py-32 overflow-hidden">
      <NerdStars />
      <div className="relative max-w-6xl mx-auto text-center">
        <div data-reveal>
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">Under the hood</span>
          <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3">
            For the <span className="font-600 text-[#5eead4]">nerds</span>
            <span className="block text-xs sm:text-sm text-white/40 font-light tracking-normal mt-2">(like me)</span>
          </h2>
          <p className="mt-5 text-sm text-white/65 font-light leading-relaxed max-w-lg mx-auto text-center">
            Drag to orbit and tilt the arch, then tap any tooth to zoom in and read what it is.
          </p>
        </div>

        <div
          data-reveal
          className="relative mt-10 mx-auto w-full aspect-[4/3] sm:aspect-[16/10] rounded-3xl border border-[#0d9f8e]/25 overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(13,159,142,0.10), rgba(6,18,26,0.88) 72%)', boxShadow: '0 0 90px -26px rgba(13,159,142,0.55)' }}
        >
          {mounted && (
            <Suspense fallback={null}>
              <InspectTeeth3D onSelect={handleSelect} selectedId={selected?.id} />
            </Suspense>
          )}

          {selected && (
            <div className="absolute top-4 left-4 max-w-[240px] text-left animate-fade-up">
              <div className="rounded-2xl border border-[#0d9f8e]/35 bg-[#06121a]/85 backdrop-blur-xl px-4 py-3" style={{ boxShadow: '0 0 40px -14px rgba(13,159,142,0.6)' }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#2dd4bf] font-semibold">{selected.type}</span>
                  <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition-colors" aria-label="Close">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-heading font-600 text-sm text-white leading-tight mt-1">{selected.label}</p>
                <p className="text-[11px] text-white/55 mt-1 leading-snug font-light">{selected.desc}</p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06121a]/70 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-[0.16em] text-white/60">
              <Move3d className="w-3.5 h-3.5 text-[#2dd4bf]" /> Drag to inspect · tap a tooth
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}