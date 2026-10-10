import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Crown, LayoutGrid, ScanLine, Stethoscope, BookOpen, Users, Palette, Check, ArrowRight } from 'lucide-react';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useCurrency } from '@/hooks/use-currency';
import { MONTHLY, YEARLY, MONTHLY_YEARLY, YEARLY_MONTHLY_EQ, SAVINGS, MONTHLY_SAVE_PCT } from '@/lib/payment';

// Box Box Club–style full-screen paywall. Hero image, swipeable feature
// carousel with page dots, gradient, and the two unlimited plans. Continue
// routes to the existing checkout (no payment logic duplicated here).
// Opened by dispatching the 'teewai-open-paywall' window event.

const HERO_IMG = 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/0feebef85_generated_image.png';

const FEATURES = [
  { icon: ScanLine, title: 'Unlimited AI scans', desc: 'Scan as often as you like — no caps, scans never expire.' },
  { icon: Stethoscope, title: 'Braces check', desc: 'Screen your alignment anytime with a single photo.' },
  { icon: BookOpen, title: 'Home whitening library', desc: '18 evidence-based methods — ancient, modern, debunked.' },
  { icon: Users, title: 'Family sharing', desc: 'Share scans across your household, transfer anytime.' },
];

export default function PaywallOverlay() {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [billing, setBilling] = useState('yearly'); // 'monthly' | 'yearly'
  const navigate = useNavigate();
  const { format } = useCurrency();
  useScrollLock(open);

  useEffect(() => {
    const handler = () => { setOpen(true); setSlide(0); };
    window.addEventListener('teewai-open-paywall', handler);
    return () => window.removeEventListener('teewai-open-paywall', handler);
  }, []);

  const close = () => setOpen(false);

  const goCheckout = (plan) => {
    setOpen(false);
    navigate('/checkout', { state: { plan } });
  };

  const goAllPlans = () => {
    setOpen(false);
    navigate('/subscription');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-background flex flex-col"
        >
          {/* Hero image with gradient overlay */}
          <div className="relative h-[38vh] min-h-[220px] flex-shrink-0 overflow-hidden">
            <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-olo-deep/40 via-olo-deep/30 to-background" />
            <button
              onClick={close}
              className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 w-10 h-10 rounded-xl bg-card/80 backdrop-blur-md border border-border flex items-center justify-center shadow-lg hover:bg-card transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white px-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-olo/90 backdrop-blur-md text-xs font-semibold mb-2">
                <Crown className="w-3.5 h-3.5" /> teewai Unlimited
              </div>
              <h1 className="font-heading font-700 text-2xl tracking-tight">Your brightest smile, unlocked</h1>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Feature carousel */}
            <div className="px-4 pt-5">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card frost-edge">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -40 && slide < FEATURES.length - 1) setSlide(slide + 1);
                      if (info.offset.x > 40 && slide > 0) setSlide(slide - 1);
                    }}
                    className="p-5 flex items-start gap-3"
                  >
                    <span className="icon-primary olo-glow flex-shrink-0">
                      {(() => { const I = FEATURES[slide].icon; return <I />; })()}
                    </span>
                    <div>
                      <h3 className="font-heading font-600 text-base mb-1">{FEATURES[slide].title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{FEATURES[slide].desc}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
                {/* Page dots */}
                <div className="flex items-center justify-center gap-1.5 pb-3">
                  {FEATURES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      aria-label={`Feature ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-olo' : 'w-1.5 bg-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Billing toggle + plan cards */}
            <div className="px-4 pt-5">
              <div className="flex gap-1 p-1 rounded-2xl bg-muted/80 mb-4">
                <button
                  onClick={() => setBilling('monthly')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling('yearly')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${billing === 'yearly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Yearly <span className="text-[10px] font-bold text-white bg-olo px-1.5 py-0.5 rounded-full">16% OFF</span>
                </button>
              </div>

              <div className="relative p-6 rounded-3xl border-2 border-olo bg-olo-deep text-white olo-glow-strong overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olo to-transparent" />
                <div className="absolute -top-6 -right-6 w-40 h-40 bg-olo/25 rounded-full blur-[80px]" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-olo" />
                    <h3 className="font-heading font-700 text-xl">Unlimited {billing === 'monthly' ? 'Monthly' : 'Yearly'}</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-4">Unlimited scanning. Cancel anytime.</p>
                  {billing === 'monthly' ? (
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-heading font-800 text-4xl">{format(MONTHLY)}</span>
                      <span className="text-white/50">/month</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-white/40 line-through text-lg">{format(MONTHLY_YEARLY)}</span>
                        <span className="font-heading font-800 text-4xl">{format(YEARLY)}</span>
                        <span className="text-white/50">/year</span>
                      </div>
                      <p className="text-xs text-white/50 mb-1">≈ {format(YEARLY_MONTHLY_EQ)}/mo billed annually</p>
                    </>
                  )}
                  <p className="text-sm font-semibold text-olo mb-5">
                    {billing === 'monthly' ? `Save ${MONTHLY_SAVE_PCT}% vs paying per scan` : `Save ${format(SAVINGS)} a year`}
                  </p>
                  <ul className="space-y-2 mb-5 text-sm text-white/80">
                    {['Unlimited AI scans', 'Braces check & home whitening library', 'Shade & stain trackers', 'Priority analysis'].map((f) => (
                      <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-olo flex-shrink-0" /> {f}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => goCheckout(billing === 'monthly' ? 'pro' : 'pro_yearly')}
                    className="w-full font-semibold px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 bg-olo text-white hover:scale-[1.02] transition-transform olo-glow"
                  >
                    <Crown className="w-4 h-4" /> Go Unlimited <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={goAllPlans}
                className="w-full mt-3 text-sm font-medium text-muted-foreground hover:text-olo transition-colors flex items-center justify-center gap-1.5"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> See all plans, packs & coupons
              </button>

              <p className="text-center text-[11px] text-muted-foreground mt-4 mb-6 flex items-start justify-center gap-1.5">
                <span>All transactions finalize in Naira (₦). Other currencies are for display only.</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}