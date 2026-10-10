import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// Seabed — a thin waterline band that sits flush on the footer's top border.
// CSS keyframes handle horizontal traversal (swimming, crawling, drifting).
// GSAP drives subtle organic micro-movements layered on top, following
// premium motion principles: slow durations (1.5-3s), tiny amplitudes
// (1-3° / 2-5% scale), power2.inOut easing, and only one or two movements
// per creature so nothing feels busy. Paused off-screen; skipped for
// prefers-reduced-motion.

// ── Worm ── a smooth path animated with a traveling sine wave so the body
// undulates organically as it crawls, not a stiff skew.
function Worm() {
  return (
    <svg viewBox="0 0 44 12" className="w-14 h-4" aria-hidden="true">
      <path
        className="worm-body-path"
        d="M2 6 Q8 6 14 6 Q20 6 26 6 Q32 6 38 6"
        stroke="hsl(var(--olo-glow) / 0.85)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="39" cy="5" r="0.8" fill="hsl(var(--olo-deep))" />
    </svg>
  );
}

// ── Crab ── separate leg groups for subtle articulation; everything else
// is static so the only motion is the quiet leg shuffle + body bob.
function Crab() {
  return (
    <svg viewBox="0 0 60 40" className="w-14 h-9" aria-hidden="true">
      <g className="crab-leg-l" style={{ transformBox: 'fill-box', transformOrigin: '100% 0%' }}>
        <path d="M18 24 L8 36" stroke="hsl(var(--olo) / 0.85)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="crab-leg-l" style={{ transformBox: 'fill-box', transformOrigin: '100% 0%' }}>
        <path d="M22 26 L12 38" stroke="hsl(var(--olo) / 0.85)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="crab-leg-r" style={{ transformBox: 'fill-box', transformOrigin: '0% 0%' }}>
        <path d="M38 26 L48 38" stroke="hsl(var(--olo) / 0.85)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="crab-leg-r" style={{ transformBox: 'fill-box', transformOrigin: '0% 0%' }}>
        <path d="M42 24 L52 36" stroke="hsl(var(--olo) / 0.85)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="crab-body">
        <ellipse cx="30" cy="22" rx="14" ry="9" fill="hsl(var(--olo) / 0.85)" />
        <path d="M16 18 L5 13 Q1 13 3 18 L14 21 Z" fill="hsl(var(--olo) / 0.85)" />
        <path d="M44 18 L55 13 Q59 13 57 18 L46 21 Z" fill="hsl(var(--olo) / 0.85)" />
        <line x1="25" y1="18" x2="25" y2="12" stroke="hsl(var(--olo) / 0.85)" strokeWidth="1.5" />
        <circle cx="25" cy="11" r="1.8" fill="hsl(var(--olo-deep))" />
        <line x1="35" y1="18" x2="35" y2="12" stroke="hsl(var(--olo) / 0.85)" strokeWidth="1.5" />
        <circle cx="35" cy="11" r="1.8" fill="hsl(var(--olo-deep))" />
      </g>
    </svg>
  );
}

// ── Fish ── subtle body undulation + gentle tail flick.
function Fish() {
  return (
    <svg viewBox="0 0 60 30" className="w-16 h-8" style={{ transform: 'scaleX(-1)' }} aria-hidden="true">
      <g className="fish-body" style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
        <path d="M5 15 Q15 2 40 15 Q15 28 5 15 Z" fill="hsl(var(--olo-glow) / 0.85)" />
        <circle cx="14" cy="13" r="1.6" fill="hsl(var(--olo-deep))" />
        <path d="M22 11 Q26 9 30 11" stroke="hsl(var(--olo-deep) / 0.4)" strokeWidth="1" fill="none" />
      </g>
      <g className="fish-tail" style={{ transformBox: 'fill-box', transformOrigin: '0% 50%' }}>
        <path d="M40 15 L58 6 L58 24 Z" fill="hsl(var(--olo-glow) / 0.65)" />
      </g>
    </svg>
  );
}

// ── Jellyfish ── gentle bell pulse + soft tentacle sway.
function Jellyfish() {
  return (
    <svg viewBox="0 0 34 52" className="w-10 h-14" aria-hidden="true">
      <g className="jelly-bell" style={{ transformBox: 'fill-box', transformOrigin: '50% 30%' }}>
        <path d="M3 20 Q17 -2 31 20 Q24 24 17 20 Q10 24 3 20 Z" fill="hsl(var(--olo-glow) / 0.45)" />
        <path d="M7 17 Q17 3 27 17" stroke="hsl(var(--olo-glow) / 0.6)" strokeWidth="1" fill="none" />
      </g>
      <g className="jelly-tentacle" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
        <path d="M9 21 Q7 32 11 44" stroke="hsl(var(--olo-glow) / 0.4)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
      <g className="jelly-tentacle" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
        <path d="M17 22 Q19 34 15 48" stroke="hsl(var(--olo-glow) / 0.4)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
      <g className="jelly-tentacle" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
        <path d="M25 21 Q27 32 23 44" stroke="hsl(var(--olo-glow) / 0.4)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

// ── Snail ── quiet antenna wiggle only; shell is static.
function Snail() {
  return (
    <svg viewBox="0 0 40 24" className="w-12 h-7" aria-hidden="true">
      <g className="seabed-snail-bob" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M3 18 L22 18 Q27 18 27 14" stroke="hsl(var(--olo-glow) / 0.7)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="29" cy="12" r="8" fill="hsl(var(--olo) / 0.85)" />
        <path d="M29 12 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M29 12 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0" fill="none" stroke="hsl(var(--olo-glow) / 0.6)" strokeWidth="1.2" />
        <g className="snail-antenna-l" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          <path d="M27 8 L25 3" stroke="hsl(var(--olo-glow) / 0.8)" strokeWidth="1" strokeLinecap="round" />
          <circle cx="25" cy="3" r="0.8" fill="hsl(var(--olo-glow) / 0.9)" />
        </g>
        <g className="snail-antenna-r" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          <path d="M31 8 L33 3" stroke="hsl(var(--olo-glow) / 0.8)" strokeWidth="1" strokeLinecap="round" />
          <circle cx="33" cy="3" r="0.8" fill="hsl(var(--olo-glow) / 0.9)" />
        </g>
      </g>
    </svg>
  );
}

function Clam() {
  return (
    <svg viewBox="0 0 50 40" className="w-14 h-12" aria-hidden="true">
      <path d="M5 22 Q25 40 45 22 Q25 30 5 22 Z" fill="hsl(var(--olo) / 0.8)" />
      <circle className="seabed-clam-pearl" cx="25" cy="21" r="4" fill="hsl(var(--olo-glow))" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      <g className="seabed-clam-top" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
        <path d="M5 22 Q25 -2 45 22 Q25 14 5 22 Z" fill="hsl(var(--olo) / 0.9)" />
        <path d="M10 20 Q25 4 40 20" stroke="hsl(var(--olo-glow) / 0.4)" strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}

function Starfish() {
  return (
    <svg viewBox="0 0 40 38" className="w-9 h-9" aria-hidden="true">
      <path d="M20 2 L25.5 15 L39 15 L28 23 L32 36 L20 28 L8 36 L12 23 L1 15 L14.5 15 Z" fill="hsl(var(--olo) / 0.75)" />
      <circle cx="20" cy="19" r="2.2" fill="hsl(var(--olo-glow) / 0.7)" />
    </svg>
  );
}

function GrassTuft({ blades = 4, height = 46, sway = 'blade-sway-a' }) {
  const w = blades * 9 + 6;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: w, height }} className={sway} aria-hidden="true">
      {Array.from({ length: blades }).map((_, i) => {
        const x = 5 + i * 9;
        const h = height * (0.55 + ((i * 37) % 45) / 100);
        const bend = i % 2 === 0 ? 6 : -6;
        return (
          <path
            key={i}
            d={`M ${x - 2.6} ${height} C ${x - 2.6} ${height - h * 0.5}, ${x + bend * 0.4} ${height - h * 0.8}, ${x + bend} ${height - h} C ${x + bend} ${height - h * 0.8}, ${x + 2.6} ${height - h * 0.5}, ${x + 2.6} ${height} Z`}
            fill="hsl(var(--olo) / 0.55)"
          />
        );
      })}
    </svg>
  );
}

function Pebbles() {
  return (
    <svg viewBox="0 0 90 16" className="w-24 h-4" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="11" ry="5" fill="hsl(var(--olo-deep))" opacity="0.85" />
      <ellipse cx="34" cy="13" rx="7" ry="3.5" fill="hsl(var(--olo) / 0.35)" />
      <ellipse cx="55" cy="12" rx="13" ry="6" fill="hsl(var(--olo-deep))" opacity="0.9" />
      <ellipse cx="78" cy="13" rx="8" ry="4" fill="hsl(var(--olo) / 0.3)" />
    </svg>
  );
}

function Barnacles({ className }) {
  return (
    <svg viewBox="0 0 30 18" className={`w-9 h-5 ${className}`} aria-hidden="true">
      <path d="M3 16 L7 4 L11 16 Z" fill="hsl(var(--olo) / 0.7)" />
      <path d="M11 16 L15 2 L19 16 Z" fill="hsl(var(--olo) / 0.85)" />
      <path d="M18 16 L22 6 L26 16 Z" fill="hsl(var(--olo) / 0.7)" />
    </svg>
  );
}

// Generate the worm's path `d` for a given phase — a smooth traveling
// sine wave through 7 anchor points with quadratic-bezier control points.
function wormPathD(phase) {
  const baseY = 6;
  const amp = 1.2;
  const segs = 7;
  const freq = 0.8;
  let d = '';
  for (let i = 0; i < segs; i++) {
    const x = 2 + i * 6;
    const y = baseY + Math.sin(phase + i * freq) * amp;
    if (i === 0) {
      d += `M${x} ${y.toFixed(2)}`;
    } else {
      const cx = (2 + (i - 1) * 6 + x) / 2;
      const cy = baseY + Math.sin(phase + (i - 0.5) * freq) * amp * 2.4;
      d += ` Q${cx} ${cy.toFixed(2)} ${x} ${y.toFixed(2)}`;
    }
  }
  return d;
}

export default function LandingSeabed() {
  const ref = useRef(null);
  const tlRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tlRef.current = tl;
      const EASE = 'power2.inOut';

      // ── WORM — traveling sine wave through a smooth path ──
      const wormPath = ref.current.querySelector('.worm-body-path');
      if (wormPath) {
        const state = { phase: 0 };
        tl.to(state, {
          phase: Math.PI * 2,
          duration: 3,
          ease: 'none',
          repeat: -1,
          onUpdate: () => { wormPath.setAttribute('d', wormPathD(state.phase)); },
        }, 0);
      }

      // ── CRAB — subtle leg shuffle + quiet body bob ──
      tl.to('.crab-leg-l', {
        rotation: 3,
        duration: 1.5,
        ease: EASE,
        yoyo: true,
        repeat: -1,
        stagger: 0.15,
      }, 0);
      tl.to('.crab-leg-r', {
        rotation: -3,
        duration: 1.5,
        ease: EASE,
        yoyo: true,
        repeat: -1,
        stagger: 0.15,
        delay: 0.75,
      }, 0);
      tl.to('.crab-body', {
        y: -0.6,
        duration: 1.5,
        ease: EASE,
        yoyo: true,
        repeat: -1,
      }, 0);

      // ── FISH — gentle body undulation + soft tail flick ──
      tl.to('.fish-body', {
        rotation: 1,
        duration: 2,
        ease: EASE,
        yoyo: true,
        repeat: -1,
      }, 0);
      tl.to('.fish-tail', {
        rotation: 3,
        duration: 1.5,
        ease: EASE,
        yoyo: true,
        repeat: -1,
      }, 0);

      // ── JELLYFISH — subtle bell pulse + soft tentacle sway ──
      tl.to('.jelly-bell', {
        scaleY: 0.96,
        scaleX: 1.04,
        duration: 3,
        ease: EASE,
        yoyo: true,
        repeat: -1,
      }, 0);
      tl.to('.jelly-tentacle', {
        skewX: 3,
        duration: 3.5,
        ease: EASE,
        yoyo: true,
        repeat: -1,
        stagger: 0.3,
      }, 0);

      // ── SNAIL — quiet antenna wiggle ──
      tl.to('.snail-antenna-l', {
        rotation: 2,
        duration: 3,
        ease: EASE,
        yoyo: true,
        repeat: -1,
      }, 0);
      tl.to('.snail-antenna-r', {
        rotation: -2,
        duration: 3,
        ease: EASE,
        yoyo: true,
        repeat: -1,
        delay: 0.4,
      }, 0);

      // ── BUBBLES — gentle organic wobble as they rise ──
      tl.to('.bubble-wobble', {
        x: 'random(-3, 3)',
        duration: 'random(2, 4)',
        ease: EASE,
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.25, from: 'random' },
        repeatRefresh: true,
      }, 0);

      // ── CRAB WALK — walks to center, pauses, pivots with a smooth squish
      //    turn (scaleX through zero + slight rotation lift), walks back ──
      gsap.set('.crab-walker', { x: '-15vw', scaleX: 1 });
      const crabWalk = gsap.timeline({ repeat: -1 });
      crabWalk.to('.crab-walker', { x: '50vw', duration: 14, ease: 'power1.inOut' });
      crabWalk.to('.crab-walker', { duration: 2 });
      crabWalk.to('.crab-walker', { scaleX: 0, y: -2, rotation: 5, duration: 0.35, ease: 'power2.in' });
      crabWalk.to('.crab-walker', { scaleX: -1, y: 0, rotation: 0, duration: 0.35, ease: 'power2.out' });
      crabWalk.to('.crab-walker', { x: '-15vw', duration: 14, ease: 'power1.inOut' });
      crabWalk.to('.crab-walker', { duration: 2 });
      crabWalk.to('.crab-walker', { scaleX: 0, y: -2, rotation: -5, duration: 0.35, ease: 'power2.in' });
      crabWalk.to('.crab-walker', { scaleX: 1, y: 0, rotation: 0, duration: 0.35, ease: 'power2.out' });
      tl.add(crabWalk, 0);

      // ── WORM WALK — slower cycle + different start position so it never
      //    overlaps the crab; curves with a skewY during the turn ──
      gsap.set('.worm-walker', { x: '-8vw', scaleX: 1 });
      const wormWalk = gsap.timeline({ repeat: -1 });
      wormWalk.to('.worm-walker', { x: '50vw', duration: 20, ease: 'power1.inOut' });
      wormWalk.to('.worm-walker', { duration: 2.5 });
      wormWalk.to('.worm-walker', { scaleX: 0, y: -1, skewY: 6, duration: 0.5, ease: 'power2.in' });
      wormWalk.to('.worm-walker', { scaleX: -1, y: 0, skewY: 0, duration: 0.5, ease: 'power2.out' });
      wormWalk.to('.worm-walker', { x: '-8vw', duration: 20, ease: 'power1.inOut' });
      wormWalk.to('.worm-walker', { duration: 2.5 });
      wormWalk.to('.worm-walker', { scaleX: 0, y: -1, skewY: -6, duration: 0.5, ease: 'power2.in' });
      wormWalk.to('.worm-walker', { scaleX: 1, y: 0, skewY: 0, duration: 0.5, ease: 'power2.out' });
      tl.add(wormWalk, 0);
    }, ref);

    return () => { ctx.revert(); tlRef.current = null; };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (tlRef.current) {
      if (paused) tlRef.current.pause();
      else tlRef.current.resume();
    }
  }, [paused]);

  return (
    <section
      ref={ref}
      className={`relative w-full h-[180px] sm:h-[210px] overflow-hidden ${paused ? 'lb-paused' : ''}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--olo-deep) / 0.4) 50%, hsl(var(--olo-deep) / 0.92) 90%, hsl(var(--olo-deep)))' }} />

      <div className="absolute top-0 left-1/4 w-72 h-32 rounded-full blur-[100px] caustic" style={{ background: 'radial-gradient(circle, hsl(var(--olo-glow) / 0.14), transparent 70%)' }} />
      <div className="absolute top-0 right-1/4 w-80 h-36 rounded-full blur-[110px] caustic" style={{ background: 'radial-gradient(circle, hsl(var(--olo) / 0.12), transparent 70%)', animationDuration: '24s', animationDelay: '-9s' }} />

      <div className="absolute inset-x-0 bottom-0 opacity-40 blur-[1px]">
        <div className="absolute" style={{ left: 0, bottom: '58px' }}>
          <div className="seabed-fish" style={{ animationDelay: '-6s', animationDuration: '44s', transform: 'scale(0.6)' }}><Fish /></div>
        </div>
        <div className="absolute" style={{ left: 0, bottom: '46px' }}>
          <div className="seabed-fish" style={{ animationDelay: '-24s', animationDuration: '50s', transform: 'scale(0.5)' }}><Fish /></div>
        </div>
      </div>

      <div className="absolute inset-x-0" style={{ bottom: '78px' }}>
        <div className="seabed-jelly opacity-80"><Jellyfish /></div>
      </div>
      <div className="absolute inset-x-0 opacity-40 blur-[1px]" style={{ bottom: '110px' }}>
        <div className="seabed-jelly" style={{ animationDelay: '-30s', animationDuration: '74s', transform: 'scale(0.6)' }}><Jellyfish /></div>
      </div>

      <div className="absolute bottom-4 bubble" style={{ left: '18%', animationDuration: '13s' }}>
        <div className="bubble-wobble rounded-full" style={{ width: 5, height: 5, background: 'hsl(var(--olo-glow) / 0.4)' }} />
      </div>
      <div className="absolute bottom-2 bubble" style={{ left: '47%', animationDuration: '16s', animationDelay: '-6s' }}>
        <div className="bubble-wobble rounded-full" style={{ width: 3, height: 3, background: 'hsl(var(--olo-glow) / 0.35)' }} />
      </div>
      <div className="absolute bottom-6 bubble" style={{ left: '73%', animationDuration: '15s', animationDelay: '-10s' }}>
        <div className="bubble-wobble rounded-full" style={{ width: 6, height: 6, background: 'hsl(var(--olo-glow) / 0.3)' }} />
      </div>
      <div className="absolute bottom-3 bubble" style={{ left: '32%', animationDuration: '18s', animationDelay: '-3s' }}>
        <div className="bubble-wobble rounded-full" style={{ width: 4, height: 4, background: 'hsl(var(--olo-glow) / 0.35)' }} />
      </div>
      <div className="absolute bottom-5 bubble" style={{ left: '61%', animationDuration: '12s', animationDelay: '-8s' }}>
        <div className="bubble-wobble rounded-full" style={{ width: 3, height: 3, background: 'hsl(var(--olo-glow) / 0.3)' }} />
      </div>
      <div className="absolute bottom-2 bubble" style={{ left: '88%', animationDuration: '17s', animationDelay: '-13s' }}>
        <div className="bubble-wobble rounded-full" style={{ width: 5, height: 5, background: 'hsl(var(--olo-glow) / 0.28)' }} />
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="absolute" style={{ left: '6%', bottom: 0 }}><GrassTuft blades={5} height={62} sway="blade-sway-b" /></div>
        <div className="absolute opacity-70" style={{ left: '22%', bottom: 0 }}><GrassTuft blades={3} height={40} sway="blade-sway-c" /></div>
        <div className="absolute" style={{ left: '48%', bottom: 0 }}><GrassTuft blades={4} height={54} sway="blade-sway-a" /></div>
        <div className="absolute opacity-70" style={{ left: '78%', bottom: 0 }}><GrassTuft blades={3} height={36} sway="blade-sway-b" /></div>
        <div className="absolute" style={{ left: '90%', bottom: 0 }}><GrassTuft blades={5} height={58} sway="blade-sway-c" /></div>
        <div className="absolute" style={{ left: '14%', bottom: '-2px' }}><Pebbles /></div>
        <div className="absolute opacity-80" style={{ left: '56%', bottom: '-2px' }}><Pebbles /></div>
        <div className="absolute" style={{ left: '84%', bottom: '-2px' }}><Pebbles /></div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="absolute" style={{ left: 0, bottom: '14px' }}>
          <div className="seabed-fish"><Fish /></div>
        </div>
        <div className="absolute" style={{ left: 0, bottom: '30px' }}>
          <div className="seabed-fish" style={{ animationDelay: '-15s', animationDuration: '34s' }}><Fish /></div>
        </div>
        <div className="absolute" style={{ left: 0, bottom: 0 }}>
          <div className="crab-walker"><Crab /></div>
        </div>
        <div className="absolute" style={{ left: 0, bottom: '2px' }}>
          <div className="worm-walker"><Worm /></div>
        </div>
        <div className="absolute" style={{ left: 0, bottom: 0 }}>
          <div className="seabed-snail" style={{ animationDelay: '-35s' }}><Snail /></div>
        </div>
        <div className="absolute" style={{ left: '34%', bottom: 0 }}>
          <Clam />
        </div>
        <div className="absolute" style={{ left: '64%', bottom: '2px' }}>
          <Barnacles className="seabed-barnacle" />
        </div>
        <div className="absolute" style={{ left: '18%', bottom: '2px' }}>
          <Barnacles className="seabed-barnacle" />
        </div>
        <div className="absolute opacity-90" style={{ left: '72%', bottom: 0 }}>
          <Starfish />
        </div>
      </div>

      <div
        className="absolute bottom-0 inset-x-0 h-[2px] bg-olo-glow"
        style={{ boxShadow: '0 0 14px 2px hsl(var(--olo-glow) / 0.75), 0 -1px 0 0 hsl(var(--olo-glow) / 0.35)' }}
      />
    </section>
  );
}