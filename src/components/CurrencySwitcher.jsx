import { useCurrency } from '@/hooks/use-currency';
import CurrencyDropdown from '@/components/CurrencyDropdown';

// Combined currency selector: a prominent USD | NGN pill for the two
// transaction currencies, plus an obvious globe dropdown for every other
// world currency (160+). The pill is the quick toggle; the dropdown covers
// the rest.
export default function CurrencySwitcher({ className = '' }) {
  const { currency, currencies, setCurrency } = useCurrency();
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
        {currencies.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            className={`px-3 py-1 rounded-full transition-colors ${
              currency === c ? 'bg-olo text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <CurrencyDropdown current={currency} />
    </div>
  );
}