import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Stethoscope } from 'lucide-react';
// The three.js background is the heaviest asset on this page — load it in its
// own chunk after the content has painted so text/CTAs appear immediately.
const HomeTestCanvas = lazy(() => import('@/components/hometest/HomeTestCanvas'));
import HomeTestNav from '@/components/hometest/HomeTestNav';
import HomeTestHero from '@/components/hometest/HomeTestHero';
import HomeTestStory from '@/components/hometest/HomeTestStory';
import HomeTestRareColor from '@/components/hometest/HomeTestRareColor';
import HomeTestClosing from '@/components/hometest/HomeTestClosing';
import CraftManifesto from '@/components/hometest/CraftManifesto';
import NerdLab from '@/components/hometest/NerdLab';
import HomeTestFeedbackLoop from '@/components/hometest/HomeTestFeedbackLoop';
import HomeTestApp from '@/components/hometest/HomeTestApp';
import HomeTestLiveDemo from '@/components/hometest/HomeTestLiveDemo';
import HomeTestDentist from '@/components/hometest/HomeTestDentist';
import HomeTestVoices from '@/components/hometest/HomeTestVoices';
import HomeTestPricing from '@/components/hometest/HomeTestPricing';

import HomeTestFooter from '@/components/hometest/HomeTestFooter';
import SpaceEventToasts from '@/components/hometest/SpaceEventToasts';
import SmartCTA from '@/components/hometest/SmartCTA';

export default function HomeTest() {
  const [showCanvas, setShowCanvas] = useState(false);

  // Mount the 3D scene once the browser is idle — keeps first paint fast.
  useEffect(() => {
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setShowCanvas(true), { timeout: 1200 })
      : setTimeout(() => setShowCanvas(true), 300);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('reveal-in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="paper-texture relative bg-[#06121a] text-[#eaf4f1] min-h-screen overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`[data-reveal]{opacity:0;transform:translateY(36px);transition:opacity 1s cubic-bezier(0.16,1,0.3,1),transform 1s cubic-bezier(0.16,1,0.3,1)}[data-reveal].reveal-in{opacity:1;transform:translateY(0)}main h1,main h2,main h3{text-shadow:0 2px 30px rgba(6,18,26,0.45)}`}</style>
      {showCanvas && <Suspense fallback={null}><HomeTestCanvas /></Suspense>}
      {/* Vignette to focus the center and deepen edges for text readability */}
      <div className="fixed inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 48%, rgba(6,18,26,0.8) 100%)' }} />
      <HomeTestNav />
      <main className="relative z-10">
        <HomeTestHero />
        <div className="relative bg-gradient-to-b from-transparent via-[#06121a]/55 to-[#06121a]/82">
          <HomeTestStory />
          <HomeTestLiveDemo />
          <HomeTestRareColor />
          <NerdLab />
          <HomeTestFeedbackLoop />
          <CraftManifesto />
          <HomeTestClosing />
          <HomeTestApp />
          <HomeTestVoices />
          <HomeTestPricing />
          <HomeTestDentist />
          <section className="relative px-4 py-24 text-center">
            <div data-reveal>
              <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight">Ready to see your <span className="font-600 text-[#5eead4]">shade?</span></h2>
              <SmartCTA loggedInTo="/dashboard" className="group inline-flex items-center gap-2 mt-8 bg-[#0d9f8e] text-white font-semibold px-8 py-4 rounded-xl text-base hover:scale-[1.03] transition-transform" style={{ boxShadow: '0 0 50px -10px rgba(13,159,142,0.6)' }}>
                Scan my teeth <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </SmartCTA>
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0d9f8e]/30 bg-[#0d9f8e]/8">
                <Star className="w-3.5 h-3.5 text-[#5eead4]" />
                <span className="text-xs font-semibold text-white/90">Your first scan is free — no credit card needed</span>
              </div>
              <br/>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
                <Stethoscope className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                <span className="text-xs text-white/50">teewai is a wellness companion — not a medical device. We strongly advise you to visit your dentist.</span>
              </div>
            </div>
          </section>
        </div>
      </main>
      <HomeTestFooter />
      <SpaceEventToasts />
    </div>
  );
}