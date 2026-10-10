import { Camera, ScanLine, HeartPulse, Droplet, Route, Trophy, Palette, ShieldCheck, Bell } from 'lucide-react';
import { HandUnderline, HandStar } from './HandDrawn';

const STEPS = [
  { n: '01', icon: Camera, title: 'Snap your smile', body: 'Pull out your phone. Snap your smile \u2014 front-facing, decent light. Drop a white index card or VITA shade tab in frame if you have one. That reference makes the color reading honest.' },
  { n: '02', icon: ScanLine, title: 'teewai reads it', body: 'teewai finds each tooth \u2014 all 32 if you\u2019ve got them \u2014 measures whiteness against the VITA Classical scale, and flags stains, plaque, and enamel wear. Not a diagnosis. A starting point.' },
  { n: '03', icon: Route, title: 'Follow your plan', body: 'You get a week-by-week plan tuned to your shade and budget \u2014 from drugstore strips to pro kits \u2014 plus a forecast of where you could be in 4, 8, 12 weeks.' },
];

const FEATURES = [
  { icon: ScanLine, title: 'Instant whiteness score', body: 'A calibrated 0\u2013100 score mapped to the VITA Classical shade guide \u2014 the same scale your dentist uses.', span: 'lg:col-span-5' },
  { icon: Droplet, title: 'Stain detection', body: 'Per-tooth flags that trace stains back to their likely source: coffee, tea, wine, tobacco.', span: 'lg:col-span-4' },
  { icon: HeartPulse, title: 'Health screening', body: 'Plaque levels, gum color, and enamel condition \u2014 scored against published clinical indices.', span: 'lg:col-span-3' },
  { icon: Route, title: 'Personalized plan', body: 'A realistic whitening roadmap with product picks for every budget, not just the premium shelf.', span: 'lg:col-span-3' },
  { icon: Palette, title: 'VITA shade calibration', body: 'Reference-guided color matching. No reference card? teewai still works, but honest lighting helps.', span: 'lg:col-span-5' },
  { icon: Trophy, title: 'Gamified streaks', body: 'Earn MMR, unlock rare color traits, and climb the leaderboard as your smile improves.', span: 'lg:col-span-4' },
  { icon: ShieldCheck, title: 'Privacy first', body: 'Your scans are private and encrypted. Delete any scan or your full history anytime.', span: 'lg:col-span-6' },
  { icon: Bell, title: 'Smart retake prompts', body: 'Blurry photo? Missing your top teeth? teewai asks for exactly the right retake \u2014 no wasted scans.', span: 'lg:col-span-6' },
];

export default function HomeTestStory() {
  return (
    <>
      <section id="how" className="relative px-4 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="mb-14">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">How it works</span>
            <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3">From photo <span className="font-600 text-[#5eead4] relative inline-block">to plan<HandUnderline className="absolute -bottom-2 left-0 w-full h-2.5" color="#5eead4" /></span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} data-reveal className="p-8 rounded-2xl border border-white/[0.08] bg-white/[0.07] backdrop-blur-sm hover:border-[#0d9f8e]/30 transition-colors">
                <div className="w-11 h-11 rounded-xl border border-[#0d9f8e]/30 flex items-center justify-center mb-5">
                  <s.icon className="w-5 h-5 text-[#2dd4bf]" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 font-medium mb-2">Phase {s.n}</div>
                <h3 className="font-heading font-500 text-xl tracking-tight mb-2">{s.title}</h3>
                <p className="text-sm text-white/75 leading-relaxed font-light">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative px-4 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">What teewai sees</span>
              <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3">More than <span className="font-600 text-[#5eead4]">white</span></h2>
            </div>
            <p className="text-sm text-white/75 max-w-sm font-light">{'Every scan runs through teewai\u2019s research-grounded vision engine \u2014 not just whiteness, but real dental health signals your dentist would check for.'}</p>
          </div>
          <div data-reveal className="mb-10 flex items-center gap-2">
            <HandStar className="w-5 h-5" color="#5eead4" />
            <span className="text-xs text-white/50 font-light">Eight things teewai checks on every photo</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} data-reveal className={`${f.span} p-6 rounded-2xl border border-white/[0.08] bg-white/[0.07] backdrop-blur-sm hover:border-[#0d9f8e]/30 transition-colors`}>
                <f.icon className="w-6 h-6 text-[#2dd4bf] mb-4" />
                <h3 className="font-heading font-500 text-lg tracking-tight mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/75 leading-relaxed font-light">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}