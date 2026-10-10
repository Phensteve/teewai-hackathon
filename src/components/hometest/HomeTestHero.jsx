import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Stethoscope, Gauge, Droplet, Route, Gift } from 'lucide-react';
import SmartCTA from './SmartCTA';
import HomeTestScanTracker from './HomeTestScanTracker';
import { HandStar } from './HandDrawn';

const SHADE_STRIP = ['#8a5a2b', '#c9a24a', '#e3c878', '#f3e6b8', '#fdf6e3', '#ffffff'];

function FloatingAnalysisCard({ scrollY }) {
  const opacity = Math.max(0, 1 - scrollY / 700);
  const translateY = Math.min(20, scrollY * 0.03);
  if (opacity <= 0.01) return null;
  return (
    <div
      className="hidden lg:block fixed bottom-6 right-6 z-20 pointer-events-none"
      style={{ opacity, transform: `translateY(${translateY}px)`, transition: 'opacity 0.3s ease' }}
    >
      <div
        className="relative w-[290px] rounded-2xl border border-[#0d9f8e]/30 bg-[#06121a]/85 backdrop-blur-xl p-5"
        style={{ boxShadow: '0 0 50px -10px rgba(13,159,142,0.3)', animation: 'fade-up 0.9s 0.8s both' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute left-0 right-0 h-[1.5px] bg-[#2dd4bf]/50" style={{ boxShadow: '0 0 10px 1px rgba(45,212,191,0.4)', animation: 'scan-line 3.5s ease-in-out infinite' }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#2dd4bf]">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#2dd4bf] animate-ping opacity-75" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#2dd4bf]" />
            </span>
            AI analysis
          </span>
          <span className="text-[10px] text-white/40">teewai vision</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full border-[3px] border-[#0d9f8e]/30 flex items-center justify-center flex-shrink-0" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
            <span className="font-heading font-800 text-2xl text-[#5eead4]">87</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-white/60 uppercase tracking-wider">Whiteness score</p>
            <p className="font-heading font-600 text-sm text-white">Shade A1 · Excellent</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[9px] text-white/35 mb-1">
            <span>Stained</span><span>White</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden border border-white/10">
            {SHADE_STRIP.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
          {[{ l: 'Health', v: '92' }, { l: 'Stains', v: '2' }, { l: 'Weeks', v: '4' }].map((s) => (
            <div key={s.l} className="rounded-lg bg-white/5 py-2 border border-white/[0.04]">
              <p className="font-heading font-700 text-sm text-[#5eead4]">{s.v}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomeTestHero() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section id="hero" className="relative min-h-[100svh] flex items-center justify-center px-4">
      {/* Readability scrim — strengthened for text clarity over the 3D scene. */}
      <div
        className="absolute inset-0 -z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 82% 68% at 50% 42%, rgba(6,18,26,0.88), rgba(6,18,26,0.45) 58%, rgba(6,18,26,0.15) 82%, transparent 95%)' }}
      />
      <div className="relative text-center max-w-4xl mx-auto pt-28">
        <div data-reveal className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0d9f8e]/40 bg-[#06121a]/60 backdrop-blur-md mb-8">
          <Stethoscope className="w-3.5 h-3.5 text-[#2dd4bf]" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/90 font-semibold">AI Dental Analysis</span>
        </div>
        <h1 data-reveal className="font-heading font-200 leading-[0.92] tracking-tight text-[2.75rem] sm:text-7xl md:text-[5.5rem]" style={{ textShadow: '0 2px 60px rgba(6,18,26,0.95), 0 0 20px rgba(6,18,26,0.8)' }}>
          Whiten your teeth,<br />
          <span className="font-700 text-[#5eead4] inline-flex items-center gap-3" style={{ textShadow: '0 0 60px rgba(94,234,212,0.35), 0 2px 30px rgba(6,18,26,0.9)' }}>one shade at a time.<HandStar className="w-7 h-7 sm:w-9 sm:h-9 inline-block flex-shrink-0" color="#5eead4" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }} /></span>
        </h1>
        <p data-reveal className="mt-7 max-w-2xl mx-auto text-base sm:text-lg text-white/90 leading-relaxed font-light" style={{ textShadow: '0 1px 30px rgba(6,18,26,0.9), 0 0 15px rgba(6,18,26,0.7)' }}>
          One photo. An instant whiteness score, a personalized whitening plan, and progress you can actually see — every scan.
        </p>
        <div data-reveal className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <SmartCTA loggedInTo="/dashboard" className="group inline-flex items-center gap-2 bg-[#0d9f8e] text-white font-semibold px-8 py-4 rounded-2xl text-base hover:scale-[1.03] transition-transform" style={{ boxShadow: '0 0 60px -10px rgba(13,159,142,0.65)' }}>
            Scan my teeth <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </SmartCTA>
          <a href="#how" className="inline-flex items-center gap-2 text-white/90 font-medium px-8 py-4 rounded-2xl text-base border border-white/15 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">See how it works</a>
        </div>
        <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/75">
          {[{ icon: Gauge, label: 'Instant AI score' }, { icon: Droplet, label: 'Stain detection' }, { icon: Route, label: 'Personalized plan' }].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5" style={{ textShadow: '0 1px 16px rgba(6,18,26,0.8)' }}>
              <Icon className="w-4 h-4 text-[#2dd4bf]" /> {label}
            </span>
          ))}
        </div>
        <div data-reveal className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#0d9f8e]/40 bg-[#0d9f8e]/10 backdrop-blur-md" style={{ boxShadow: '0 0 30px -8px rgba(13,159,142,0.3)' }}>
            <Gift className="w-4 h-4 text-[#5eead4]" />
            <span className="text-sm font-semibold text-white">Your first scan is free</span>
            <span className="text-xs text-white/60">— no credit card needed</span>
          </div>
        </div>
        <div data-reveal className="mt-5 flex justify-center">
          <HomeTestScanTracker />
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-px h-12" style={{ background: 'linear-gradient(to bottom, transparent, rgba(45,212,191,0.6), transparent)' }} />
      </div>
      <FloatingAnalysisCard scrollY={scrollY} />
    </section>
  );
}