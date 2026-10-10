import { useEffect, useState } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

// Global connectivity toast. Uses a bottom-anchored snackbar pattern so it
// never covers the top navigation or page content. The "offline" state stays
// visible (dismissable) until connectivity returns; "back online" auto-hides.
export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => { setShowBackOnline(false); setIsOffline(true); setDismissedOffline(false); };
    const goOnline = () => { setIsOffline(false); setShowBackOnline(true); setDismissedOffline(false); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    if (!showBackOnline) return;
    const t = setTimeout(() => setShowBackOnline(false), 3500);
    return () => clearTimeout(t);
  }, [showBackOnline]);

  const showOffline = isOffline && !dismissedOffline;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pointer-events-none">
      {showOffline && (
        <div className="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-2xl bg-warning text-warning-foreground px-4 py-3 shadow-lg shadow-warning/20 animate-fade-up">
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <WifiOff className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">You're offline</p>
            <p className="text-xs text-white/80 leading-tight mt-0.5">Some features may be unavailable.</p>
          </div>
          <button
            onClick={() => setDismissedOffline(true)}
            aria-label="Dismiss"
            className="flex-shrink-0 w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {showBackOnline && !isOffline && (
        <div className="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-2xl bg-success text-success-foreground px-4 py-3 shadow-lg shadow-success/20 animate-fade-up">
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Back online</p>
            <p className="text-xs text-white/80 leading-tight mt-0.5">You're reconnected.</p>
          </div>
        </div>
      )}
    </div>
  );
}