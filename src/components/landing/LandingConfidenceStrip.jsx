import { useRef, useState, useEffect } from 'react';
import { PartyPopper, Mic, Camera, Heart, Smile } from 'lucide-react';

const CARDS = [
  {
    icon: PartyPopper,
    title: 'Go for that party',
    body: 'Walk in smiling. Jump into every group photo.',
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80&auto=format&fit=crop',
  },
  {
    icon: Mic,
    title: 'Speak confidently in interviews',
    body: 'A bright smile reads as composure before you say a word.',
    img: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&q=80&auto=format&fit=crop',
  },
  {
    icon: Camera,
    title: 'Smile wide in that picture',
    body: 'Stop the closed mouth pose. Show every tooth.',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80&auto=format&fit=crop',
  },
  {
    icon: Heart,
    title: 'Go on that date',
    body: 'Feel good the second you sit down across from them.',
    img: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=800&q=80&auto=format&fit=crop',
  },
  {
    icon: Smile,
    title: 'Boost your confidence',
    body: 'A whiter smile changes how you show up everywhere.',
    img: 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/ea822784b_generated_image.png',
  },
];

// Scroll-pinned horizontal gallery. Vertical scroll maps 1:1 to horizontal
// travel, then eases toward the target each frame so the pan glides instead of
// snapping to raw scroll deltas. Every band (header, rail, footer) is height-
// budgeted in svh, so the pinned stage always fits one viewport exactly.
export default function LandingConfidenceStrip() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const [sectionHeight, setSectionHeight] = useState('100vh');
  const [activeIndex, setActiveIndex] = useState(0);

  // Map the full horizontal travel onto the section's scroll length so the
  // user must pan through every card before the page continues.
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const maxTranslate = Math.max(0, track.scrollWidth - sectionRef.current.clientWidth + 32);
      setSectionHeight(`${sectionRef.current.firstElementChild.clientHeight + maxTranslate}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 800);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let running = true;

    const readTarget = () => {
      const el = sectionRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, el.offsetHeight - el.firstElementChild.clientHeight);
      const passed = Math.max(0, Math.min(total, -rect.top));
      const p = passed / total;
      const maxTranslate = Math.max(0, track.scrollWidth - sectionRef.current.clientWidth + 32);
      targetRef.current = p * maxTranslate;
      if (barRef.current) barRef.current.style.width = `${p * 100}%`;
      const idx = Math.min(CARDS.length - 1, Math.round(p * (CARDS.length - 1)));
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };

    // Eased follow — smooths the pan without lagging behind the scroll.
    const tick = () => {
      if (!running) return;
      const track = trackRef.current;
      if (track) {
        const diff = targetRef.current - currentRef.current;
        currentRef.current += diff * 0.18;
        if (Math.abs(diff) < 0.15) currentRef.current = targetRef.current;
        track.style.transform = `translate3d(${-currentRef.current}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', readTarget, { passive: true });
    window.addEventListener('resize', readTarget);
    readTarget();
    currentRef.current = targetRef.current;
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      window.removeEventListener('scroll', readTarget);
      window.removeEventListener('resize', readTarget);
      cancelAnimationFrame(raf);
    };
  }, [sectionHeight]);

  return (
    <section ref={sectionRef} className="relative z-10" style={{ height: sectionHeight }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col">
        <div className="absolute inset-0 grid-pattern opacity-[0.08] pointer-events-none" />

        {/* Header band — top padding clears the fixed navbar.
            Navbar: 132px mobile (2-line disclaimer + nav), 116px desktop.
            pt = navbar + 20px breathing room = 152px mobile / 136px desktop. */}
        <div className="relative shrink-0 pt-[max(9.5rem,18svh)] lg:pt-[max(8.5rem,14svh)] px-4 sm:px-6 max-w-6xl mx-auto w-full">
          <h2 className="font-heading font-800 text-[1.75rem] sm:text-4xl lg:text-5xl tracking-tight leading-[1.05] text-foreground text-balance">
            A smile that opens doors
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-muted-foreground max-w-md text-balance">
            The moments a brighter smile quietly makes easier.
          </p>
        </div>

        {/* Card rail band — fills the remaining height, cards size to it */}
        <div className="relative flex-1 min-h-0 flex items-center">
          <div
            ref={trackRef}
            className="flex gap-4 sm:gap-6 px-4 sm:px-6 will-change-transform"
            style={{ width: 'max-content' }}
          >
            {CARDS.map(({ icon: Icon, title, body, img }, i) => (
              <article
                key={title}
                className="group shrink-0 w-[76vw] sm:w-[340px] lg:w-[380px] h-[min(44svh,400px)] rounded-3xl overflow-hidden bg-card border border-border frost-edge flex flex-col transition-shadow duration-500 hover:shadow-2xl hover:shadow-olo/10"
                style={{
                  opacity: activeIndex === i ? 1 : 0.72,
                  transform: `scale(${activeIndex === i ? 1 : 0.975})`,
                  transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <div className="relative flex-[1.15] min-h-0 overflow-hidden">
                  <img
                    src={img}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
                  <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl bg-olo/90 backdrop-blur flex items-center justify-center shadow-lg shadow-olo-deep/25">
                    <Icon className="w-5 h-5 text-olo-deep" />
                  </div>
                  <span className="absolute top-5 right-5 font-heading font-700 text-xs tabular-nums text-white/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="relative flex-1 min-h-0 px-5 sm:px-6 pb-6 flex flex-col justify-center gap-2">
                  <h3 className="font-heading font-800 text-lg sm:text-2xl leading-[1.15] tracking-tight text-foreground text-balance">
                    {title}
                  </h3>
                  <p className="text-[0.8125rem] sm:text-[0.9375rem] text-muted-foreground leading-relaxed text-balance">
                    {body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Footer band — counter + progress */}
        <div className="relative shrink-0 pb-[max(1.5rem,4svh)] pt-4 flex flex-col items-center gap-2.5">
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground tracking-wider">
            {String(activeIndex + 1).padStart(2, '0')}
            <span className="text-muted-foreground/40"> / {String(CARDS.length).padStart(2, '0')}</span>
          </span>
          <div className="w-40 sm:w-48 h-[3px] rounded-full bg-border overflow-hidden">
            <div
              ref={barRef}
              className="h-full bg-gradient-to-r from-olo to-olo-glow rounded-full"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}