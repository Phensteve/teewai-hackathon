import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { ShoppingBag, Tag, MapPin, X, Loader2, FlaskConical, CalendarClock, TrendingUp } from 'lucide-react';
import { sanitizeForPrompt, wrapUntrusted, SYSTEM_GUARD } from '@/lib/promptGuard';

const tierConfig = {
  budget: { label: 'Budget', color: 'bg-emerald-500/10 text-emerald-500' },
  mid: { label: 'Mid-range', color: 'bg-olo/10 text-olo' },
  premium: { label: 'Premium', color: 'bg-amber-500/10 text-amber-500' },
};

// Cache generated descriptions per product name so re-opening a card doesn't
// re-spend an LLM call in the same session.
const cache = new Map();

export default function ProductDetailModal({ product, onClose }) {
  const [info, setInfo] = useState(cache.get(product.name) || null);
  const [loading, setLoading] = useState(!info);

  useEffect(() => {
    if (info) return;
    let active = true;
    (async () => {
      try {
        const safeName = sanitizeForPrompt(product.name, 120);
        const safeCat = sanitizeForPrompt(product.category, 80);
        const safeIng = sanitizeForPrompt(product.active_ingredient, 120);
        const res = await unrufld.integrations.Core.InvokeLLM({
          prompt: SYSTEM_GUARD + `You are a dental wellness educator. In 2 short sentences each, explain this teeth-whitening product for a consumer in plain, practical, non-promotional language. ` + wrapUntrusted(`Product name: ${safeName}. Category: ${safeCat}. Active ingredient: ${safeIng || 'not specified'}.`, 'product info') + ` Return three fields: about (what it is), how_to_use (how to use it), what_to_expect (what results to expect and over what timeframe).`,
          response_json_schema: {
            type: 'object',
            properties: {
              about: { type: 'string' },
              how_to_use: { type: 'string' },
              what_to_expect: { type: 'string' },
            },
          },
        });
        if (active) {
          cache.set(product.name, res);
          setInfo(res);
        }
      } catch {
        if (active) setInfo({ about: product.why || '', how_to_use: '', what_to_expect: '' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [product.name]);

  const tier = tierConfig[product.budget_tier] || tierConfig.mid;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-up" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[88vh] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-olo" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-700 text-lg leading-tight">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{product.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tier.color}`}>{tier.label}</span>
            {product.active_ingredient && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <FlaskConical className="w-3.5 h-3.5" /> {product.active_ingredient}
              </span>
            )}
          </div>

          {/* AI-generated detail */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Learning about this product…
            </div>
          ) : (
            <div className="space-y-4">
              {info?.about && (
                <Section icon={FlaskConical} title="What it is">
                  {info.about}
                </Section>
              )}
              {info?.how_to_use && (
                <Section icon={CalendarClock} title="How to use it">
                  {info.how_to_use}
                </Section>
              )}
              {info?.what_to_expect && (
                <Section icon={TrendingUp} title="What to expect">
                  {info.what_to_expect}
                </Section>
              )}
            </div>
          )}

          {product.why && (
            <div className="p-4 rounded-2xl bg-olo/5 border border-olo/15">
              <p className="text-xs font-semibold text-olo uppercase tracking-wider mb-1">Why we recommended it</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.why}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            {product.price_range && (
              <div className="p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Price</p>
                <p className="text-sm font-semibold">{product.price_range}</p>
              </div>
            )}
            {product.where_to_buy && (
              <div className="p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Where to buy</p>
                <p className="text-sm font-semibold break-words">{product.where_to_buy}</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Educational info is AI-generated and not a substitute for professional dental advice.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-olo" /> {title}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}