import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Minus, RotateCcw } from 'lucide-react';
import TrendGraph from './TrendGraph';
import { useScrollLock } from '@/hooks/use-scroll-lock';

// Expandable shade-trend graph — fullscreen overlay with drag-to-pan and
// pinch-to-zoom. The graph renders at a large base size (wider and taller
// than a phone viewport) so both axes are scrollable at once; pinch and the
// +/- buttons zoom further. Wheel-zoom works on desktop.
const MIN_Z = 0.6;
const MAX_Z = 4;
const BASE_WIDTH = 900;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function ExpandableGraph({ open, onClose, ...graphProps }) {
  const viewportRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const [t, setT] = useState({ x: 0, y: 0, z: 1 });

  // Lock the page behind so it can't scroll while the modal is open.
  useScrollLock(open);

  // Reset transform + clear gesture state every time the sheet opens.
  useEffect(() => {
    if (open) setT({ x: 0, y: 0, z: 1 });
    else { pointers.current.clear(); gesture.current = null; }
  }, [open]);

  const viewportCenter = useCallback(() => {
    const r = viewportRef.current?.getBoundingClientRect();
    return r ? { cx: r.width / 2, cy: r.height / 2 } : { cx: 0, cy: 0 };
  }, []);

  const zoomAround = useCallback((px, py, factor) => {
    setT((prev) => {
      const newZ = clamp(prev.z * factor, MIN_Z, MAX_Z);
      const { cx, cy } = viewportCenter();
      // local offset (from content center) currently under (px, py)
      const ox = (px - cx - prev.x) / prev.z;
      const oy = (py - cy - prev.y) / prev.z;
      return { x: px - cx - ox * newZ, y: py - cy - oy * newZ, z: newZ };
    });
  }, [viewportCenter]);

  const zoomCenter = useCallback((factor) => {
    const { cx, cy } = viewportCenter();
    zoomAround(cx, cy, factor);
  }, [viewportCenter, zoomAround]);

  // Native non-passive wheel listener so we can preventDefault page scroll.
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAround(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, zoomAround]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = viewportRef.current.getBoundingClientRect();
    const rel = (p) => ({ x: p.x - r.left, y: p.y - r.top });
    if (pointers.current.size === 1) {
      const p = rel({ x: e.clientX, y: e.clientY });
      gesture.current = { type: 'pan', sx: p.x, sy: p.y, tx: t.x, ty: t.y };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const pa = rel(a), pb = rel(b);
      gesture.current = {
        type: 'pinch',
        dist: Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1,
        midX: (pa.x + pb.x) / 2, midY: (pa.y + pb.y) / 2,
        z: t.z, tx: t.x, ty: t.y,
      };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const r = viewportRef.current.getBoundingClientRect();
    const rel = (p) => ({ x: p.x - r.left, y: p.y - r.top });
    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const pa = rel(a), pb = rel(b);
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const midX = (pa.x + pb.x) / 2, midY = (pa.y + pb.y) / 2;
      const newZ = clamp(g.z * (dist / g.dist), MIN_Z, MAX_Z);
      const { cx, cy } = viewportCenter();
      const ox = (g.midX - cx - g.tx) / g.z;
      const oy = (g.midY - cy - g.ty) / g.z;
      setT({ x: midX - cx - ox * newZ, y: midY - cy - oy * newZ, z: newZ });
    } else if (g.type === 'pan') {
      const p = rel({ x: e.clientX, y: e.clientY });
      setT((prev) => ({ x: g.tx + (p.x - g.sx), y: g.ty + (p.y - g.sy), z: prev.z }));
    }
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      const r = viewportRef.current.getBoundingClientRect();
      gesture.current = { type: 'pan', sx: p.x - r.left, sy: p.y - r.top, tx: t.x, ty: t.y };
    } else if (pointers.current.size === 0) {
      gesture.current = null;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 safe-area-inset-top"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl h-[82vh] max-h-[760px] rounded-3xl bg-card shadow-3 flex flex-col overflow-hidden animate-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-heading font-700 text-lg leading-tight truncate">Shade trend</h2>
            <p className="text-xs text-muted-foreground">Drag to pan · pinch to zoom</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => zoomCenter(1 / 1.25)} className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center active:scale-95 transition-transform" aria-label="Zoom out">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={() => setT({ x: 0, y: 0, z: 1 })} className="h-9 px-3 rounded-xl bg-muted/60 flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-transform" aria-label="Reset view">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={() => zoomCenter(1.25)} className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center active:scale-95 transition-transform" aria-label="Zoom in">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-olo text-primary-foreground flex items-center justify-center active:scale-95 transition-transform ml-1" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pan/zoom viewport */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              style={{
                width: BASE_WIDTH,
                transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})`,
                transformOrigin: 'center center',
                touchAction: 'none',
                pointerEvents: 'none',
              }}
            >
              <TrendGraph {...graphProps} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 text-center text-[11px] text-muted-foreground/70 safe-area-inset-bottom">
          Pinch to zoom · drag to move · {Math.round(t.z * 100)}%
        </div>
      </div>
    </div>
  );
}