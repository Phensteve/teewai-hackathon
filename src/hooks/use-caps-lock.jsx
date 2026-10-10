import { useState, useEffect } from 'react';

// Tracks the Caps Lock modifier state via global key events. iOS Safari and
// most Android keyboards do not fire keyup for Caps Lock, so this is a
// best-effort hint — desktop browsers and some mobile keyboards do report it.
export function useCapsLock() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (typeof e.getModifierState === 'function') {
        setOn(e.getModifierState('CapsLock'));
      }
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', handler);
    };
  }, []);
  return on;
}