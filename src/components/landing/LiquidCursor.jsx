import { useEffect, useRef } from 'react';

// Underwater pointer layer — the cursor drags a soft caustic bloom through the
// water with eased trailing, its edge warped by animated turbulence so it reads
// as liquid rather than a glow dot. Clicks push out a ripple ring.
// Desktop pointers only; disabled for prefers-reduced-motion.
export default function LiquidCursor() {
  const blobRef = useRef(null);
  const trailRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;

    let raf = 0;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const lead = { ...target };
    const trail = { ...target };

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const onClick = (e) => {
      const layer = layerRef.current;
      if (!layer) return;
      const ring = document.createElement('span');
      ring.className = 'liquid-ripple';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      layer.appendChild(ring);
      setTimeout(() => ring.remove(), 1100);
    };

    const tick = () => {
      lead.x += (target.x - lead.x) * 0.14;
      lead.y += (target.y - lead.y) * 0.14;
      trail.x += (lead.x - trail.x) * 0.07;
      trail.y += (lead.y - trail.y) * 0.07;
      if (blobRef.current) {
        blobRef.current.style.transform = `translate3d(${lead.x}px, ${lead.y}px, 0) translate(-50%, -50%)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Turbulence filter — animated so the bloom edge churns like water */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <filter id="liquid-warp" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise">
            <animate
              attributeName="baseFrequency"
              dur="14s"
              values="0.012 0.02; 0.02 0.012; 0.012 0.02"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="110" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div ref={layerRef} className="fixed inset-0 z-[5] pointer-events-none hidden lg:block overflow-hidden">
        <div
          ref={trailRef}
          className="absolute w-[600px] h-[600px] rounded-full liquid-blob-trail"
          style={{ filter: 'url(#liquid-warp) blur(34px)' }}
        />
        <div
          ref={blobRef}
          className="absolute w-[340px] h-[340px] rounded-full liquid-blob-lead"
          style={{ filter: 'url(#liquid-warp) blur(16px)' }}
        />
      </div>
    </>
  );
}