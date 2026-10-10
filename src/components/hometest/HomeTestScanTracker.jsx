import { useState, useEffect, useRef } from 'react';
import { unrufld } from '@/api/unrufldClient';
import LiveScanIcon from './LiveScanIcon';

export default function HomeTestScanTracker() {
  const [count, setCount] = useState(null);
  const [display, setDisplay] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let active = true;

    const fetchCount = async () => {
      try {
        const res = await unrufld.functions.invoke('publicStats', {});
        if (active && res?.data?.totalScans != null) setCount(res.data.totalScans);
      } catch {}
    };
    fetchCount();
    const refresh = setInterval(fetchCount, 60000);

    return () => {
      active = false;
      clearInterval(refresh);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (count == null) return;
    if (display == null) { setDisplay(count); return; }
    const start = display;
    const diff = count - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const dur = 800;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      setDisplay(Math.round(start + diff * (1 - Math.pow(1 - t, 3))));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [count, display]);

  if (display == null) return null;

  return (
    <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#0d9f8e]/30 bg-[#06121a]/60 backdrop-blur-md">
      <LiveScanIcon size={14} />
      <span className="text-xs font-medium text-white/80">
        <span className="font-heading font-700 text-[#5eead4] tabular-nums">{display.toLocaleString()}</span>
        <span className="text-white/50 ml-1.5">scans analyzed</span>
      </span>
    </div>
  );
}