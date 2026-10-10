// Pure gamification math shared between the client and the analyzeScan backend
// so MMR / streak / reward / milestone computation runs identically on both
// sides. The backend uses this to run gamification server-side (reliable, no
// client drop loss); the client keeps its own @/lib/gamification for the
// dashboard/leaderboard UI. Ported faithfully from src/lib/gamification.js.

export const RANKS = [
  { name: 'Stone', min: 0, color: 'hsl(25 30% 45%)', glow: 'hsl(25 30% 55%)', icon: '🪨' },
  { name: 'Pearl', min: 100, color: 'hsl(0 0% 75%)', glow: 'hsl(0 0% 90%)', icon: '🦪' },
  { name: 'Crystal', min: 300, color: 'hsl(190 80% 55%)', glow: 'hsl(190 90% 70%)', icon: '🔮' },
  { name: 'Sapphire', min: 600, color: 'hsl(220 80% 55%)', glow: 'hsl(220 90% 70%)', icon: '🔷' },
  { name: 'Emerald', min: 1000, color: 'hsl(160 70% 42%)', glow: 'hsl(160 80% 55%)', icon: '💚' },
  { name: 'Aurora', min: 1500, color: 'hsl(174 100% 45%)', glow: 'hsl(174 100% 60%)', icon: '🌌' },
  { name: 'Diamond', min: 2200, color: 'hsl(200 100% 75%)', glow: 'hsl(200 100% 90%)', icon: '💠' },
  { name: 'Celestial', min: 3000, color: 'hsl(280 80% 65%)', glow: 'hsl(280 90% 80%)', icon: '✨' },
];

export const TIERS = ['I', 'II', 'III'];

export const getRank = (mmr: number) => {
  let rank = RANKS[0];
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (mmr >= RANKS[i].min) { rank = RANKS[i]; idx = i; }
  }
  const next = RANKS[idx + 1] || null;
  const span = next ? next.min - rank.min : 1;
  const progress = next ? Math.min(100, ((mmr - rank.min) / span) * 100) : 100;
  const tierIdx = next ? Math.min(2, Math.floor(progress / 33.34)) : 2;
  return { rank, next, progress, tier: TIERS[tierIdx], idx };
};

// UTC-normalized streak (Duolingo lesson: local-time streaks break across
// timezones). The "day" is a UTC calendar day.
export const computeStreak = (scans: { created_date?: string }[]) => {
  if (!scans.length) return 0;
  const dayKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const daySet = new Set(scans.map((s) => dayKey(new Date(s.created_date as any))));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!daySet.has(dayKey(cursor))) {
    const yesterday = new Date(cursor);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (!daySet.has(dayKey(yesterday))) return 0;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (daySet.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
};

// MMR: consistency-weighted. Raw quality ramps in over the first ~10 scans so
// brand-new users don't catapult into Sapphire.
export const computeMMR = (scans: any[], streak: number) => {
  if (!scans.length) return 0;
  let mmr = 0;
  mmr += Math.min(scans.length * 15, 300);
  mmr += streak * 25;
  if (scans.length >= 2) {
    const improvement = (scans[0]?.score || 0) - (scans[scans.length - 1]?.score || 0);
    mmr += Math.max(0, improvement * 8);
  }
  const experience = Math.min(1, scans.length / 10);
  const avgScore = scans.reduce((a: number, s: any) => a + (s.score || 0), 0) / scans.length;
  const avgHealth = scans.reduce((a: number, s: any) => a + (s.dental_health_score || 0), 0) / scans.length;
  mmr += (avgScore * 5 + avgHealth * 3) * experience;
  return Math.round(mmr);
};

// Variable-ratio reinforcement (Skinner / Finch).
export const RARITIES: Record<string, any> = {
  common:   { weight: 40, label: 'Common',       color: 'hsl(0 0% 60%)',   xp: 50,  icon: '✨' },
  bonus:    { weight: 25, label: 'Bonus XP',     color: 'hsl(43 90% 55%)', xp: 150, icon: '⚡' },
  rare:     { weight: 22, label: 'Rare Badge',    color: 'hsl(280 70% 60%)', xp: 100, icon: '🌟' },
  charm:    { weight: 10, label: 'Lucky Charm',  color: 'hsl(190 80% 55%)', xp: 120, icon: '🍀' },
  jackpot:  { weight: 3,  label: 'JACKPOT',      color: 'hsl(174 100% 50%)', xp: 500, icon: '💎' },
};

export const rollReward = () => {
  const total = Object.values(RARITIES).reduce((a: number, r: any) => a + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, rarity] of Object.entries(RARITIES)) {
    roll -= (rarity as any).weight;
    if (roll <= 0) return { key, ...(rarity as any) };
  }
  return { key: 'common', ...RARITIES.common };
};

export const MILESTONES = [
  { id: 'first_scan',     label: 'First Scan',         desc: 'Take your first scan',           xp: 50,   check: (s: any) => s.scans >= 1 },
  { id: 'streak3',        label: 'Getting Consistent', desc: '3-day streak',                    xp: 100,  check: (s: any) => s.streak >= 3 },
  { id: 'scans5',         label: 'Regular Scanner',    desc: 'Complete 5 scans',                xp: 100,  check: (s: any) => s.scans >= 5 },
  { id: 'streak7',        label: 'Week Warrior',       desc: '7-day streak',                    xp: 200,  check: (s: any) => s.streak >= 7 },
  { id: 'rank_pearl',     label: 'Pearl Rank',         desc: 'Reach Pearl rank',                xp: 150,  check: (s: any) => s.mmr >= 100 },
  { id: 'scans10',        label: 'Dedicated',          desc: 'Complete 10 scans',               xp: 200,  check: (s: any) => s.scans >= 10 },
  { id: 'streak14',       label: 'Fortnight Fire',     desc: '14-day streak',                   xp: 300,  check: (s: any) => s.streak >= 14 },
  { id: 'rank_crystal',   label: 'Crystal Rank',       desc: 'Reach Crystal rank',             xp: 250,  check: (s: any) => s.mmr >= 300 },
  { id: 'improve10',      label: 'Climber',            desc: 'Improve by 10 points',            xp: 250,  check: (s: any) => s.improvement >= 10 },
  { id: 'streak30',       label: 'Unbreakable',        desc: '30-day streak',                   xp: 500,  check: (s: any) => s.streak >= 30 },
  { id: 'rank_sapphire',  label: 'Sapphire Rank',      desc: 'Reach Sapphire rank',            xp: 400,  check: (s: any) => s.mmr >= 600 },
  { id: 'scans25',        label: 'Smile Scholar',      desc: 'Complete 25 scans',               xp: 400,  check: (s: any) => s.scans >= 25 },
  { id: 'rank_emerald',   label: 'Emerald Rank',       desc: 'Reach Emerald rank',             xp: 500,  check: (s: any) => s.mmr >= 1000 },
  { id: 'streak60',       label: 'Eternal Flame',      desc: '60-day streak',                   xp: 800,  check: (s: any) => s.streak >= 60 },
  { id: 'rank_aurora',    label: 'Aurora Rank',        desc: 'Reach Aurora rank',              xp: 700,  check: (s: any) => s.mmr >= 1500 },
  { id: 'scans50',        label: 'Smile Legend',       desc: 'Complete 50 scans',               xp: 600,  check: (s: any) => s.scans >= 50 },
  { id: 'rank_diamond',   label: 'Diamond Rank',       desc: 'Reach Diamond rank',             xp: 1000, check: (s: any) => s.mmr >= 2200 },
  { id: 'rank_celestial', label: 'Celestial Being',    desc: 'Reach Celestial rank',           xp: 1500, check: (s: any) => s.mmr >= 3000 },
];

export const getNewlyEarned = (stats: any, previouslyEarned: string[] = []) => {
  return MILESTONES.filter((m) => (m as any).check(stats) && !previouslyEarned.includes(m.id));
};