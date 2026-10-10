import { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import Logo from '@/components/Logo';
import { useScrollLock } from '@/hooks/use-scroll-lock';

// Sleek full-screen "continue as @username" prompt. Minimal, centered,
// premium — a single card with the account identity and a clear primary CTA.
export default function SignedInAccountPrompt({ account, onClose, onContinue, onSwitchAccount }) {
  const dialog = useRef(null);
  const name = account.username ? `@${account.username}` : account.display_name || account.full_name || 'your account';
  const initial = (account.username || account.display_name || account.full_name || 'T')[0].toUpperCase();
  useScrollLock(true);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      aria-labelledby="signed-in-heading"
      aria-describedby="signed-in-description"
      className="fixed inset-0 m-0 h-[100dvh] w-full max-h-none max-w-none border-0 bg-background text-foreground p-0 backdrop:bg-olo-deep/80"
    >
      <div className="min-h-full flex flex-col safe-area-inset-top safe-area-inset-bottom">
        <header className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
          </div>
          <button
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            {/* Avatar with glow */}
            <div className="relative mb-7">
              <span className="absolute -inset-3 rounded-full bg-olo/15 blur-xl" />
              <span className="relative w-20 h-20 rounded-full bg-olo text-white flex items-center justify-center font-heading font-700 text-3xl olo-glow">
                {initial}
              </span>
            </div>

            <p className="text-label text-muted-foreground mb-3">Welcome back</p>
            <h1 id="signed-in-heading" className="font-heading font-700 text-3xl sm:text-4xl tracking-tight leading-tight mb-2">
              Continue as <span className="text-olo break-words">{name}</span>
            </h1>
            <p id="signed-in-description" className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-8">
              Your scans and progress are right where you left them.
            </p>

            {/* Primary CTA */}
            <button
              onClick={onContinue}
              className="w-full rounded-2xl bg-olo text-white py-4 px-5 font-semibold flex items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-95 transition-transform olo-glow"
            >
              <span className="min-w-0 break-words">Continue</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>

            <button
              onClick={onSwitchAccount || onClose}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground py-3 transition-colors"
            >
              {onSwitchAccount ? 'Use a different account' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}