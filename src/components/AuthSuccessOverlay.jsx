import { CheckCircle2 } from "lucide-react";

// Full-screen confirmation shown right after a successful auth action
// (email verification, password reset) before the redirect happens.
export default function AuthSuccessOverlay({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="fixed inset-0 z-[100] bg-olo-deep/95 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-olo/15 flex items-center justify-center olo-glow">
          <CheckCircle2 className="w-9 h-9 text-olo" />
        </div>
        <p className="font-heading font-700 text-xl text-white">{title}</p>
        {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex items-center justify-center bg-olo text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-105 transition-transform"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}