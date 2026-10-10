import CurrencySwitcher from '@/components/CurrencySwitcher';

// In-flow currency pill. When `sticky` is true (landing page), it sticks just
// under the top bar while its section scrolls past. When `sticky` is false
// (inside the AppShell / Subscription page), it renders as a normal in-flow
// centered pill — the AppShell already has its own fixed header and padding,
// so sticky positioning there causes the switcher to collide with the navbar
// and triggers layout jitter / zoom artifacts in the APK.
export default function StickyCurrencySwitcher({ topClassName = 'top-[calc(3.5rem_+_env(safe-area-inset-top))] lg:top-4', dark = false, sticky = true }) {
  return (
    <div className={`${sticky ? `sticky ${topClassName}` : ''} z-30 flex justify-center py-2 mb-8 ${dark ? 'dark' : ''}`}>
      <CurrencySwitcher />
    </div>
  );
}