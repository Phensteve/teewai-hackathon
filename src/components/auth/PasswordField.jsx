import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCapsLock } from '@/hooks/use-caps-lock';

// Shared password input for all auth pages: lock icon, visibility toggle,
// and a caps-lock hint. The `hint` prop renders optional content below the
// field (strength meter, match indicator, etc.). `labelExtra` renders
// right-aligned content next to the label (e.g. "Forgot password?").
//
// Input text is always 16px (text-base) — the accessibility-safe size that
// prevents iOS Safari auto-zoom on focus without blocking pinch-zoom.
export default function PasswordField({
  id,
  label,
  labelExtra,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  autoFocus,
  hint,
}) {
  const [show, setShow] = useState(false);
  const capsOn = useCapsLock();
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {labelExtra}
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10 h-11 sm:h-12 text-base"
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {capsOn && (
        <p className="text-xs text-amber-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" /> Caps Lock is on
        </p>
      )}
      {hint}
    </div>
  );
}