import { motion } from 'framer-motion';

// Floating glassmorphism dock — pill-shaped, fixed above the app's bottom
// nav. Inspired by oluyodamilare.unrufld.app's glass navbar.
// items: [{ id, label, icon, short? }] · value: active id · onChange(id)
export default function GlassDock({ items, value, onChange, layoutId = 'glass-dock-pill' }) {
  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 md:hidden">
      <div className="flex gap-1 p-1.5 rounded-full glass-light ring-1 ring-white/25 shadow-[0_16px_40px_-14px_rgba(0,0,0,0.45)]">
        {items.map((t) => {
          const Icon = t.icon;
          const isActive = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-full transition-all active:scale-95 ${
                isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full bg-olo olo-glow -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-medium leading-none">{t.short || t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}