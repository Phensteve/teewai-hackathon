import { createContext, useContext, useState, useCallback } from 'react';

const TourContext = createContext(null);

export const TOUR_STEPS = [
  {
    target: null,
    title: 'Welcome to teewai',
    body: "Let's take a quick tour to show you where everything is. It takes less than a minute.",
    cta: 'Start tour',
  },
  {
    target: 'tour-scan',
    title: 'Scan your teeth',
    body: 'Tap here to snap a photo of your smile and get instant shade analysis, stain detection, and personalized recommendations.',
  },
  {
    target: 'tour-food',
    title: 'Scan your food',
    body: 'Tap here to log meals and drinks — teewai tracks the stain impact of everything you consume in real time.',
  },
  {
    target: 'tour-profile',
    title: 'Your profile',
    body: 'Tap here to view your profile, manage your subscription, and adjust your settings.',
  },
  {
    target: null,
    title: "You're all set!",
    body: "That's the basics — the rest is yours to explore: stain tracking, leaderboards, dentist finder, smile goals, and more. Tap the menu icon anytime to replay this tour.",
    cta: 'Got it',
  },
];

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const start = useCallback(() => { setActive(true); setStep(0); }, []);
  const close = useCallback(() => { setActive(false); }, []);
  const next = useCallback(() => { setStep((s) => s + 1); }, []);
  const goTo = useCallback((i) => { setStep(i); }, []);

  return (
    <TourContext.Provider value={{ active, step, start, close, next, goTo, total: TOUR_STEPS.length }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) return { active: false, step: 0, start: () => {}, close: () => {}, next: () => {}, goTo: () => {}, total: 0 };
  return ctx;
}