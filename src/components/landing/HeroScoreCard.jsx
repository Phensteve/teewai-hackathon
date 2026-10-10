const SHADE_STRIP = ['#8a5a2b', '#c9a24a', '#e3c878', '#f3e6b8', '#fdf6e3', '#ffffff'];

// Live AI-analysis preview card — real product UI used by the hero variants.
export default function HeroScoreCard() {
  return (
    <div className="w-full max-w-xs sm:max-w-sm bg-olo-deep ring-1 ring-white/10 shadow-2xl shadow-olo/20 rounded-3xl p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-x-0 h-px bg-olo/70 animate-scan-line" style={{ boxShadow: '0 0 12px 2px rgba(13,159,142,0.6)' }} />
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-olo">
          <span className="w-1.5 h-1.5 rounded-full bg-olo animate-pulse" /> AI analysis
        </span>
        <span className="text-[10px] text-white/40">teewai vision</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
          <svg width="100%" height="100%" viewBox="0 0 80 80" className="-rotate-90">
            <defs>
              <linearGradient id="heroScore" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--olo-glow))" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#heroScore)" strokeWidth="5" strokeLinecap="round"
              strokeDasharray="213.6" strokeDashoffset="27.8"
              style={{ filter: 'drop-shadow(0 0 6px hsl(var(--olo-glow) / 0.6))' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading font-800 text-2xl sm:text-3xl text-white">87</span>
          </div>
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs text-white/50 uppercase tracking-wider">Whiteness score</p>
          <p className="font-heading font-600 text-base sm:text-lg text-white">Shade A1 · Excellent</p>
          <div className="flex gap-1 mt-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-1.5 w-6 sm:w-8 bg-olo rounded-full" />)}
            <div className="h-1.5 w-6 sm:w-8 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
          <span>Stained</span><span>Your shade</span><span>White</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden border border-white/10">
          {SHADE_STRIP.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
        </div>
        <div className="flex justify-end pr-[18%] mt-1">
          <div className="w-0.5 h-2 bg-olo rounded-full" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Health', value: '92' },
          { label: 'Stains', value: '2' },
          { label: 'Weeks', value: '4' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/5 py-2">
            <p className="font-heading font-700 text-sm text-olo">{s.value}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}