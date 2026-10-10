import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX = 110;

// Native-feeling pull-to-refresh for window-scrolled pages. Only engages when
// the page is already scrolled to the very top, so normal scrolling is
// untouched. Pointer events are passive — no scroll hijacking.
export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const cancelPull = () => {
    startY.current = null;
    if (!refreshing) setPull(0);
  };
  const isZoomed = () => (window.visualViewport?.scale || 1) > 1.01;
  const onTouchStart = (e) => {
    if (refreshing) return;
    if (e.touches.length !== 1 || isZoomed()) { cancelPull(); return; }
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    startY.current = scrollTop <= 0 ? e.touches[0].clientY : null;
  };

  const onTouchMove = (e) => {
    if (refreshing) return;
    if (e.touches.length !== 1 || isZoomed()) { cancelPull(); return; }
    if (startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    setPull(Math.max(0, Math.min(MAX, delta * 0.5)));
  };

  const onTouchEnd = async (e) => {
    if (refreshing) return;
    const shouldRefresh = startY.current != null && e.touches.length === 0 && !isZoomed() && pull >= THRESHOLD;
    startY.current = null;
    if (!shouldRefresh) { setPull(0); return; }
    setRefreshing(true);
    setPull(THRESHOLD);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  };

  const active = pull > 0 || refreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={cancelPull}
      className={className}
    >
      {/* Spinner reveal */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pull, transition: active && !refreshing ? 'none' : 'height 0.25s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
          style={{ opacity: Math.min(1, pull / THRESHOLD) }}
        >
          <RefreshCw
            className={`w-4 h-4 text-olo ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
          />
        </div>
      </div>
      <div style={{ marginTop: pull * 0.15, transition: active && !refreshing ? 'none' : 'margin-top 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
        {children}
      </div>
    </div>
  );
}