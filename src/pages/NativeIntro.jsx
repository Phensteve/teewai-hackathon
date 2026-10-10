import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { ScanArt, TrackArt, CommunityArt } from '@/components/onboarding/OnboardingArt';

// APK-only pre-sign-in onboarding. 3 content slides + 1 CTA slide.
// Each slide has a DIFFERENT layout composition (text position varies):
//   Slide 1 — "Hero": art top centered, text BOTTOM LEFT
//   Slide 2 — "Split": art right, text VERTICALLY CENTERED LEFT
//   Slide 3 — "Centered": art top, text BOTTOM CENTER
// Transitions use Framer Motion spring physics + drag gestures (swipe to
// advance) for a smooth, seamless, sleek feel. Back button on the CTA slide.

const SLIDES = [
  {
    Art: ScanArt,
    title: 'Scan your smile in seconds',
    subtitle: 'Snap a photo and get an instant whiteness score, VITA shade match, and AI powered analysis. No dentist visit needed.',
    layout: 'hero',
  },
  {
    Art: TrackArt,
    title: 'Track your progress daily',
    subtitle: 'Watch your shade improve over time with a personalized whitening timeline, milestones, and daily streaks.',
    layout: 'split',
  },
  {
    Art: CommunityArt,
    title: 'Community and expert tips',
    subtitle: 'Join thousands of smile enthusiasts, share your journey, and get tips backed by real dental science.',
    layout: 'centered',
  },
];

const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 };
const EASE = [0.16, 1, 0.3, 1];

function SlideContent({ slide, isActive }) {
  // Slide 1 — Hero: art top, text bottom left
  if (slide.layout === 'hero') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center px-8 pt-[calc(2rem+env(safe-area-inset-top))]">
          <motion.div
            animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.15 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="w-full max-w-[280px] aspect-square"
          >
            <slide.Art isActive={isActive} />
          </motion.div>
        </div>
        <div className="p-6 sm:p-8 text-white text-left pb-8">
          <motion.h2
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 28 }}
            transition={{ duration: 0.6, ease: EASE, delay: isActive ? 0.15 : 0 }}
            className="font-heading font-700 text-2xl sm:text-3xl tracking-tight mb-3 text-balance"
          >{slide.title}</motion.h2>
          <motion.p
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 28 }}
            transition={{ duration: 0.6, ease: EASE, delay: isActive ? 0.25 : 0 }}
            className="text-white/75 text-sm sm:text-base leading-relaxed max-w-md"
          >{slide.subtitle}</motion.p>
        </div>
      </div>
    );
  }

  // Slide 2 — Split: art right, text vertically centered left
  if (slide.layout === 'split') {
    return (
      <div className="w-full h-full flex flex-row">
        <div className="w-[46%] flex items-center pl-6 pr-3 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div>
            <motion.h2
              animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 28 }}
              transition={{ duration: 0.6, ease: EASE, delay: isActive ? 0.15 : 0 }}
              className="font-heading font-700 text-2xl sm:text-3xl tracking-tight mb-3 text-balance text-left text-white"
            >{slide.title}</motion.h2>
            <motion.p
              animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 28 }}
              transition={{ duration: 0.6, ease: EASE, delay: isActive ? 0.25 : 0 }}
              className="text-white/80 text-sm leading-relaxed text-left"
            >{slide.subtitle}</motion.p>
          </div>
        </div>
        <div className="w-[54%] flex items-center justify-end pr-0 pt-[calc(1rem+env(safe-area-inset-top))]">
          <motion.div
            animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.15 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="w-full max-w-[240px] aspect-square translate-x-5"
          >
            <slide.Art isActive={isActive} />
          </motion.div>
        </div>
      </div>
    );
  }

  // Slide 3 — Centered: art top, text bottom center
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <motion.div
          animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.15 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="w-full max-w-[260px] aspect-square"
        >
          <slide.Art isActive={isActive} />
        </motion.div>
      </div>
      <div className="p-6 sm:p-8 text-white text-center pb-8">
        <motion.h2
          animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 28 }}
          transition={{ duration: 0.6, ease: EASE, delay: isActive ? 0.15 : 0 }}
          className="font-heading font-700 text-2xl sm:text-3xl tracking-tight mb-3 text-balance"
        >{slide.title}</motion.h2>
        <motion.p
          animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 28 }}
          transition={{ duration: 0.6, ease: EASE, delay: isActive ? 0.25 : 0 }}
          className="text-white/75 text-sm sm:text-base leading-relaxed max-w-md mx-auto"
        >{slide.subtitle}</motion.p>
      </div>
    </div>
  );
}

export default function NativeIntro({ onDone }) {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length + 1;
  const isLast = index === SLIDES.length;
  const containerRef = useRef(null);
  const [slideWidth, setSlideWidth] = useState(0);

  // Measure container width for pixel-accurate drag constraints + spring targets
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setSlideWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleDragEnd = useCallback((event, info) => {
    if (!slideWidth) return;
    const distThreshold = slideWidth * 0.2;
    const velThreshold = 400;
    const shouldAdvance = info.offset.x < -distThreshold || info.velocity.x < -velThreshold;
    const shouldGoBack = info.offset.x > distThreshold || info.velocity.x > velThreshold;
    if (shouldAdvance && index < total - 1) setIndex(index + 1);
    else if (shouldGoBack && index > 0) setIndex(index - 1);
  }, [slideWidth, index, total]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const goTo = useCallback((i) => setIndex(i), []);

  return (
    <div className="fixed inset-0 z-[60] bg-olo-deep flex flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* Skip — visible on content slides */}
        {!isLast && (
          <button
            onClick={() => setIndex(SLIDES.length)}
            className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 text-white/80 text-sm font-medium px-4 py-2 hover:text-white transition-colors z-20 min-h-[44px]"
          >
            Skip
          </button>
        )}
        {/* Slide track — Framer Motion drag + spring physics */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -(slideWidth * (total - 1)), right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={{ x: -index * slideWidth }}
          transition={SPRING}
          className="flex h-full cursor-grab active:cursor-grabbing"
        >
          {SLIDES.map((slide, i) => (
            <div key={i} className="w-full h-full flex-shrink-0">
              <SlideContent slide={slide} isActive={index === i} />
            </div>
          ))}

          {/* CTA slide — orbiting rings, staggered entrance, breathing glow */}
          <div className="w-full h-full flex-shrink-0 flex flex-col items-center justify-center px-6 text-center text-white relative">
            <div className="absolute inset-0 radial-olo opacity-40 animate-pulse-glow" />
            <div className="absolute inset-0 radial-olo opacity-20 animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
            <motion.div
              animate={{ scale: index === SLIDES.length ? 1 : 0.85, opacity: index === SLIDES.length ? 1 : 0.15 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative z-10 max-w-sm flex flex-col items-center"
            >
              {/* Logo with orbiting rings */}
              <div className="relative mb-10 flex items-center justify-center h-40">
                <div className="absolute w-24 h-24 rounded-full border border-olo/15 ring-spin-slow">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-olo/50" />
                </div>
                <div className="absolute w-32 h-32 rounded-full border border-olo/10 ring-spin">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-olo/30" />
                </div>
                <div className="absolute w-40 h-40 rounded-full border border-olo/5 ring-spin-rev">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-olo/20" />
                </div>
                <Logo size={72} className="olo-glow animate-float relative z-10" />
              </div>
              <motion.h2
                animate={{ opacity: index === SLIDES.length ? 1 : 0, y: index === SLIDES.length ? 0 : 28 }}
                transition={{ duration: 0.6, ease: EASE, delay: index === SLIDES.length ? 0.15 : 0 }}
                className="font-heading font-700 text-3xl tracking-tight mb-3"
              >Ready to begin?</motion.h2>
              <motion.p
                animate={{ opacity: index === SLIDES.length ? 1 : 0, y: index === SLIDES.length ? 0 : 28 }}
                transition={{ duration: 0.6, ease: EASE, delay: index === SLIDES.length ? 0.25 : 0 }}
                className="text-white/70 text-sm leading-relaxed mb-10 max-w-xs"
              >Join thousands of users brightening their smiles with teewai.</motion.p>
              <motion.button
                onClick={onDone}
                animate={{ opacity: index === SLIDES.length ? 1 : 0, y: index === SLIDES.length ? 0 : 28 }}
                transition={{ duration: 0.6, ease: EASE, delay: index === SLIDES.length ? 0.35 : 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-8 py-4 rounded-2xl text-base olo-glow min-h-[52px]"
              >
                Get started <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Nav bar — back button + progress dots + forward button */}
      <div className="flex items-center justify-between px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-olo-deep border-t border-white/5">
        {index > 0 ? (
          <button
            onClick={() => setIndex(index - 1)}
            className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Previous slide"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}
        <div className="flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 min-w-[8px] ${
                i === index ? 'w-6 bg-olo' : 'w-2 bg-white/25 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
        {!isLast ? (
          <button
            onClick={next}
            className="w-12 h-12 rounded-full bg-olo flex items-center justify-center hover:scale-105 transition-transform olo-glow min-h-[44px] min-w-[44px]"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button
            onClick={onDone}
            className="w-12 h-12 rounded-full bg-olo flex items-center justify-center hover:scale-105 transition-transform olo-glow min-h-[44px] min-w-[44px]"
            aria-label="Get started"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}