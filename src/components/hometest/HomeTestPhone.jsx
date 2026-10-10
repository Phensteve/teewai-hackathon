import Logo from '@/components/Logo';
import { AppStoreBadge, PlayStoreBadge } from '@/components/AppStoreBadges';

// Phone mockup matching the Landing page phone content — logo, app name,
// "coming soon", and store badges. Dark teal theme for the hometest vibe.
export default function HomeTestPhone() {
  return (
    <div className="relative w-[260px] sm:w-[280px]">
      <div className="absolute -inset-6 rounded-full blur-[80px] animate-pulse-glow" style={{ background: 'rgba(13,159,142,0.2)' }} />
      <div className="relative rounded-[2.6rem] p-[5px]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))', boxShadow: '0 30px 80px -20px rgba(0,217,192,0.35)' }}>
        <div className="relative rounded-[2.3rem] bg-[#06121a] overflow-hidden aspect-[9/19] flex flex-col items-center justify-center text-center px-6 gap-4">
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full bg-white/15 z-10" />
          <div className="w-14 h-14 rounded-2xl bg-[#0d9f8e]/10 flex items-center justify-center">
            <Logo size={30} />
          </div>
          <div>
            <p className="font-heading font-700 text-lg text-white">teewai app</p>
            <p className="text-xs text-white/50 mt-0.5">iOS & Android</p>
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            <AppStoreBadge />
            <PlayStoreBadge />
          </div>
        </div>
      </div>
    </div>
  );
}