import StripeLogo from '@/components/StripeLogo';
import { Lock } from 'lucide-react';

// Reusable trust line for every payment surface. States that Paystack is the
// payment processor and that Stripe is its parent company. The "stripe"
// wordmark renders in brand blurple on light backgrounds and white on dark.
export default function PaystackTrustNote({ className = '', onDark = false }) {
  return (
    <div className={`flex items-center justify-center gap-1 text-xs ${onDark ? 'text-white/60' : 'text-muted-foreground'} ${className}`}>
      <Lock className="w-3 h-3 flex-shrink-0" />
      <span>Payments handled securely by Paystack, a <StripeLogo onDark={onDark} className="text-xs font-semibold" /> company.</span>
    </div>
  );
}