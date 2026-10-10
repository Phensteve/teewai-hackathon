import { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ChatComposer({ value, onChange, onSend, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  return (
    <div className="px-3 sm:px-6 pb-3 pt-2">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-1 focus-within:border-olo/60 transition-colors">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Ask about your teeth, or request a chart…"
          disabled={disabled}
          className="flex-1 min-w-0 resize-none bg-transparent py-1.5 text-[16px] sm:text-sm leading-snug focus:outline-none disabled:opacity-50 no-scrollbar"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="w-9 h-9 rounded-xl bg-olo text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity"
          aria-label="Send"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">General information only, not a diagnosis. See a dentist for anything specific.</p>
    </div>
  );
}