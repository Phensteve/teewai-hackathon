import { useState, useRef, useEffect, useMemo } from 'react';
import { CURRENCIES } from '@/lib/currency';
import { setCurrency } from '@/hooks/use-currency';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';

export default function CurrencyDropdown({ current = 'USD', onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const list = useMemo(() => {
    const all = Object.values(CURRENCIES).filter(Boolean);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  const pick = (code) => {
    setCurrency(code);
    onPick?.(code);
    setOpen(false);
    setQuery('');
  };

  const cur = CURRENCIES[current];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-olo hover:border-olo/40 transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="text-foreground font-bold">{cur?.symbol || current}</span>
        <span className="hidden sm:inline">{current}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover shadow-2xl z-50 overflow-hidden animate-fade-up">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 160+ currencies…"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-olo"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No currencies found</p>
            ) : (
              list.map((c) => (
                <button
                  key={c.code}
                  onClick={() => pick(c.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-olo/5 transition-colors ${current === c.code ? 'bg-olo/10' : ''}`}
                >
                  <span className="font-bold w-8 text-foreground flex-shrink-0">{c.symbol}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-sm block truncate">{c.code}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{c.name}</span>
                  </span>
                  {current === c.code && <Check className="w-4 h-4 text-olo flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}