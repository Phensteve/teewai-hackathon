import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { goBack } from '@/lib/navigationTrail';

// Return to a real app page, skipping auth callbacks and setup steps.
// Use browser history within this visit; restore a safe page after OAuth.
// Direct entries fall back to the appropriate portal or an explicit fallback.
export default function BackButton({ fallback, label = 'Back', className = '', compact = false }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const defaultPage = isAuthenticated ? (window.location.pathname.startsWith('/dentist-') || user?.last_portal === 'dentist' ? '/dentist-dashboard' : '/dashboard') : '/';
  const returnToPreviousPage = () => goBack(navigate, fallback || defaultPage, isAuthenticated);
  // `compact` drops the 44px touch-target padding/height so it slots into a
  // tight header row next to other controls (Blog/News/Community headers).
  const base = compact
    ? `inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-olo transition-colors ${className}`
    : `inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors min-h-[44px] px-3 py-2 rounded-lg ${className}`;
  return (
    <button type="button" onClick={returnToPreviousPage} aria-label={label || 'Back'} className={base}>
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}