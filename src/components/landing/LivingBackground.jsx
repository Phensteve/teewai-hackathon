import { useRef, useEffect, useState } from 'react';

// Living underwater ambiance — real organic vines: tapered stems (wide at
// the base, narrowing to the tip) with leaves splayed along each stem, all
// swaying gently from their base. Plus drifting caustic light (incl. one
// broad, slow "sunlight through water" drift), a breathing water-surface glow,
// faint rising light streaks, and rising bubbles. All GPU-friendly
// (transform/opacity only), slow and eased so it never jitters,
// pointer-events-none, paused for prefers-reduced-motion, AND paused via
// IntersectionObserver when the layer is scrolled out of view. The same
// renderer + vine data is used in every section so the vines are consistent
// from section to section. Reads as kelp/seaweed on dark and leafy tendrils
// on white.

// Cubic bezier sample (n+1 points).
function sampleBezier(p0, p1, p2, p3, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    const x = mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0];
    const y = mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1];
    pts.push([x, y]);
  }
  return pts;
}

// One organic vine: a tapered stem outline + leaves splayed along it + a tip
// bud. Sways as a whole from its base (the parent <g> carries the sway class).
function Vine({ p0, p1, p2, p3, baseWidth = 8, leafCount = 4, cls, dur, delay, top = false }) {
  const n = 16;
  const pts = sampleBezier(p0, p1, p2, p3, n);
  // tangents via finite difference
  const tans = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  });
  // tapered outline (half-width shrinks toward the tip)
  const left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const hw = (baseWidth * (1 - t * 0.84)) * 0.5;
    const [tx, ty] = tans[i];
    const nx = -ty, ny = tx; // perpendicular
    left.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw]);
    right.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw]);
  }
  const leftPath = left.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const rightPath = right.slice().reverse().map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const outline = `${leftPath} ${rightPath} Z`;

  // leaves splayed along the stem, alternating sides
  const leaves = [];
  for (let k = 0; k < leafCount; k++) {
    const t = 0.16 + (k / Math.max(1, leafCount - 1)) * 0.72;
    const idx = Math.min(n, Math.round(t * n));
    const [x, y] = pts[idx];
    const [tx, ty] = tans[idx];
    const stemAngle = Math.atan2(ty, tx) * 180 / Math.PI;
    const side = k % 2 === 0 ? 1 : -1;
    // Leaf "up" sits at -90°; rotate so it points ~45° outward from the stem
    // (up-and-out for bottom-rooted vines, down-and-out for hanging ones).
    const leafAngle = stemAngle + 90 + side * 45;
    leaves.push({ x, y, angle: leafAngle, scale: 0.7 + (1 - t) * 0.5 });
  }

  const durNum = parseFloat(dur) || 12;
  return (
    <g className={`vine ${top ? 'vine-top' : ''} ${cls}`} style={{ animationDuration: dur, animationDelay: delay }}>
      <g
        className="vine-sway-2"
        style={{ transformBox: 'fill-box', transformOrigin: top ? '50% 0' : '50% 100%', animationDuration: `${durNum + 3}s`, animationDelay: `${(durNum * -0.4).toFixed(1)}s` }}
      >
        <path d={outline} fill={top ? 'url(#vineStemGradTop)' : 'url(#vineStemGrad)'} opacity="0.9" />
        {leaves.map((l, i) => (
          <g key={i} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(1)}) scale(${l.scale.toFixed(2)})`}>
            <path
              d="M 0 0 C 3.2 -4.5, 4.2 -11, 0 -16 C -4.2 -11, -3.2 -4.5, 0 0 Z"
              className="leaf-flutter"
              fill="url(#vineLeafGrad)"
              opacity="0.85"
              style={{ animationDelay: `${(i * 0.7).toFixed(2)}s`, animationDuration: `${4.5 + (i % 3)}s` }}
            />
          </g>
        ))}
        <circle cx={pts[n][0]} cy={pts[n][1]} r={baseWidth * 0.42} fill="hsl(var(--olo-glow))" opacity="0.95" />
      </g>
    </g>
  );
}

const VINES = [
  { p0: [70, 900], p1: [140, 720], p2: [40, 520], p3: [110, 340], dur: '12s', delay: '0s', cls: 'vine-a' },
  { p0: [250, 900], p1: [300, 700], p2: [200, 500], p3: [260, 320], dur: '15s', delay: '-3s', cls: 'vine-b' },
  { p0: [430, 900], p1: [380, 690], p2: [480, 490], p3: [410, 310], dur: '10s', delay: '-1s', cls: 'vine-c' },
  { p0: [610, 900], p1: [670, 710], p2: [570, 510], p3: [630, 330], dur: '13s', delay: '-5s', cls: 'vine-a' },
  { p0: [790, 900], p1: [740, 680], p2: [840, 490], p3: [780, 300], dur: '16s', delay: '-2s', cls: 'vine-b' },
  { p0: [970, 900], p1: [1030, 700], p2: [920, 500], p3: [990, 320], dur: '11s', delay: '-6s', cls: 'vine-c' },
  { p0: [1150, 900], p1: [1100, 690], p2: [1200, 490], p3: [1140, 310], dur: '14s', delay: '-4s', cls: 'vine-a' },
  { p0: [1330, 900], p1: [1380, 710], p2: [1280, 510], p3: [1350, 340], dur: '12s', delay: '-7s', cls: 'vine-b' },
];

const VINES_TOP = [
  { p0: [200, 0], p1: [150, 200], p2: [250, 380], p3: [190, 560], dur: '13s', delay: '-1s', cls: 'vine-a' },
  { p0: [620, 0], p1: [680, 210], p2: [560, 390], p3: [630, 570], dur: '16s', delay: '-4s', cls: 'vine-b' },
  { p0: [1040, 0], p1: [990, 200], p2: [1090, 380], p3: [1020, 560], dur: '11s', delay: '-6s', cls: 'vine-c' },
];

// Extra hanging vines — desktop only (hidden below lg via the wrapping <g>).
// Fills the wider desktop viewport with more top tendrils so it doesn't look
// sparse compared to the dense mobile view.
const VINES_TOP_DESKTOP_EXTRA = [
  { p0: [80, 0], p1: [130, 180], p2: [40, 360], p3: [100, 520], dur: '14s', delay: '-2s', cls: 'vine-b' },
  { p0: [410, 0], p1: [370, 190], p2: [450, 370], p3: [390, 540], dur: '12s', delay: '-5s', cls: 'vine-a' },
  { p0: [830, 0], p1: [880, 200], p2: [780, 380], p3: [850, 550], dur: '15s', delay: '-3s', cls: 'vine-c' },
  { p0: [1240, 0], p1: [1200, 190], p2: [1290, 370], p3: [1230, 540], dur: '13s', delay: '-7s', cls: 'vine-a' },
  { p0: [1360, 0], p1: [1400, 200], p2: [1320, 380], p3: [1380, 560], dur: '16s', delay: '-1s', cls: 'vine-b' },
];

export default function LivingBackground() {
  const ref = useRef(null);
  const vineWrapRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Subtle cursor parallax — the whole vine field leans toward the pointer.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e) => {
      if (pausedRef.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const wrap = vineWrapRef.current;
        if (!wrap) return;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        wrap.style.transform = `translate(${(nx * 6).toFixed(1)}px, ${(ny * 4).toFixed(1)}px) rotate(${(nx * 0.4).toFixed(2)}deg)`;
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden pointer-events-none ${paused ? 'lb-paused' : ''}`} aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          {/* Bottom-rooted stems: opaque glow at the base (bottom), fading to
              transparent at the tip (top of the bbox). */}
          <linearGradient id="vineStemGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--olo))" stopOpacity="0.05" />
            <stop offset="45%" stopColor="hsl(var(--olo))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--olo-glow))" stopOpacity="0.75" />
          </linearGradient>
          {/* Top-hanging stems: opaque at the base (top), fading to the tip. */}
          <linearGradient id="vineStemGradTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--olo-glow))" stopOpacity="0.7" />
            <stop offset="55%" stopColor="hsl(var(--olo))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--olo))" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="vineLeafGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--olo-glow))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--olo))" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <g ref={vineWrapRef} style={{ transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)', transformBox: 'fill-box', transformOrigin: 'center' }}>
          <g opacity="0.92">
            {VINES.map((v, i) => (
              <Vine key={`b${i}`} {...v} />
            ))}
          </g>
          <g opacity="0.8">
            {VINES_TOP.map((v, i) => (
              <Vine key={`t${i}`} {...v} top />
            ))}
          </g>
          {/* Extra hanging vines — desktop only */}
          <g opacity="0.75" className="hidden lg:inline">
            {VINES_TOP_DESKTOP_EXTRA.map((v, i) => (
              <Vine key={`td${i}`} {...v} top />
            ))}
          </g>
        </g>
      </svg>

      {/* Drifting caustic light + one broad, slow "sunlight through water" drift */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] caustic" style={{ background: 'radial-gradient(circle, hsl(var(--olo-glow) / 0.14), transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] caustic" style={{ background: 'radial-gradient(circle, hsl(var(--olo) / 0.12), transparent 70%)', animationDuration: '22s', animationDelay: '-7s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] rounded-full blur-[170px] caustic" style={{ background: 'radial-gradient(circle, hsl(var(--olo-glow) / 0.08), transparent 70%)', animationDuration: '28s', animationDelay: '-10s' }} />

      {/* Faint water-surface glow that breathes */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 water-breathe" style={{ background: 'linear-gradient(to top, hsl(var(--olo-glow) / 0.1), transparent 75%)' }} />

      {/* Water surface shimmer at the top — looking up toward the surface */}
      <div className="absolute inset-x-0 top-0 h-1/3 water-breathe" style={{ background: 'linear-gradient(to bottom, hsl(var(--olo-glow) / 0.12), transparent 70%)', animationDuration: '11s', animationDelay: '-2s' }} />

      {/* Rising light streaks — water being poured in */}
      <div className="absolute left-1/4 bottom-8 w-px h-32 water-rise" style={{ background: 'linear-gradient(to top, transparent, hsl(var(--olo-glow) / 0.4), transparent)' }} />
      <div className="absolute left-2/3 bottom-8 w-px h-40 water-rise" style={{ background: 'linear-gradient(to top, transparent, hsl(var(--olo-glow) / 0.35), transparent)', animationDuration: '18s', animationDelay: '-6s' }} />
      <div className="absolute left-[85%] bottom-8 w-px h-28 water-rise" style={{ background: 'linear-gradient(to top, transparent, hsl(var(--olo-glow) / 0.3), transparent)', animationDuration: '14s', animationDelay: '-3s' }} />

      {/* Rising bubbles */}
      <div className="absolute bottom-6 rounded-full bubble" style={{ left: '12%', width: 6, height: 6, background: 'hsl(var(--olo-glow) / 0.4)', animationDuration: '17s', animationDelay: '0s' }} />
      <div className="absolute bottom-10 rounded-full bubble" style={{ left: '34%', width: 4, height: 4, background: 'hsl(var(--olo-glow) / 0.3)', animationDuration: '21s', animationDelay: '-6s' }} />
      <div className="absolute bottom-4 rounded-full bubble" style={{ left: '58%', width: 8, height: 8, background: 'hsl(var(--olo-glow) / 0.35)', animationDuration: '19s', animationDelay: '-12s' }} />
      <div className="absolute bottom-12 rounded-full bubble" style={{ left: '82%', width: 5, height: 5, background: 'hsl(var(--olo-glow) / 0.4)', animationDuration: '23s', animationDelay: '-3s' }} />
      <div className="absolute bottom-8 rounded-full bubble" style={{ left: '24%', width: 5, height: 5, background: 'hsl(var(--olo-glow) / 0.35)', animationDuration: '20s', animationDelay: '-9s' }} />
      <div className="absolute bottom-6 rounded-full bubble" style={{ left: '70%', width: 7, height: 7, background: 'hsl(var(--olo-glow) / 0.3)', animationDuration: '22s', animationDelay: '-15s' }} />
      <div className="absolute bottom-10 rounded-full bubble" style={{ left: '46%', width: 4, height: 4, background: 'hsl(var(--olo-glow) / 0.4)', animationDuration: '18s', animationDelay: '-4s' }} />

      {/* Soft teal vignette — darkens the edges for underwater depth */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(125% 90% at 50% 45%, transparent 55%, hsl(var(--olo-deep) / 0.22) 100%)' }} />
    </div>
  );
}