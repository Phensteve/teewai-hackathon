import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getConsent, setConsent } from '@/lib/consent';
import { isNativeApp } from '@/lib/isNativeApp';

// First-visit cookie / storage consent card.
//
// Compact toast-like card. Default position is bottom-right on desktop and a
// slim full-width bottom card on mobile. The card is DRAGGABLE via a grip
// handle (pointer events, mouse + touch), constrained to the viewport, and the
// position persists per device in localStorage. A one-time "Drag to move" hint
// fades away after the first drag or first dismissal. Reduced-motion shows no
// wobble. Equal-weight Accept / Reject pills, keyboard operable, entrance is a
// 12px slide-up + fade over 300ms.
//
// IP monitoring for abuse prevention / free scan limits is essential and always
// active regardless of the choice.

const POS_KEY = 'teewai_consent_pos';
const HINT_KEY = 'teewai_consent_hint_seen';
const MARGIN = 8;

function clampToViewport(x, y, w, h) {
  const maxX = window.innerWidth - w - MARGIN;
  // Account for the mobile AppShell top navbar so the card never sits
  // underneath it. On pages without the navbar, or on desktop where the
  // header is hidden (lg:hidden → display:none → zero-height rect), this
  // falls back to MARGIN.
  const header = document.querySelector('[data-consent-offset]');
  const headerRect = header?.getBoundingClientRect();
  const headerBottom = headerRect && headerRect.height > 0 ? headerRect.bottom : 0;
  const minY = Math.max(MARGIN, headerBottom + MARGIN);
  const maxY = window.innerHeight - h - MARGIN;
  return {
    x: Math.max(MARGIN, Math.min(x, Math.max(MARGIN, maxX))),
    y: Math.max(minY, Math.min(y, Math.max(minY, maxY))),
  };
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [consentSource, setConsentSource] = useState('banner');
  const [native] = useState(() => isNativeApp());
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(null); // {x,y} top-left px, or null = CSS default
  const [dragging, setDragging] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const location = useLocation();
  const cardRef = useRef(null);
  const gripRef = useRef(null);
  const acceptRef = useRef(null);
  const dragState = useRef(null);
  const momentumRef = useRef(null);
  const [momentum, setMomentum] = useState(false);

  useEffect(() => {
    if (!getConsent()) setVisible(true);
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          // Defer clamp until the card has a real size.
          requestAnimationFrame(() => {
            const rect = cardRef.current?.getBoundingClientRect();
            if (rect?.width) setPos(clampToViewport(p.x, p.y, rect.width, rect.height));
            else setPos(p);
          });
        }
      }
    } catch {}
    if (!localStorage.getItem(HINT_KEY)) setHintVisible(true);

    const handleOpen = (e) => {
      setConsentSource(e?.detail?.source || 'banner');
      setForceOpen(true);
      setVisible(true);
    };
    window.addEventListener('teewai:open-consent', handleOpen);
    return () => window.removeEventListener('teewai:open-consent', handleOpen);
  }, []);

  // Re-clamp on viewport resize so a saved position never lands off-screen.
  useEffect(() => {
    if (!pos) return;
    const onResize = () => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect?.width) setPos(clampToViewport(pos.x, pos.y, rect.width, rect.height));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos]);

  // Re-clamp on route change: a position saved on a page without a navbar
  // (e.g. the landing page) may need to shift down when the user navigates
  // to a page with the fixed AppShell top bar.
  useEffect(() => {
    if (!pos) return;
    const t = requestAnimationFrame(() => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect?.width) {
        const clamped = clampToViewport(pos.x, pos.y, rect.width, rect.height);
        if (clamped.x !== pos.x || clamped.y !== pos.y) setPos(clamped);
      }
    });
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (visible) {
      const t = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(t);
    }
    setMounted(false);
  }, [visible]);

  useEffect(() => {
    if (visible && mounted && acceptRef.current && !dragging) acceptRef.current.focus();
  }, [visible, mounted, dragging]);

  // When re-opened from the footer "Cookie settings" link, glide the card to a
  // centered, clearly-visible position so the user sees it open — the saved
  // drag position may be tucked in a corner. The smooth left/top transition
  // (active because we're not dragging) makes this a sleek glide.
  useEffect(() => {
    if (!forceOpen || !mounted) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const w = rect.width || window.innerWidth * 0.7;
    const h = rect.height || 120;
    const cx = (window.innerWidth - w) / 2;
    const cy = (window.innerHeight - h) / 2;
    setPos(clampToViewport(cx, cy, w, h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen, mounted]);

  // Cancel any in-flight momentum animation on unmount.
  useEffect(() => () => {
    if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
  }, []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch {}
  }, []);

  const onPointerDown = (e) => {
    const card = cardRef.current;
    const grip = gripRef.current;
    if (!card || !grip) return;
    // Cancel any in-flight momentum glide when the user grabs the card again.
    if (momentumRef.current) { cancelAnimationFrame(momentumRef.current); momentumRef.current = null; setMomentum(false); }
    // If a position isn't set yet (CSS default), capture the current rect so
    // the first drag starts from where the card actually is on screen.
    const rect = card.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      width: rect.width,
      height: rect.height,
      lastX: undefined,
      lastY: undefined,
      lastTime: undefined,
      vx: undefined,
      vy: undefined,
    };
    setDragging(true);
    try { grip.setPointerCapture(e.pointerId); } catch {}
    dismissHint();
  };

  const onPointerMove = (e) => {
    if (!dragging || !dragState.current) return;
    const ds = dragState.current;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    const newX = ds.origX + dx;
    const newY = ds.origY + dy;
    // Track velocity via exponential moving average for fluid momentum on release.
    const now = performance.now();
    const dt = now - (ds.lastTime || now);
    if (dt > 0) {
      const vx = (newX - (ds.lastX ?? ds.origX)) / dt;
      const vy = (newY - (ds.lastY ?? ds.origY)) / dt;
      ds.vx = ds.vx != null ? ds.vx * 0.6 + vx * 0.4 : vx;
      ds.vy = ds.vy != null ? ds.vy * 0.6 + vy * 0.4 : vy;
    }
    ds.lastX = newX;
    ds.lastY = newY;
    ds.lastTime = now;
    setPos(clampToViewport(newX, newY, ds.width, ds.height));
  };

  const savePos = (current) => {
    if (current) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(current)); } catch {}
    }
    return current;
  };

  // Momentum glide — after release the card continues with the drag velocity
  // and decelerates to a smooth stop, clamped to the viewport. This is the
  // "alive and fluid" feel: the card glides instead of snapping to a halt.
  const startMomentum = (ds) => {
    let vx = (ds.vx || 0) * 16; // px/frame (~60fps)
    let vy = (ds.vy || 0) * 16;
    let x = ds.lastX ?? ds.origX;
    let y = ds.lastY ?? ds.origY;
    const friction = 0.93;
    setMomentum(true);
    const animate = () => {
      x += vx;
      y += vy;
      vx *= friction;
      vy *= friction;
      const clamped = clampToViewport(x, y, ds.width, ds.height);
      if (clamped.x !== x) vx = 0; // hard stop at vertical walls — professional, no bounce
      if (clamped.y !== y) vy = 0;
      x = clamped.x;
      y = clamped.y;
      setPos(clamped);
      if (Math.abs(vx) > 0.4 || Math.abs(vy) > 0.4) {
        momentumRef.current = requestAnimationFrame(animate);
      } else {
        setMomentum(false);
        momentumRef.current = null;
        setPos(savePos);
      }
    };
    momentumRef.current = requestAnimationFrame(animate);
  };

  const endDrag = (e) => {
    if (!dragging) return;
    const ds = dragState.current;
    setDragging(false);
    dragState.current = null;
    const hasVelocity = ds && (Math.abs(ds.vx || 0) > 0.05 || Math.abs(ds.vy || 0) > 0.05);
    if (hasVelocity && ds) {
      startMomentum(ds);
    } else {
      setPos(savePos);
    }
  };

  const choose = (choice) => {
    dismissHint();
    setConsent(choice, consentSource);
    setVisible(false);
    setForceOpen(false);
  };

  if (!visible || native) return null;

  const positioned = pos != null;
  const style = {
    transform: mounted
      ? `${dragging ? 'scale(1.02)' : 'scale(1)'} translateY(0)`
      : 'translateY(12px)',
    opacity: mounted ? 1 : 0,
    transition: dragging
      ? 'none'
      : momentum
        ? 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
        : 'left 450ms cubic-bezier(0.16, 1, 0.3, 1), top 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)',
  };
  if (positioned) {
    style.left = pos.x;
    style.top = pos.y;
    style.right = 'auto';
    style.bottom = 'auto';
  }

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Cookie and storage consent"
      className={`fixed z-[55] w-[70vw] max-w-[380px] ${positioned ? '' : 'bottom-5 right-5'} motion-reduce:transition-none`}
      style={style}
    >
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)] p-3">
        <div
          ref={gripRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex flex-col items-center gap-1 mb-1.5 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ touchAction: 'none' }}
          aria-hidden="true"
        >
          <svg width="22" height="8" viewBox="0 0 22 8" fill="none">
            <circle cx="4" cy="2" r="1.3" fill="currentColor" className="text-muted-foreground/50" />
            <circle cx="4" cy="6" r="1.3" fill="currentColor" className="text-muted-foreground/50" />
            <circle cx="11" cy="2" r="1.3" fill="currentColor" className="text-muted-foreground/50" />
            <circle cx="11" cy="6" r="1.3" fill="currentColor" className="text-muted-foreground/50" />
            <circle cx="18" cy="2" r="1.3" fill="currentColor" className="text-muted-foreground/50" />
            <circle cx="18" cy="6" r="1.3" fill="currentColor" className="text-muted-foreground/50" />
          </svg>
          <span className={`text-[10px] text-muted-foreground/70 transition-opacity duration-500 motion-reduce:transition-none ${hintVisible ? 'opacity-100' : 'opacity-0'}`}>
            Drag to move
          </span>
        </div>
        <p className="text-[12px] leading-snug text-muted-foreground">
          We use essential storage for security and free scan limits. Optional cookies improve your experience.{' '}
          <Link to="/cookies" className="text-olo hover:underline font-medium">Learn more</Link>
        </p>
        <div className="mt-3 flex gap-2">
          <button
            ref={acceptRef}
            type="button"
            onClick={() => choose('accepted')}
            className="flex-1 h-9 rounded-full bg-olo text-white text-xs font-semibold px-2 hover:opacity-90 transition-opacity"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => choose('rejected')}
            className="flex-1 h-9 rounded-full border border-border text-foreground text-xs font-semibold px-2 hover:bg-muted/60 transition-colors"
          >
            Reject non-essential
          </button>
        </div>
      </div>
    </div>
  );
}