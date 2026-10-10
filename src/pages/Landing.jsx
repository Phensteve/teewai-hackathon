import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import { useState, useEffect, Suspense, lazy } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { isNativeApp } from '@/lib/isNativeApp';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import LandingConfidenceStrip from '@/components/landing/LandingConfidenceStrip';
import LiquidCursor from '@/components/landing/LiquidCursor';

// Zoah-inspired life strips — lazy-loaded off the critical path.
// The living underwater background is a heavy SVG (11 vines + ~20 animated
// layers). It's fixed behind everything, so deferring it off the critical
// path lets the hero paint first; the dark page-underwater-bg gradient
// covers the gap until the vines arrive a moment later.
const LivingBackground = lazyWithRetry(() => import('@/components/landing/LivingBackground'));

// Below-the-fold sections are split into their own chunks so the hero paints
// with the smallest possible initial JS bundle (better LCP / TBT on slow
// connections). Each loads on demand as the user scrolls into it.
const LandingPhoneShowcase = lazyWithRetry(() => import('@/components/landing/LandingPhoneShowcase'));
const LandingScanDemo = lazyWithRetry(() => import('@/components/landing/LandingScanDemo'));
const LandingHowItWorks = lazyWithRetry(() => import('@/components/landing/LandingHowItWorks'));
const LandingFeatures = lazyWithRetry(() => import('@/components/landing/LandingFeatures'));
const LandingFoodScan = lazyWithRetry(() => import('@/components/landing/LandingFoodScan'));
const LandingRareColor = lazyWithRetry(() => import('@/components/landing/LandingRareColor'));
const LandingGoalFeedback = lazyWithRetry(() => import('@/components/landing/LandingGoalFeedback'));
const LandingPricing = lazyWithRetry(() => import('@/components/landing/LandingPricing'));
const LandingDentistPortal = lazyWithRetry(() => import('@/components/landing/LandingDentistPortal'));
const LandingFAQ = lazyWithRetry(() => import('@/components/landing/LandingFAQ'));
const LandingTestimonials = lazyWithRetry(() => import('@/components/landing/LandingTestimonials'));
const LandingCTA = lazyWithRetry(() => import('@/components/landing/LandingCTA'));
const LandingGetApp = lazyWithRetry(() => import('@/components/landing/LandingGetApp'));
const LandingSeabed = lazyWithRetry(() => import('@/components/landing/LandingSeabed'));
const LandingFooter = lazyWithRetry(() => import('@/components/landing/LandingFooter'));

export default function Landing() {
  // In the APK the landing page is skipped: signed-in users go straight to
  // their dashboard, everyone else lands on the signup page.
  const native = isNativeApp();
  const [nativeTarget, setNativeTarget] = useState(null);

  useEffect(() => {
    if (!native) return;
    unrufld.auth.isAuthenticated()
      .then((authed) => setNativeTarget(authed ? '/dashboard' : '/register'))
      .catch(() => setNativeTarget('/register'));
  }, [native]);

  if (native) {
    if (nativeTarget) {
      // Full-page redirect — avoids <Navigate> Router context issues during
      // the async auth check. This is a top-level redirect anyway (landing →
      // dashboard or register), so a full page load is the right behavior.
      window.location.href = nativeTarget;
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-muted border-t-olo rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative page-underwater-bg overflow-x-clip">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Suspense fallback={null}><LivingBackground /></Suspense>
      </div>
      <LiquidCursor />
      <LandingNav />
      <LandingHero />
      <LandingConfidenceStrip />
      <Suspense fallback={null}><LandingPhoneShowcase /></Suspense>
      <Suspense fallback={null}><LandingScanDemo /></Suspense>
      <Suspense fallback={null}><LandingHowItWorks /></Suspense>
      <Suspense fallback={null}><LandingFeatures /></Suspense>
      <Suspense fallback={null}><LandingFoodScan /></Suspense>
      <Suspense fallback={null}><LandingRareColor /></Suspense>
      <Suspense fallback={null}><LandingGoalFeedback /></Suspense>
      <Suspense fallback={null}><LandingTestimonials /></Suspense>
      <Suspense fallback={null}><LandingPricing /></Suspense>
      <Suspense fallback={null}><LandingDentistPortal /></Suspense>
      <Suspense fallback={null}><LandingFAQ /></Suspense>
      <Suspense fallback={null}><LandingCTA /></Suspense>
      <Suspense fallback={null}><LandingGetApp /></Suspense>
      <Suspense fallback={null}><LandingSeabed /></Suspense>
      <Suspense fallback={null}><LandingFooter /></Suspense>
    </div>
  );
}