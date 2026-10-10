// Score multipliers unlocked by scan count + consistency streak.
// Mirrors Subway Surfers' "score booster" unlocks — you earn a higher
// multiplier by playing the core app (scanning) and staying consistent.
export const MULTIPLIERS = [
  { id: 'x1', label: '1×', multiplier: 1, scans: 0, streak: 0, desc: 'Default' },
  { id: 'x1_5', label: '1.5×', multiplier: 1.5, scans: 3, streak: 0, desc: '3 scans' },
  { id: 'x2', label: '2×', multiplier: 2, scans: 7, streak: 0, desc: '7 scans' },
  { id: 'x3', label: '3×', multiplier: 3, scans: 15, streak: 3, desc: '15 scans + 3-day streak' },
  { id: 'x5', label: '5×', multiplier: 5, scans: 30, streak: 7, desc: '30 scans + 7-day streak' },
];

export function getActiveMultiplier(scanCount, streak) {
  let active = MULTIPLIERS[0];
  for (const m of MULTIPLIERS) {
    if (scanCount >= m.scans && streak >= m.streak) active = m;
  }
  return active;
}

export function getNextMultiplier(scanCount, streak) {
  for (const m of MULTIPLIERS) {
    if (scanCount < m.scans || streak < m.streak) return m;
  }
  return null;
}