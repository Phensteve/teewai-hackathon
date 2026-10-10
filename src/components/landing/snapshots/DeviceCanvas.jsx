import { useEffect, useRef, useState } from 'react';

// Renders its children on a real iPhone-sized canvas (390 × 844 CSS px) and
// scales that canvas down to whatever space the parent gives it.
//
// This is why the screens read as genuine screenshots: every font size,
// padding, icon and radius inside is written at true device values (text-base,
// p-4, w-5 …) exactly as the shipped app uses them. Downscaling a real-size
// render produces crisp, correctly-proportioned type — whereas hand-authoring
// at text-[5px] produces the muddy, fake "mockup" look.
export const DEVICE_W = 390;
export const DEVICE_H = 844;

export default function DeviceCanvas({ children, className = '' }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0);
  const [canvasH, setCanvasH] = useState(DEVICE_H);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Scale on width so the UI is always at true device width, then let the
      // canvas take exactly the height available. The screens are flex columns,
      // so the bottom tab bar lands flush on the real bottom edge of the frame
      // — no dead gap, no clipped nav, whatever aspect the frame happens to be.
      const s = width / DEVICE_W;
      setScale(s);
      setCanvasH(height / s);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        style={{
          width: DEVICE_W,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          opacity: scale ? 1 : 0,
          // Keeps sub-pixel text rendering sharp through the transform.
          backfaceVisibility: 'hidden',
        }}
        className="absolute top-0 left-0"
      >
        {children}
      </div>
    </div>
  );
}