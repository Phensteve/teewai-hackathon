import { Gauge, MessageSquare, Smile, HeartPulse, ArrowLeft, Coffee, TrendingUp, Share2 } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

const TEETH_URL = 'https://media.base44.com/images/public/6a6611b97d7894c19d798137/25671764f_generated_image.png';
// Stained → bleached, sampled from the measured VITA scale (C4 → 0M1).
const SHADE_STRIP = ['#A68D6A', '#B08D68', '#B59774', '#BCA07D', '#C5AC8D', '#D7CEB8'];

function ScoreRing({ value, label, sub, color, Icon }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex-1 p-4 rounded-2xl border border-border bg-card flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-2.5" style={{ color }}>
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-heading font-600">{label}</span>
      </div>
      <div className="relative w-[74px] h-[74px]">
        <svg viewBox="0 0 74 74" className="w-full h-full -rotate-90">
          <circle cx="37" cy="37" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
          <circle
            cx="37"
            cy="37"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value / 100)}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-heading font-800 text-[26px] tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}

export default function ResultsSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        <div className="px-5 pt-1 pb-3 flex items-center gap-2 text-[14px] text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Scan photo */}
          <div className="mx-5 h-[132px] rounded-2xl overflow-hidden border border-border bg-olo-deep mb-4 relative">
            <img src={TEETH_URL} alt="Your scan" className="w-full h-full object-cover" />
            <span className="absolute bottom-2.5 left-3 text-[11px] font-medium text-white bg-black/45 backdrop-blur px-2.5 py-1 rounded-full">
              Aug 3 · Front
            </span>
          </div>

          {/* Scores */}
          <div className="flex gap-3 px-5 mb-4">
            <ScoreRing value={87} label="Whiteness" sub="Shade A1" color="hsl(174 100% 36%)" Icon={Gauge} />
            <ScoreRing value={92} label="Health" sub="Gums good" color="#10b981" Icon={HeartPulse} />
          </div>

          {/* AI feedback */}
          <div className="mx-5 p-4 rounded-2xl bg-olo-deep text-white flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-olo flex items-center justify-center shrink-0">
              <MessageSquare className="w-[18px] h-[18px] text-olo-deep" />
            </div>
            <div>
              <p className="text-[12px] font-heading font-700 text-olo mb-1">teewai says</p>
              <p className="text-[13px] text-white/75 leading-relaxed">
                Great smile. Minor coffee staining on the upper molars — whitening strips should gain you 8 points in
                4 weeks.
              </p>
            </div>
          </div>

          {/* VITA scale */}
          <div className="px-5 mb-4">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>Stained</span>
              <span className="font-semibold text-olo">You · A1</span>
              <span>Bleached</span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden border border-border flex">
              {SHADE_STRIP.map((c) => (
                <div key={c} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="relative h-3 mt-1">
              <span className="absolute left-[78%] -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-olo" />
            </div>
          </div>

          {/* Smile zone + stains */}
          <div className="grid grid-cols-2 gap-3 px-5 mb-4">
            <div className="p-3.5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Smile className="w-3.5 h-3.5 text-olo" />
                <span className="text-[12px] font-heading font-600">Smile zone</span>
              </div>
              <p className="font-heading font-800 text-[24px] text-olo leading-none tabular-nums">89</p>
              <p className="text-[11px] text-muted-foreground mt-1">Front 6 · A1</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-2">
                <Coffee className="w-3.5 h-3.5 text-olo" />
                <span className="text-[12px] font-heading font-600">Stain sources</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Coffee', 'Tea'].map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-olo/10 text-olo text-[11px] font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Health breakdown */}
          <div className="mx-5 p-4 rounded-2xl border border-border bg-card mb-4">
            <p className="text-[12px] font-heading font-600 mb-3">Health breakdown</p>
            <div className="space-y-2.5">
              {[
                { label: 'Gums', value: 'Good', pct: 78, color: '#10b981' },
                { label: 'Plaque', value: 'Minimal', pct: 22, color: '#f59e0b' },
                { label: 'Enamel', value: 'Strong', pct: 86, color: '#10b981' },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3">
                  <span className="w-[52px] text-[12px] text-muted-foreground">{t.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                  </div>
                  <span className="w-[58px] text-right text-[12px] font-semibold" style={{ color: t.color }}>
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Forecast */}
          <div className="mx-5 p-4 rounded-2xl border border-olo/30 bg-olo/5 flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-olo flex items-center justify-center shrink-0">
              <TrendingUp className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <p className="text-[13px] font-heading font-700 text-olo">Smile forecast</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">4 weeks → 95 (B1). Just 8 points away.</p>
            </div>
          </div>

          {/* Share */}
          <div className="mx-5 p-4 rounded-2xl bg-gradient-to-br from-olo-deep to-[#062a30] text-white flex items-center gap-3">
            <Share2 className="w-5 h-5 text-olo shrink-0" />
            <div>
              <p className="text-[13px] font-heading font-700">Score 87 · Shade A1</p>
              <p className="text-[11px] text-white/50 mt-0.5">Share your smile card</p>
            </div>
          </div>
        </div>

        <PhoneTabBar active={1} />
      </div>
    </DeviceCanvas>
  );
}