import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Star, Satellite } from 'lucide-react';
import { SPACE_EVENTS } from '@/lib/spaceEvents';

const CAT_ICONS = {
  'Constellation': Star,
  'Comet': Star,
  'Nebula': Star,
  'Black Hole': Satellite,
  'Galaxy': Satellite,
  'Planet': Satellite,
  'Star': Star,
  'Mission': Satellite,
  'History': Satellite,
  'Supernova': Star,
  'Phenomenon': Star,
  'Star Cluster': Star,
};

const CAT_GRADIENTS = {
  'Constellation': 'from-[#1a3a5c] to-[#0d1f3c]',
  'Comet': 'from-[#1a4a3c] to-[#0d2a1f]',
  'Nebula': 'from-[#3c1a4a] to-[#1f0d2a]',
  'Black Hole': 'from-[#2a0d1f] to-[#0d0612]',
  'Galaxy': 'from-[#1a2a4c] to-[#0d122a]',
  'Planet': 'from-[#1a3c4a] to-[#0d1f2a]',
  'Star': 'from-[#3c3a1a] to-[#1f1f0d]',
  'Mission': 'from-[#1a4a3c] to-[#0d2a1f]',
  'History': 'from-[#2a2a3c] to-[#0d0d1a]',
  'Supernova': 'from-[#3c2a1a] to-[#1f0d0d]',
  'Phenomenon': 'from-[#1a3c5c] to-[#0d1f2a]',
  'Star Cluster': 'from-[#2a1a3c] to-[#1a0d2a]',
};

// 13 fixed positions scattered around the viewport periphery (desktop) so the
// center content stays clear. The constellation never scrolls with the page.
const DESKTOP_POS = [
  { top: '5%',  left: '9%'  },
  { top: '12%', left: '38%' },
  { top: '8%',  left: '71%' },
  { top: '24%', left: '19%' },
  { top: '29%', left: '57%' },
  { top: '21%', left: '82%' },
  { top: '44%', left: '6%'  },
  { top: '48%', left: '33%' },
  { top: '41%', left: '68%' },
  { top: '63%', left: '22%' },
  { top: '68%', left: '52%' },
  { top: '60%', left: '80%' },
  { top: '82%', left: '13%' },
];

// 7 scattered positions for mobile (narrower, kept inside the viewport).
const MOBILE_POS = [
  { top: '8%',  left: '8%'  },
  { top: '18%', left: '48%' },
  { top: '33%', left: '14%' },
  { top: '44%', left: '46%' },
  { top: '58%', left: '6%'  },
  { top: '70%', left: '42%' },
  { top: '82%', left: '16%' },
];

// Away from the nerds section the constellation collapses back to a couple of
// ordinary corner toasts, so the rest of the page stays clean.
const NORMAL_POS = [
  { top: '76%', left: '3%'  },
  { top: '20%', left: '80%' },
];
const NORMAL_POS_MOBILE = [
  { top: '78%', left: '3%' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SpaceEventToasts() {
  const [isMobile, setIsMobile] = useState(false);
  const [inNerds, setInNerds] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [detail, setDetail] = useState(null);
  const shown = useRef(new Set());
  const queue = useRef([]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // The full fixed constellation belongs to the "for the nerds" section only.
  useEffect(() => {
    const el = document.getElementById('nerds');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInNerds(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pickNext = useCallback(() => {
    if (queue.current.length === 0) {
      queue.current = shuffle(SPACE_EVENTS.filter((e) => !shown.current.has(e.id)));
      if (queue.current.length === 0) {
        shown.current.clear();
        queue.current = shuffle(SPACE_EVENTS);
      }
    }
    const next = queue.current.shift();
    if (next) shown.current.add(next.id);
    return next;
  }, []);

  // Fill the constellation with N trivia cards at once.
  useEffect(() => {
    const n = inNerds ? (isMobile ? 7 : 13) : (isMobile ? 1 : 2);
    const slots = [];
    for (let i = 0; i < n; i++) {
      const ev = pickNext();
      if (ev) slots.push({ event: ev, key: Date.now() + i });
    }
    setToasts(slots);
  }, [isMobile, inNerds, pickNext]);

  // Rotate one random card into a new fact every 7s so the constellation
  // stays alive without ever scrolling.
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setInterval(() => {
      setToasts((prev) => {
        if (!prev.length) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        const ev = pickNext();
        if (!ev) return prev;
        const next = [...prev];
        next[idx] = { event: ev, key: Date.now() };
        return next;
      });
    }, 7000);
    return () => clearInterval(id);
  }, [toasts.length, pickNext]);

  const positions = inNerds
    ? (isMobile ? MOBILE_POS : DESKTOP_POS)
    : (isMobile ? NORMAL_POS_MOBILE : NORMAL_POS);
  const detailIcon = detail ? (CAT_ICONS[detail.category] || Star) : Star;
  const detailGradient = detail ? (CAT_GRADIENTS[detail.category] || 'from-[#1a2a4c] to-[#0d122a]') : '';

  return (
    <>
      {/* z-[5] keeps the trivia scattered behind/underneath the page content
          (the "for the nerds" box sits above them) but over the 3D canvas. */}
      <div className="fixed inset-0 z-[5] pointer-events-none" aria-hidden="true">
        {toasts.map((t, i) => {
          const pos = positions[i] || positions[i % positions.length];
          const Ic = t.event ? (CAT_ICONS[t.event.category] || Star) : Star;
          return (
            <button
              key={t.key}
              onClick={() => setDetail(t.event)}
              className="absolute pointer-events-auto cursor-pointer text-left"
              style={{
                top: pos.top, left: pos.left,
                maxWidth: isMobile ? '150px' : '172px',
                animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
              }}
            >
              <div className="flex items-start gap-2 px-2.5 py-2 rounded-xl border border-[#0d9f8e]/20 bg-[#06121a]/65 backdrop-blur-md" style={{ boxShadow: '0 4px 26px -10px rgba(13,159,142,0.18)' }}>
                <div className="w-5 h-5 rounded-md bg-[#0d9f8e]/10 flex items-center justify-center flex-shrink-0">
                  <Ic className="w-3 h-3 text-[#5eead4]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] uppercase tracking-wider text-[#2dd4bf] font-semibold">{t.event.category}</span>
                    <span className="text-[7px] text-white/35">{t.event.date}</span>
                  </div>
                  <p className="text-[11px] font-heading font-500 text-white/85 leading-tight mt-0.5 line-clamp-1">{t.event.title}</p>
                  <p className="text-[9px] text-white/45 mt-0.5 leading-snug line-clamp-2">{t.event.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {detail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-[#06121a]/75 backdrop-blur-sm" />
          <div
            className="relative max-w-lg w-full rounded-3xl border border-[#0d9f8e]/30 bg-[#06121a]/95 backdrop-blur-xl overflow-hidden"
            style={{ boxShadow: '0 0 80px -15px rgba(13,159,142,0.35)', animation: 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative h-32 bg-gradient-to-br ${detailGradient} flex items-center justify-center overflow-hidden`}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 1.5px, transparent 1.5px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px, 80px 80px, 100px 100px, 50px 50px' }} />
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(6,18,26,0.6) 100%)' }} />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-[#06121a]/60 backdrop-blur-md border border-[#0d9f8e]/30 flex items-center justify-center" style={{ boxShadow: '0 0 30px -5px rgba(13,159,142,0.4)' }}>
                <detailIcon className="w-8 h-8 text-[#5eead4]" />
              </div>
              <button onClick={() => setDetail(null)} className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#2dd4bf] font-semibold">{detail.category}</span>
                <span className="text-[10px] text-white/40">· {detail.date}</span>
              </div>
              <h3 className="font-heading font-600 text-xl sm:text-2xl text-white mb-4">{detail.title}</h3>
              <p className="text-sm sm:text-[15px] text-white/80 leading-relaxed font-light">{detail.detail}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}