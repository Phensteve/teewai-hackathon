import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Collapsible group for secondary result content, so the page opens on the
// essentials and the user expands detail only when they want it.
export default function ResultsSection({ title, subtitle, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full p-3.5 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 min-w-0">
          {Icon && <span className="icon-tool" style={{ width: '2rem', height: '2rem' }}><Icon /></span>}
          <span className="min-w-0">
            <span className="block text-caption font-semibold">{title}</span>
            {subtitle && <span className="block text-label text-muted-foreground normal-case tracking-normal font-normal truncate">{subtitle}</span>}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3.5 pb-3.5 pt-1 animate-fade-up">{children}</div>}
    </div>
  );
}