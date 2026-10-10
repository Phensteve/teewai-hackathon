import { ArrowLeft, ClipboardList, Zap, Clock, TrendingUp, ShoppingBag, Target, Check } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

const HABITS = [
  {
    n: 1,
    title: 'Rinse after coffee',
    method: 'stain prevention',
    impact: 'high',
    desc: 'Coffee acids bond to enamel within 30 minutes. A water rinse right after cuts new staining by up to half.',
    freq: 'After every cup',
  },
  {
    n: 2,
    title: 'Whitening strips',
    method: 'bleaching',
    impact: 'high',
    desc: '6.5% hydrogen peroxide strips, 30 minutes a day. The fastest route to your shade target.',
    freq: 'Daily · 2 weeks',
  },
  {
    n: 3,
    title: 'Fluoride mouthwash',
    method: 'remineralization',
    impact: 'low',
    desc: 'Remineralizes enamel and locks in brightness between treatments.',
    freq: 'Twice daily',
  },
];

const IMPACT = {
  high: { icon: Zap, cls: 'bg-olo text-white', label: 'High impact' },
  medium: { icon: TrendingUp, cls: 'bg-olo/15 text-olo', label: 'Medium' },
  low: { icon: Clock, cls: 'bg-muted text-muted-foreground', label: 'Gentle' },
};

const PRODUCTS = [
  { name: 'Arm & Hammer Truly Radiant', tier: 'Budget', price: '$4–6', active: '6.5% peroxide' },
  { name: 'Crest 3D Whitestrips', tier: 'Mid', price: '$25–35', active: '10% peroxide', best: true },
  { name: 'Philips Zoom NiteWhite', tier: 'Premium', price: '$50–80', active: '22% peroxide' },
];

export default function PlanSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        <div className="px-5 pt-1 pb-3 flex items-center gap-2 text-[14px] text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to results
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Shade target hero */}
          <div className="mx-5 p-5 rounded-3xl bg-gradient-to-br from-olo-deep to-[#062a30] text-white mb-4 relative overflow-hidden border border-olo/25">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-olo/25 rounded-full blur-3xl" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-olo-glow via-olo to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-olo-glow" />
                <p className="text-[12px] font-heading font-700 text-olo uppercase tracking-wide">Your shade target</p>
              </div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[11px] text-white/45">Today</p>
                  <p className="font-heading font-800 text-[28px] text-white leading-none mt-1">A2</p>
                </div>
                <div className="flex-1 mx-4 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-olo-glow rotate-180" />
                  <span className="text-[12px] font-semibold text-olo-glow ml-2">4 weeks</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/45">Target</p>
                  <p className="font-heading font-800 text-[28px] text-olo-glow leading-none mt-1">A1</p>
                </div>
              </div>
              <p className="text-center mt-3 text-[12px] text-olo-glow font-semibold">+8 points brighter in 4 weeks</p>
            </div>
          </div>

          {/* Personalized plan */}
          <div className="px-5 mb-2">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-[18px] h-[18px] text-olo" />
              <h2 className="font-heading font-600 text-[17px]">Your personalized plan</h2>
            </div>
          </div>

          <div className="px-5 space-y-2.5 mb-4">
            {HABITS.map((h) => {
              const cfg = IMPACT[h.impact];
              const Icon = cfg.icon;
              return (
                <div key={h.n} className="p-3.5 rounded-2xl border border-border bg-card">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-olo/10 flex items-center justify-center font-heading font-700 text-[13px] text-olo">
                        {h.n}
                      </div>
                      <div>
                        <p className="font-heading font-600 text-[14px] leading-tight">{h.title}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{h.method}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${cfg.cls}`}>
                      <Icon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mb-1.5">{h.desc}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{h.freq}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Products */}
          <div className="px-5 mb-2">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-[18px] h-[18px] text-olo" />
              <h2 className="font-heading font-600 text-[17px]">Recommended products</h2>
            </div>
          </div>

          <div className="px-5 space-y-2.5">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className={`p-3.5 rounded-2xl border ${p.best ? 'border-olo bg-olo/5 relative' : 'border-border bg-card'}`}
              >
                {p.best && (
                  <span className="absolute -top-2 left-3 text-[9px] font-bold uppercase tracking-wide text-white bg-olo px-2 py-0.5 rounded-full">
                    Best for you
                  </span>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-600 text-[14px] leading-tight truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-olo bg-olo/10 px-2 py-0.5 rounded-full">
                        {p.tier}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{p.active}</span>
                    </div>
                  </div>
                  <p className="font-heading font-800 text-[16px] text-olo whitespace-nowrap">{p.price}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline strip */}
          <div className="mx-5 mt-4 p-4 rounded-2xl border border-olo/30 bg-olo/5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-olo" />
              <p className="text-[12px] font-heading font-700 text-olo">Your timeline</p>
            </div>
            <div className="flex items-center gap-1.5">
              {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, i) => (
                <div key={w} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-full h-1.5 rounded-full ${i <= 1 ? 'bg-olo' : 'bg-muted'}`} />
                  <span className={`text-[10px] ${i <= 1 ? 'text-olo font-semibold' : 'text-muted-foreground'}`}>{w}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
              <Check className="w-3 h-3 text-olo" />
              <span>Track progress with weekly re-scans</span>
            </div>
          </div>
        </div>

        <PhoneTabBar active={3} />
      </div>
    </DeviceCanvas>
  );
}