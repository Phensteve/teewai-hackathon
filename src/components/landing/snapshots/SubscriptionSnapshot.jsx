import { Crown, Zap, Users, ScanLine, Check } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

export default function SubscriptionSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        <div className="text-center px-6 pt-2 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-3">
            <Crown className="w-6 h-6 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-[24px] tracking-tight">Your subscription</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Buy scan packs or go unlimited</p>
        </div>

        {/* Scans remaining */}
        <div className="mx-5 p-4 rounded-2xl border border-border bg-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScanLine className="w-[18px] h-[18px] text-olo" />
              <span className="text-[13px] font-heading font-700">Scans remaining</span>
            </div>
            <span className="font-heading font-800 text-[22px] text-olo tabular-nums">
              1<span className="text-[13px] text-muted-foreground font-400"> / 5 free</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-olo to-olo-glow rounded-full" style={{ width: '50%' }} />
          </div>
        </div>

        {/* Unlimited hero */}
        <div className="mx-5 p-5 rounded-3xl bg-gradient-to-br from-olo-deep to-[#062a30] text-white mb-4 relative overflow-hidden border border-olo/25">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-olo/25 rounded-full blur-[44px]" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-olo-glow via-olo to-transparent" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-olo/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-olo-glow" />
                </div>
                <div>
                  <p className="text-[15px] font-heading font-700">Unlimited Monthly</p>
                  <p className="text-[11px] text-white/45 mt-0.5">Cancel anytime</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-olo-deep bg-olo-glow px-2.5 py-1 rounded-full">
                Popular
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-800 text-[34px] text-olo-glow leading-none">$49.99</span>
              <span className="text-[13px] text-white/40">/month</span>
            </div>
            <div className="mt-3.5 space-y-1.5">
              {['Unlimited scans', 'Full whitening plan', 'Private VITA timeline'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-olo-glow shrink-0" />
                  <span className="text-[12px] text-white/70">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 h-11 rounded-xl bg-olo flex items-center justify-center gap-2 text-olo-deep font-semibold text-[14px]">
              <Zap className="w-4 h-4" /> Go unlimited
            </div>
          </div>
        </div>

        {/* Packs */}
        <div className="px-5 mb-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">
            Scan packs · one-time
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-[15px] font-heading font-700">Plus</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">15 scans</p>
              <p className="text-[20px] font-heading font-800 text-olo mt-2.5">$4.58</p>
            </div>
            <div className="p-4 rounded-2xl border-2 border-olo bg-olo/5 relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide text-white bg-olo px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Best value
              </span>
              <p className="text-[15px] font-heading font-700">Boost</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">30 scans</p>
              <p className="text-[20px] font-heading font-800 text-olo mt-2.5">$9.99</p>
            </div>
          </div>
        </div>

        {/* Family */}
        <div className="mx-5 p-4 rounded-2xl border border-olo/25 bg-olo/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-[18px] h-[18px] text-olo" />
            <div>
              <p className="text-[14px] font-heading font-700">Family pack</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">75 scans · up to 5 members</p>
            </div>
          </div>
          <p className="text-[18px] font-heading font-800 text-olo">$20.99</p>
        </div>

        <div className="flex-1" />
        <PhoneTabBar active={3} />
      </div>
    </DeviceCanvas>
  );
}