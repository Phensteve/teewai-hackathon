import { useState, useMemo, useCallback } from 'react';
import { Users, Calendar, Check, Loader2, BadgePercent } from 'lucide-react';

// Seat-based dentist plan configurator. Deterministic pricing math:
//   per-patient MONTHLY rate by volume band:
//     30-50 = 200, 51-150 = 175, 151-300 = 150, 301-500 = 125, 501-750 = 100
//   period price = patientCount x bandRate x months x (1 - periodDiscount)
//   period discounts: quarterly 5%, half-yearly 10%, yearly 15%
// Live summary updates as the dentist moves the slider or types.

const MIN = 30;
const MAX = 750;
const STEP = 10;
const CHIPS = [50, 100, 150];

const BANDS = [
  { max: 50, rate: 200 },
  { max: 150, rate: 175 },
  { max: 300, rate: 150 },
  { max: 500, rate: 125 },
  { max: 750, rate: 100 },
];

function bandRate(count) {
  return BANDS.find((b) => count <= b.max)?.rate || 100;
}

export const PERIODS = [
  { key: 'monthly', label: 'Monthly', months: 1, discount: 0 },
  { key: 'quarterly', label: 'Quarterly', months: 3, discount: 0.05 },
  { key: 'half_yearly', label: 'Biannual', months: 6, discount: 0.1 },
  { key: 'yearly', label: 'Yearly', months: 12, discount: 0.15 },
];

export function priceQuote(count, periodKey) {
  const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[0];
  const rate = bandRate(count);
  const months = period.months;
  const gross = count * rate * months;
  const discount = gross * period.discount;
  const total = gross - discount;
  return {
    rate,
    months,
    gross,
    discount,
    total,
    perPatientMonthly: rate,
    periodLabel: period.label,
    periodKey: period.key,
  };
}

export default function PlanConfigurator({ onCheckout, saving, currentSlots }) {
  const [count, setCount] = useState(currentSlots || 50);
  const [periodKey, setPeriodKey] = useState('monthly');

  const clamp = useCallback((n) => {
    if (isNaN(n)) return MIN;
    return Math.max(MIN, Math.min(MAX, Math.round(n)));
  }, []);

  const onSlider = (e) => {
    const v = parseInt(e.target.value, 10);
    setCount(clamp(v));
  };

  const onType = (e) => {
    const raw = e.target.value;
    if (raw === '') { setCount(MIN); return; }
    setCount(clamp(parseInt(raw, 10)));
  };

  const quote = useMemo(() => priceQuote(count, periodKey), [count, periodKey]);

  return (
    <div className="space-y-6">
      {/* Patient count */}
      <div>
        <label className="text-sm font-medium flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-olo" /> Patient slots
          <span className="text-xs text-muted-foreground font-normal">({MIN} to {MAX})</span>
        </label>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={count}
            onChange={onSlider}
            className="flex-1 accent-olo cursor-pointer"
            aria-label="Patient slots slider"
          />
          <input
            type="number"
            min={MIN}
            max={MAX}
            step={STEP}
            value={count}
            onChange={onType}
            className="w-20 h-11 text-center px-2 rounded-xl border border-border bg-background focus:border-olo focus:outline-none font-semibold"
            aria-label="Patient slots number"
          />
        </div>
        <div className="flex gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCount(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${count === c ? 'bg-olo text-white' : 'bg-muted text-muted-foreground hover:bg-olo/10'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Billing period */}
      <div>
        <label className="text-sm font-medium flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-olo" /> Billing period
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriodKey(p.key)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${periodKey === p.key ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground hover:border-olo/40'}`}
            >
              {p.label}
              {p.discount > 0 && <span className="block text-[10px] mt-0.5 opacity-80">{Math.round(p.discount * 100)}% off</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Live summary */}
      <div className="p-5 rounded-2xl border border-olo/20 bg-olo/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Per patient per month</span>
          <span className="font-semibold">{ngn(quote.perPatientMonthly)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Period ({quote.months} month{quote.months > 1 ? 's' : ''})</span>
          <span className="font-semibold">{quote.periodLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-sm">{ngn(quote.gross)}</span>
        </div>
        {quote.discount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-olo flex items-center gap-1"><BadgePercent className="w-3.5 h-3.5" /> Period discount</span>
            <span className="text-sm text-olo font-medium">- {ngn(quote.discount)}</span>
          </div>
        )}
        <div className="h-px bg-olo/15" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total for period</span>
          <span className="font-heading font-700 text-xl text-olo">{ngn(quote.total)}</span>
        </div>
        {quote.discount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">You save</span>
            <span className="text-xs font-medium text-olo">{ngn(quote.discount)}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onCheckout({ count, periodKey, quote })}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold h-12 rounded-xl hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</> : <><Check className="w-4 h-4" /> Subscribe {ngn(quote.total)}</>}
      </button>
    </div>
  );
}

function ngn(n) {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}