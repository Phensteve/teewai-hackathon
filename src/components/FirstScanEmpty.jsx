import { Link } from 'react-router-dom';
import { Camera, Gauge, ShieldCheck, Palette, ArrowRight, Gift } from 'lucide-react';
import { FREE_SCANS } from '@/lib/payment';

// First-scan empty state for the Dashboard. This is the single highest-intent
// conversion surface for a brand-new user (no scans yet), so it sells the
// value of the first scan + the free-tier trust signal, then drives to /scan.
export default function FirstScanEmpty() {
  const perks = [
    { icon: Gauge, title: 'Whiteness score', desc: 'Your VITA shade and 0 to 100 score, instantly.' },
    { icon: ShieldCheck, title: 'Health check', desc: 'Gum, enamel and plaque notes from your photo.' },
    { icon: Palette, title: 'Personalized plan', desc: 'A whitening routine tuned to your smile.' },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-olo-deep text-white p-6 sm:p-8 olo-glow">
      <div className="absolute inset-0 radial-olo opacity-60" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-olo bg-olo/15 px-3 py-1 rounded-full mb-4">
          <Gift className="w-3.5 h-3.5" /> {FREE_SCANS} free scans, no card needed
        </div>
        <h3 className="font-heading font-700 text-2xl sm:text-3xl mb-2">Scan your first smile</h3>
        <p className="text-white/70 text-sm sm:text-base max-w-md mb-6">
          Snap one photo and teewai scores your whiteness, checks your dental health, and builds a plan to reach your brightest smile.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {perks.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <Icon className="w-5 h-5 text-olo mb-1.5" />
              <p className="font-heading font-600 text-sm">{title}</p>
              <p className="text-xs text-white/60">{desc}</p>
            </div>
          ))}
        </div>
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-xl text-sm hover:scale-105 transition-transform olo-glow"
        >
          <Camera className="w-4 h-4" /> Start first scan <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}