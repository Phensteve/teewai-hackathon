import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { setLastPortal } from '@/lib/portalRouting';

// Sleek in-app portal switcher for dual-role accounts (patient + dentist).
// Switches with a 220ms opacity fade — no reload, no re-auth, transform/opacity
// only. The full-screen overlay hides the layout swap between AppShell and
// DentistShell so the transition reads as a smooth fade, not a hard cut.
export default function PortalSwitcher({ to, label, icon: Icon = Stethoscope, className = '' }) {
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = useCallback(() => {
    if (switching) return;
    setSwitching(true);
    const portal = to.startsWith('/dentist') ? 'dentist' : 'patient';
    setLastPortal(portal);
    // Fade the overlay in (220ms), then navigate. The overlay unmounts with
    // the old shell; the new shell appears behind it at full opacity.
    setTimeout(() => {
      navigate(to);
    }, 220);
  }, [switching, to, navigate]);

  return (
    <>
      <button
        type="button"
        onClick={handleSwitch}
        disabled={switching}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors disabled:opacity-50 ${className}`}
        aria-label={label}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{label}</span>
      </button>
      {switching && (
        <div className="fixed inset-0 z-[100] bg-background portal-fade-overlay" />
      )}
    </>
  );
}