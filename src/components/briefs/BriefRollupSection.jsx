import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function BriefRollupSection({ title, data, children }) {
  const [open, setOpen] = useState(false);
  if (!data?.hasData) return null;

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <span className="font-heading font-600 text-sm">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}