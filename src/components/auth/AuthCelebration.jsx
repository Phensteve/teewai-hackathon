import { useEffect } from 'react';
import { PartyPopper } from 'lucide-react';

export default function AuthCelebration({ title, subtitle, ctaLabel = 'Continue', onCTA, autoDismiss }) {
  useEffect(() => {
    if (!autoDismiss) return;
    const t = setTimeout(() => onCTA?.(), 2000);
    return () => clearTimeout(t);
  }, [autoDismiss, onCTA]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-olo/10 text-olo">
        <PartyPopper className="h-8 w-8" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-700">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <button onClick={onCTA} className="rounded-xl bg-olo px-6 py-2.5 text-sm font-semibold text-white">
        {ctaLabel}
      </button>
    </div>
  );
}