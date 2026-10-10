import { useState, useEffect } from 'react';
import { scans as insforgeScans } from '@/lib/insforgeDb';
import { computeStreak } from '@/lib/gamification';
import { getActiveMultiplier, getNextMultiplier } from '@/lib/surfers/multipliers';
import BrushGame from '@/components/surfers/BrushGame';
import Spinner from '@/components/Spinner';

export default function TeewaiSurfers() {
  const [loading, setLoading] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    insforgeScans.list('-created_date', 100)
      .then((scans) => {
        setScanCount(scans.length);
        setStreak(computeStreak(scans));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const active = getActiveMultiplier(scanCount, streak);
  const next = getNextMultiplier(scanCount, streak);

  return (
    <BrushGame
      multiplier={active.multiplier}
      multiplierLabel={active.label}
      scanCount={scanCount}
      streak={streak}
      nextMultiplier={next}
    />
  );
}