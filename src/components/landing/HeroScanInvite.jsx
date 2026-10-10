import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { ArrowRight, Star, Droplet } from 'lucide-react';

// VITA shade gradient strip (lightest → darkest) sampled from teewai's
// calibrated reference card — used in the hero floating shade chip.
const SHADE_STRIP = ['#FBFAF5', '#E9DCC5', '#E2D3B9', '#E0CCA9', '#C9A978', '#8B8A87'];

// Blade-like seagrass planted in the seabed — thick filled tapered leaves that
// emerge from the dark floor at the bottom of the hero, with a soft midrib
// highlight and a gentle grounded sway (rooted, not floating).
// Base blades — always visible (all viewports). Fewer so the desktop seabed
// isn't overcrowded.
const BLADES = [
  { x: 30, h: 240, w: 9, bend: -8, d: '11s', delay: '0s', c: 'blade-sway-a' },
  { x: 175, h: 210, w: 11, bend: -12, d: '12s', delay: '-1s', c: 'blade-sway-c' },
  { x: 345, h: 256, w: 10, bend: -10, d: '11.5s', delay: '-2s', c: 'blade-sway-b' },
  { x: 565, h: 224, w: 8, bend: -14, d: '12.5s', delay: '-4s', c: 'blade-sway-a' },
  { x: 795, h: 288, w: 9, bend: -8, d: '11s', delay: '-7s', c: 'blade-sway-c' },
  { x: 1025, h: 200, w: 8, bend: -12, d: '12s', delay: '-5s', c: 'blade-sway-b' },
  { x: 1265, h: 264, w: 9, bend: -10, d: '11.5s', delay: '-6s', c: 'blade-sway-a' },
];

// Extra blades — mobile/tablet only (hidden on desktop via lg:hidden on the
// wrapping <g>). Keeps the seabed lush on small screens but uncluttered on
// desktop where the wider viewport already has good coverage.
const BLADES_MOBILE_EXTRA = [
  { x: 95, h: 384, w: 8, bend: 10, d: '13s', delay: '-3s', c: 'blade-sway-b' },
  { x: 255, h: 368, w: 9, bend: 14, d: '14s', delay: '-5s', c: 'blade-sway-a' },
  { x: 455, h: 396, w: 12, bend: 12, d: '13.5s', delay: '-6s', c: 'blade-sway-c' },
  { x: 675, h: 352, w: 11, bend: 10, d: '14.5s', delay: '-1s', c: 'blade-sway-b' },
  { x: 905, h: 376, w: 12, bend: 12, d: '13s', delay: '-3s', c: 'blade-sway-a' },
  { x: 1145, h: 336, w: 11, bend: 10, d: '14s', delay: '-2s', c: 'blade-sway-c' },
  { x: 1370, h: 392, w: 12, bend: 12, d: '13.5s', delay: '-4s', c: 'blade-sway-b' },
];

function BladeGrass() {
  return (
    <svg className="absolute bottom-0 inset-x-0 w-full h-[50vh] pointer-events-none" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="bladeGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--olo-glow))" stopOpacity="0.85" />
          <stop offset="55%" stopColor="hsl(var(--olo))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--olo))" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {BLADES.map((b, i) => (
        <g key={i} className={b.c} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', animationDuration: b.d, animationDelay: b.delay }}>
          {/* filled tapered blade, rooted at the seabed */}
          <path d={`M ${b.x - b.w} 400 C ${b.x - b.w} ${400 - b.h * 0.45}, ${b.x + b.bend * 0.3} ${400 - b.h * 0.78}, ${b.x + b.bend} ${400 - b.h} C ${b.x + b.bend} ${400 - b.h * 0.82}, ${b.x + b.w} ${400 - b.h * 0.55}, ${b.x + b.w} 400 Z`} fill="url(#bladeGrad)" />
          {/* midrib highlight */}
          <path d={`M ${b.x} 400 C ${b.x} ${400 - b.h * 0.5}, ${b.x + b.bend * 0.5} ${400 - b.h * 0.8}, ${b.x + b.bend} ${400 - b.h}`} stroke="hsl(var(--olo-glow) / 0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* Extra blades visible only below the lg breakpoint */}
      <g className="lg:hidden">
        {BLADES_MOBILE_EXTRA.map((b, i) => (
          <g key={`m${i}`} className={b.c} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', animationDuration: b.d, animationDelay: b.delay }}>
            <path d={`M ${b.x - b.w} 400 C ${b.x - b.w} ${400 - b.h * 0.45}, ${b.x + b.bend * 0.3} ${400 - b.h * 0.78}, ${b.x + b.bend} ${400 - b.h} C ${b.x + b.bend} ${400 - b.h * 0.82}, ${b.x + b.w} ${400 - b.h * 0.55}, ${b.x + b.w} 400 Z`} fill="url(#bladeGrad)" />
            <path d={`M ${b.x} 400 C ${b.x} ${400 - b.h * 0.5}, ${b.x + b.bend * 0.5} ${400 - b.h * 0.8}, ${b.x + b.bend} ${400 - b.h}`} stroke="hsl(var(--olo-glow) / 0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>
    </svg>
  );
}

// Interactive scan-invite hero — the CTA IS the product: a glowing camera
// ring with "Scan my teeth" inside, Saturn-style rotating halo rings with
// orbiting sparkles, blade seagrass planted in the seabed, and the friction
// reducer + social proof anchored below. Scales fluidly from phone to desktop.
export default function HeroScanInvite() {
  const [scanCount, setScanCount] = useState(null);
  useEffect(() => {
    unrufld.functions.invoke('publicStats', {})
      .then((res) => setScanCount(res.data?.totalScans ?? null))
      .catch(() => setScanCount(null));
  }, []);

  return (
    <section className="relative z-10 h-[100svh] min-h-screen overflow-hidden text-white pt-20 sm:pt-20 md:pt-24 lg:pt-28 pb-6 sm:pb-8 px-4 sm:px-6 flex items-center justify-center">
      <div className="absolute inset-0 radial-olo" />
      {/* Seabed floor — darkens the bottom so the blades read as planted */}
      <div className="absolute bottom-0 inset-x-0 h-[14%] sm:h-[16%] pointer-events-none" style={{ background: 'linear-gradient(to top, hsl(var(--olo-deep) / 0.92), transparent)' }} />
      <BladeGrass />

      <div className="relative z-10 w-full mx-auto max-w-7xl flex flex-col items-center text-center justify-center gap-4 sm:gap-5">
        <h1 className="mt-0 font-body font-900 text-[min(2.25rem,8vw)] leading-[1.05] sm:text-[min(2.25rem,6svh)] md:text-[min(3rem,7svh)] lg:text-[min(3.75rem,7.5svh)] tracking-tight text-balance max-w-3xl">
          Your smile, scored in{' '}
          <br className="sm:hidden" />
          <span className="text-olo-glow olo-text-glow">90 seconds</span>
        </h1>

        {/* Scan ring — the primary CTA */}
        <div className="scan-ring-group relative w-[min(72vw,280px)] sm:w-[min(44vw,340px,44svh)] md:w-[min(360px,44svh)] lg:w-[min(440px,46svh)] aspect-square flex items-center justify-center">
          {/* Heavenly halo — blooms on hover */}
          <div className="ring-halo absolute inset-[-32%] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--olo-glow) / 0.38), transparent 62%)', filter: 'blur(34px)' }} aria-hidden="true" />
 
          {/* Ezekiel "wheels within wheels" halo — each ring both spins (in its
              own plane) AND revolves (its tilted plane orbits the center),
              so the rings tumble and orbit in different directions, not
              just spin in place. */}
          <div className="absolute inset-[-18%] pointer-events-none" style={{ transformStyle: 'preserve-3d' }} aria-hidden="true">
            {/* Outer ring — revolves CCW, tilted, spins CW + sparkle */}
            <div className="absolute inset-0 ring-revolve-ccw" style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0" style={{ transform: 'rotateX(72deg) rotateZ(-8deg)' }}>
                <div className="ring-orbit absolute inset-0 rounded-full border border-olo-glow/30" />
                <div className="absolute inset-0 ring-spin">
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-olo-glow" style={{ boxShadow: '0 0 14px 4px hsl(var(--olo-glow) / 0.75)' }} />
                </div>
              </div>
            </div>
            {/* Second ring — revolves CW, tilted, spins CCW (dashes) + sparkle */}
            <div className="absolute inset-[7%] ring-revolve-cw" style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0" style={{ transform: 'rotateX(62deg) rotateZ(14deg)' }}>
                <div className="ring-orbit absolute inset-0 rounded-full border-2 border-dashed border-olo/25 ring-spin-rev" />
                <div className="absolute inset-0 ring-spin-rev">
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-olo-glow" style={{ boxShadow: '0 0 9px 3px hsl(var(--olo-glow) / 0.7)' }} />
                </div>
              </div>
            </div>
            {/* Third ring — revolves CCW fast, tilted, spins CW fast (dotted) */}
            <div className="absolute inset-[14%] ring-revolve-ccw-fast" style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0" style={{ transform: 'rotateX(78deg) rotateZ(-22deg)' }}>
                <div className="ring-orbit absolute inset-0 rounded-full border-2 border-dotted border-olo-glow/20 ring-spin-fast" />
              </div>
            </div>
            {/* Inner ring — revolves CW slow, shallow tilt, spins CCW + sparkle */}
            <div className="absolute inset-[20%] ring-revolve-cw-slow" style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0" style={{ transform: 'rotateX(24deg) rotateZ(6deg)' }}>
                <div className="ring-orbit absolute inset-0 rounded-full border border-olo/15" />
                <div className="absolute inset-0 ring-spin-slow">
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: '0 0 10px 3px hsl(var(--olo-glow) / 0.6)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Bleed glow */}
          <div className="absolute inset-0 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--olo-glow) / 0.45), transparent 68%)' }} aria-hidden="true" />

          {/* Ambient pulse rings — subtle breathing borders that fill the space
              between the scan CTA and the floating cards. Very low opacity, slow
              staggered pulse — present but never competing with the CTA. */}
          <div className="absolute inset-[-8%] rounded-full border border-olo-glow/10 animate-pulse-glow pointer-events-none" style={{ animationDuration: '5s' }} aria-hidden="true" />
          <div className="absolute inset-[-18%] rounded-full border border-olo-glow/5 animate-pulse-glow pointer-events-none" style={{ animationDuration: '5s', animationDelay: '-2.5s' }} aria-hidden="true" />

          <Link
            to="/free-scan"
            aria-label="Scan my teeth, free, no signup"
            className="scan-cta group relative w-[78%] h-[78%] rounded-full flex items-center justify-center"
          >
            {/* Focus brackets */}
            {[
              'top-[16%] left-[16%] border-t-2 border-l-2 rounded-tl-xl',
              'top-[16%] right-[16%] border-t-2 border-r-2 rounded-tr-xl',
              'bottom-[16%] left-[16%] border-b-2 border-l-2 rounded-bl-xl',
              'bottom-[16%] right-[16%] border-b-2 border-r-2 rounded-br-xl',
            ].map((pos) => (
              <span key={pos} className={`absolute w-8 h-8 sm:w-10 sm:h-10 border-olo-glow/80 ${pos}`} />
            ))}
            <span className="scan-cta-text font-body font-800 text-base sm:text-2xl md:text-3xl lg:text-2xl text-white">Scan my teeth</span>
          </Link>

          {/* Floating result chips */}
          <div className="absolute top-[78%] sm:top-[48%] left-[-4%] sm:left-[-12%] lg:left-[-30%] -translate-y-1/2 animate-float" aria-hidden="true">
            <span className="inline-flex items-center gap-2 rounded-full glass px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-sm text-white/85 whitespace-nowrap">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-olo-glow/70 flex items-center justify-center font-heading font-700 text-[10px] sm:text-xs text-white">87</span>
              Whiteness score
            </span>
          </div>

          <div className="absolute top-[4%] sm:top-[6%] right-[-4%] sm:right-[-12%] lg:right-[-30%] animate-float" style={{ animationDelay: '-2s' }} aria-hidden="true">
            <span className="inline-flex flex-col items-start gap-1.5 rounded-2xl glass px-2.5 py-2 sm:px-3.5 sm:py-2.5 whitespace-nowrap">
              <span className="flex h-2 sm:h-2.5 w-20 sm:w-28 rounded-full overflow-hidden border border-white/15">
                {SHADE_STRIP.map((c, i) => <span key={i} className="flex-1" style={{ backgroundColor: c }} />)}
              </span>
              <span className="text-[11px] sm:text-sm text-white/85">
                <span className="text-white/45">VITA</span> <span className="font-semibold text-white">A1 · Excellent</span>
              </span>
            </span>
          </div>

          <div className="absolute bottom-[14%] sm:bottom-[12%] right-[-4%] sm:right-[-12%] lg:right-[-30%] animate-float" style={{ animationDelay: '-4s' }} aria-hidden="true">
            <span className="inline-flex items-center gap-2 rounded-full glass px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-sm text-white/85 whitespace-nowrap">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true">
                <circle cx="8" cy="9" r="3.2" fill="hsl(var(--olo-glow))" opacity="0.85" />
                <circle cx="15.5" cy="13" r="2.4" fill="hsl(var(--olo-glow))" opacity="0.6" />
                <circle cx="10.5" cy="16.5" r="1.7" fill="hsl(var(--olo-glow))" opacity="0.5" />
              </svg>
              Stains <span className="font-semibold text-white">2</span>
            </span>
          </div>

          {/* Stain tracker chip — links to the stain tracker feature */}
          <Link
            to="/stain-tracker"
            className="absolute top-[20%] left-[-4%] sm:top-auto sm:bottom-[8%] sm:left-[-12%] lg:bottom-[10%] lg:left-[-30%] animate-float hover:scale-105 transition-transform"
            style={{ animationDelay: '-5s' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full glass border border-olo-glow/30 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-sm text-white/90 whitespace-nowrap">
              <Droplet className="w-4 h-4 text-olo-glow" />
              Stain tracker
            </span>
          </Link>

          {/* Ambient sparkles — tiny drifting dots that fill the empty space
              between the floating cards and the scan ring. Very low opacity,
              small, slow float — present but never competing with the CTA. */}
          {[
            { top: '25%', left: '-8%', size: 5, delay: '0s', op: 0.4 },
            { top: '60%', left: '-14%', size: 3, delay: '-2s', op: 0.3 },
            { top: '15%', right: '-8%', size: 4, delay: '-1s', op: 0.35 },
            { top: '75%', right: '-12%', size: 3, delay: '-3.5s', op: 0.3 },
            { top: '42%', right: '-6%', size: 2, delay: '-4s', op: 0.25 },
            { top: '52%', left: '-6%', size: 2, delay: '-5s', op: 0.2 },
            { top: '35%', left: '48%', size: 2, delay: '-2.5s', op: 0.2 },
            { top: '82%', left: '44%', size: 3, delay: '-6s', op: 0.25 },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-olo-glow animate-float pointer-events-none"
              style={{
                top: p.top,
                left: p.left,
                right: p.right,
                width: p.size,
                height: p.size,
                opacity: p.op,
                boxShadow: `0 0 ${p.size * 2.5}px hsl(var(--olo-glow) / 0.5)`,
                animationDelay: p.delay,
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Secondary CTA + friction reducer + social proof */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-sm">
          <a href="#how" className="group inline-flex items-center gap-1.5 text-white/80 font-medium hover:text-white transition-colors">
            See how it works
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {['#0d9f8e', '#16c2a6', '#5eead4', '#2dd4bf'].map((c, i) => (
                <span key={i} className="w-6 h-6 rounded-full border-2 border-olo-deep" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="font-heading font-700 text-base text-white tabular-nums">
                {scanCount == null ? <span className="inline-block w-10 h-4 rounded bg-white/15 animate-pulse align-middle" /> : `${Math.max(0, scanCount - 1).toLocaleString()}+`}
              </span>
              <span className="text-[11px] text-white/45 mt-1">smiles scanned</span>
            </div>
            <div className="flex items-center gap-0.5 text-olo-glow">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}