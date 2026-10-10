import Reveal from '@/components/Reveal';
import { Link } from 'react-router-dom';
import { Utensils, Coffee, Wine, Droplet, CupSoda, ShieldCheck, ArrowRight } from 'lucide-react';

// The three dietary factors that drive extrinsic tooth staining — the same
// properties the food-scan engine scores each meal against.
const HIGHLIGHTS = [
  { icon: Coffee, label: 'Chromogens', desc: 'Pigmented foods and drinks that bind colour to enamel.' },
  { icon: Wine, label: 'Tannins', desc: 'Plant compounds that help stains stick to the tooth surface.' },
  { icon: Droplet, label: 'Acids', desc: 'Erosive items that roughen enamel so stains cling.' },
];

// A static, on-brand mock of the in-app "daily stain load" card so visitors
// immediately grasp what the food scan produces without signing in.
const SAMPLE_ITEMS = [
  { name: 'Coffee', stain: 70, icon: Coffee },
  { name: 'Jollof rice', stain: 22, icon: Utensils },
  { name: 'Orange juice', stain: 60, icon: CupSoda },
];

export default function LandingFoodScan() {
  return (
    <section id="food-scan" className="relative z-10 py-12 sm:py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <Reveal>
            <h2 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">
              Your diet is staining your teeth. Now you can see it.
            </h2>
            <p className="mt-4 text-sm sm:text-lg text-muted-foreground leading-relaxed">
              Snap a photo of your meal and teewai identifies every item, then scores the chromogens, tannins and acids working against your smile. Each scan rolls into a daily stain load so you learn exactly which habits are dimming your shine.
            </p>
            <div className="mt-6 space-y-3">
              {HIGHLIGHTS.map((h) => (
                <div key={h.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center shrink-0">
                    <h.icon className="w-4 h-4 text-olo" />
                  </div>
                  <div>
                    <p className="font-heading font-600 text-sm">{h.label}</p>
                    <p className="text-sm text-muted-foreground">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/stain-tracker"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-600 text-olo hover:text-olo/80 transition-colors"
            >
              Try the stain tracker <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative">
              <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-xl shadow-olo/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-olo flex items-center justify-center">
                      <Utensils className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-heading font-600">Today's stain load</span>
                  </div>
                  <span className="text-xs text-muted-foreground">3 items</span>
                </div>

                <div className="mb-5">
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-3xl font-heading font-700 text-olo">
                      38<span className="text-base text-muted-foreground font-500">/100</span>
                    </span>
                    <span className="text-xs text-muted-foreground">moderate</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-olo" style={{ width: '38%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  {SAMPLE_ITEMS.map((it) => (
                    <div key={it.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/60">
                      <div className="w-8 h-8 rounded-lg bg-olo/10 flex items-center justify-center shrink-0">
                        <it.icon className="w-4 h-4 text-olo" />
                      </div>
                      <span className="text-sm font-500 flex-1">{it.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-olo/70" style={{ width: `${it.stain}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right">{it.stain}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-olo/5 border border-olo/10">
                  <ShieldCheck className="w-4 h-4 text-olo shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Rinse with water after coffee and wait 30 minutes before brushing to protect your enamel.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}