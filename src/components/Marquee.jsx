import { useRef, useEffect, useMemo, useState } from 'react';

// Auto-scrolling horizontal marquee. It moves by itself; on touch it eases to a
// gentle stop (a fluid "water" deceleration — not an abrupt play-state flip),
// and on desktop the same smooth deceleration happens on hover. Resumes when
// released / the cursor leaves. Pauses when scrolled out of view. Seamless
// loop via a duplicated content set. GPU-friendly (transform only).
// `reverse` scrolls the opposite direction (rightward) for paired rows.
export default function Marquee({ children, speed = 36, gap = 24, className = '', reverse = false }) {
  const trackRef = useRef(null);
  const groupRef = useRef(null);
  const offsetRef = useRef(0);
  const targetRef = useRef(speed);
  const currentRef = useRef(speed);
  const rafRef = useRef(null);
  const lastRef = useRef(null);
  const widthRef = useRef(0);
  const pressedRef = useRef(false);
  const hoveredRef = useRef(false);
  const visibleRef = useRef(true);
  const [canHover, setCanHover] = useState(false);

  const items = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  const dir = reverse ? -1 : 1;

  useEffect(() => {
    setCanHover(typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;

    targetRef.current = speed * dir;
    currentRef.current = speed * dir;

    const measure = () => { widthRef.current = group.offsetWidth || 0; };
    measure();
    // For reverse, start one group-width to the left so the original (right
    // group) is visible first and the duplicate enters from the left edge.
    if (reverse) offsetRef.current = -widthRef.current;
    const ro = new ResizeObserver(measure);
    ro.observe(group);

    const updateTarget = () => {
      targetRef.current = (pressedRef.current || hoveredRef.current || !visibleRef.current) ? 0 : speed * dir;
    };

    const io = new IntersectionObserver(([e]) => { visibleRef.current = e.isIntersecting; updateTarget(); }, { threshold: 0 });
    io.observe(track);
    updateTarget();

    const tick = (t) => {
      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min(0.05, (t - lastRef.current) / 1000);
      lastRef.current = t;
      // ease current speed toward target — smooth "water" deceleration / resume
      currentRef.current += (targetRef.current - currentRef.current) * Math.min(1, dt * 4.5);
      offsetRef.current -= currentRef.current * dt;
      const w = widthRef.current;
      if (w > 0) {
        if (reverse) {
          if (offsetRef.current >= 0) offsetRef.current -= w;
          else if (offsetRef.current < -w) offsetRef.current += w;
        } else {
          if (offsetRef.current <= -w) offsetRef.current += w;
          else if (offsetRef.current > 0) offsetRef.current -= w;
        }
      }
      track.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); io.disconnect(); lastRef.current = null; };
  }, [speed, items, reverse, dir]);

  const pause = () => { pressedRef.current = true; targetRef.current = 0; };
  const resume = () => { pressedRef.current = false; targetRef.current = (hoveredRef.current || !visibleRef.current) ? 0 : speed * dir; };
  const onEnter = () => { if (!canHover) return; hoveredRef.current = true; targetRef.current = 0; };
  const onLeave = () => { if (!canHover) return; hoveredRef.current = false; targetRef.current = (pressedRef.current || !visibleRef.current) ? 0 : speed * dir; };

  const renderGroup = (hidden) => (
    <div className="flex" aria-hidden={hidden || undefined}>
      {items.map((c, i) => <div key={i} style={{ marginRight: gap, flexShrink: 0 }}>{c}</div>)}
    </div>
  );

  return (
    <div
      className={`overflow-hidden ${className}`}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onPointerLeave={resume}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div ref={trackRef} className="flex w-max" style={{ willChange: 'transform' }}>
        {reverse ? (
          <>
            {renderGroup(true)}
            <div ref={groupRef} className="flex">{items.map((c, i) => <div key={i} style={{ marginRight: gap, flexShrink: 0 }}>{c}</div>)}</div>
          </>
        ) : (
          <>
            <div ref={groupRef} className="flex">{items.map((c, i) => <div key={i} style={{ marginRight: gap, flexShrink: 0 }}>{c}</div>)}</div>
            {renderGroup(true)}
          </>
        )}
      </div>
    </div>
  );
}