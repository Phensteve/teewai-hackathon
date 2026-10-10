import { useState, useEffect, lazy, Suspense } from 'react';
import { unrufld } from '@/api/unrufldClient';
import heroConfig from '@/components/landing/heroVariants.json';
import HeroScanInvite from '@/components/landing/HeroScanInvite';

// The default hero (scanInvite) ships in the initial bundle so the LCP
// paints immediately. The other two variants load on demand only if an
// admin override switches the live variant — keeps the hero chunk small.
const HeroClassic = lazy(() => import('@/components/landing/HeroClassic'));
const HeroProofBar = lazy(() => import('@/components/landing/HeroProofBar'));

// Hero switcher — renders the active variant. The default comes from
// heroVariants.json (code default), but a super_admin can override it live
// from the Admin → Hero tab; the override is stored in site_settings and
// returned by the publicStats function, so it takes effect instantly for
// every visitor with no deploy.
const HEROES = { HeroClassic, HeroScanInvite, HeroProofBar };

export default function LandingHero() {
  const [key, setKey] = useState(heroConfig.active);

  useEffect(() => {
    unrufld.functions.invoke('publicStats', {})
      .then((res) => {
        const v = res?.data?.heroVariant;
        if (v && heroConfig.variants[v]) setKey(v);
      })
      .catch(() => {});
  }, []);

  const variant = heroConfig.variants[key] || heroConfig.variants.classic;
  const Hero = HEROES[variant.component] || HeroScanInvite;
  return (
    <Suspense fallback={null}>
      <Hero />
    </Suspense>
  );
}