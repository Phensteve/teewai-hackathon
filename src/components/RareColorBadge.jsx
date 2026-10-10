import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye } from 'lucide-react';

// The "olo" rare color signifier, restyled as an in-app collectible badge.
// Tapping reveals the lore — a delightful discovery moment.
export default function RareColorBadge({ size = 'sm' }) {
  const [open, setOpen] = useState(false);

  const sizes = {
    sm: { dot: 'w-3 h-3', text: 'text-xs', pad: 'px-2.5 py-1' },
    md: { dot: 'w-4 h-4', text: 'text-sm', pad: 'px-3 py-1.5' },
  };
  const s = sizes[size] || sizes.sm;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 ${s.pad} rounded-full bg-olo-deep text-white ${s.text} font-medium transition-shadow hover:shadow-[0_0_18px_hsl(var(--olo-glow)/0.55)] hover:brightness-110`}
      >
        <span className={`${s.dot} rounded-full bg-olo olo-glow-strong`} />
        olo seer
      </button>
      {/* Portalled to <body>: the dashboard wraps its content in a transformed
          pull-to-refresh container, which would otherwise become the containing
          block for `fixed` and push this panel far down the page. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-sm w-full p-8 rounded-3xl bg-olo-deep text-white text-center relative overflow-hidden animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-olo/20 rounded-full blur-[100px] animate-pulse-glow" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-olo olo-glow-strong mx-auto mb-5 animate-float" />
              <h3 className="font-heading font-800 text-2xl mb-3">You can see olo</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                This intense, saturated teal exists at a frequency most screens can't reproduce. If you see it vividly, your eyes are among the rare few — and you've unlocked the <span className="text-olo font-semibold">olo seer</span> charm.
              </p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-olo olo-glow-strong" />
                <div className="w-8 h-8 rounded-lg bg-emerald-500" />
                <div className="w-8 h-8 rounded-lg bg-teal-500" />
                <div className="w-8 h-8 rounded-lg bg-cyan-500" />
              </div>
              <p className="text-white/30 text-xs mb-5">olo stands apart from every other teal</p>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow"
              >
                <Eye className="w-4 h-4" /> Keep it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}