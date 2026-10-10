import { useReducedMotion } from 'framer-motion';

// Segmented progress bar (Duolingo/Phantom style) for auth flows.
// Each segment fills with brand color as the user advances. The fill animates
// smoothly (250ms ease-out, transform only). The current step label is shown
// below the bar. Reduced-motion: instant fill, no animation.
//
// Props:
//   steps  — array of short step labels (e.g. ["Account", "Username", "Verify"])
//   current — 0-based index of the current step
export default function AuthProgress({ steps, current }) {
  const reduced = useReducedMotion();
  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex gap-1.5">
        {steps.map((_, i) => {
          const filled = i <= current;
          return (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-olo origin-left"
                style={{
                  transform: filled ? 'scaleX(1)' : 'scaleX(0)',
                  transition: reduced
                    ? 'none'
                    : 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
          );
        })}
      </div>
      {steps[current] && (
        <p className="text-xs text-muted-foreground mt-2 text-center font-medium">
          {steps[current]}
        </p>
      )}
    </div>
  );
}