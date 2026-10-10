import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthLoading({ error, onRetry }) {
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm text-muted-foreground">{error.message || 'Something went wrong.'}</p>
        {onRetry && (
          <button onClick={onRetry} className="rounded-xl bg-olo px-5 py-2.5 text-sm font-semibold text-white">
            Try again
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-olo" />
    </div>
  );
}