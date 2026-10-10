import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import heroConfig from '@/components/landing/heroVariants.json';
import { Check, Loader2, LayoutTemplate } from 'lucide-react';

const VARIANTS = Object.entries(heroConfig.variants).map(([key, v]) => ({ key, ...v }));

// Admin control for the landing page hero design. The chosen variant is
// persisted in the site_settings table (via the adminAuth backend function)
// and read publicly by the landing page through publicStats — so a switch here
// is live for every visitor instantly, with no deploy.
export default function HeroVariantSwitcher() {
  const [active, setActive] = useState(heroConfig.active);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminAuth.getHeroVariant()
      .then((res) => { if (res?.heroVariant) setActive(res.heroVariant); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const select = async (key) => {
    if (key === active || saving) return;
    setSaving(key);
    setError('');
    try {
      await adminAuth.setHeroVariant(key);
      setActive(key);
    } catch (e) {
      setError(e?.message || 'Could not update hero variant.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <LayoutTemplate className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-lg">Landing hero variant</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Choose which hero design the landing page shows. Changes are live for everyone instantly.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading current variant…
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          {VARIANTS.map((v) => {
            const isActive = v.key === active;
            const isSaving = saving === v.key;
            return (
              <button
                key={v.key}
                onClick={() => select(v.key)}
                disabled={!!saving}
                className={`relative text-left rounded-xl border p-4 transition-all disabled:opacity-60 ${
                  isActive ? 'border-olo bg-olo/5 ring-1 ring-olo/40' : 'border-border hover:border-olo/40 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-heading font-700 text-sm">{v.label}</span>
                  {isActive ? (
                    <Check className="w-4 h-4 text-olo" />
                  ) : isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{v.description}</p>
                <span className="mt-2 inline-block text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                  {v.key}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <p className="mt-4 text-xs text-muted-foreground">
        Code default: <span className="font-mono">{heroConfig.active}</span>. The stored override takes precedence when set.
      </p>
    </div>
  );
}