import Logo from '@/components/Logo';
import Spinner from '@/components/Spinner';

export default function AuthLoading({ error, onRetry, label = 'Opening your account…' }) {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm" role="status" aria-live="polite">
        <Logo size={48} />
        {error ? (
          <>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={onRetry} className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium">Try again</button>
          </>
        ) : (
          <>
            <Spinner size={24} />
            <p className="text-sm text-muted-foreground">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}