import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

// Native-style option picker: opens a bottom sheet instead of the browser's
// system <select> dropdown (which looks out of place inside a WebView).
export default function SelectSheet({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option…',
  title = 'Choose an option',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          id={id}
          type="button"
          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-base text-left focus:outline-none focus:border-olo ${className}`}
        >
          <span className={selected ? '' : 'text-muted-foreground'}>{selected?.label || placeholder}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="safe-area-inset-bottom">
        <DrawerHeader>
          <DrawerTitle className="text-base">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange?.(o.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-left text-base transition-colors ${
                  active ? 'bg-olo/10 text-olo font-medium' : 'hover:bg-muted'
                }`}
              >
                <span>{o.label}</span>
                {active && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}