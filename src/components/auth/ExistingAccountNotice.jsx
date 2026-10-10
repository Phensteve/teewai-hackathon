import { ArrowLeft } from 'lucide-react';

export default function ExistingAccountNotice({ email, onBack }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-heading text-xl font-700">You already have an account</h2>
      <p className="text-sm text-muted-foreground">
        An account with <span className="font-medium text-foreground">{email}</span> already exists.
        Sign in instead.
      </p>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-olo hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    </div>
  );
}