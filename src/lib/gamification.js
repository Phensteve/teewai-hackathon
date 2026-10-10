// Gamification engine — Octalysis-aligned (Yu-kai Chou's 8 Core Drives).
//
// CD1 Epic Meaning & Calling  → Smile Missions, Beginner's Luck, Endgame
// CD2 Development & Accomplishment → MMR ranks, milestones, daily quests
// CD3 Empowerment of Creativity & Feedback → Future-self projection, brag cards
// CD4 Ownership & Possession → Badges, charms, streak shields
// CD5 Social Influence & Relatedness → Leaderboard, rivals, mentorship
// CD6 Scarcity & Impatience → Seasonal resets, limited rewards
// CD7 Unpredictability & Curiosity → Variable ratio rewards, smile traits
// CD8 Loss & Avoidance → Streak shields, loss aversion companion
//
// Experience Phases (Level II Octalysis):
//   Discovery → Onboarding → Scaffolding → Endgame
// White Hat (CD1-5) drives long-term loyalty; Black Hat (CD6-8) creates
// initial urgency. Companion messaging transitions from Black Hat → White Hat
// as users mature, per Yu-kai's guidance against Black Hat burnout.

// === MMR RANKS (teewai-themed, LoL-style ladder) ===
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

// Tiers climb from the ground up: every new user starts at Stone I and works
// their way to Stone III before promoting to the next rank.
export const TIERS = ['I', 'II', 'III'];

export const getRank = (mmr) => {
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

// === EXPERIENCE PHASES (Octalysis Level II) ===
// Yu-kai Chou: each phase needs different Core Drive emphasis.
// The transition from Onboarding → Scaffolding is where most products die.
export const PHASES = {
  discovery:   { label: 'Discovery',   desc: 'You\'re exploring what teewai can do' },
  onboarding:  { label: 'Onboarding',  desc: 'Your first steps into the smile journey' },
  scaffolding: { label: 'Scaffolding', desc: 'Building habits, climbing the ladder' },
  endgame:     { label: 'Endgame',     desc: 'You\'ve mastered the art of the smile' },
};

export const getExperiencePhase = (stats) => {
  const { scans, streak, mmr } = stats;
  const scanCount = typeof scans === 'number' ? scans : (scans?.length || 0);
  // Endgame: reached Diamond rank or 50+ scans (veteran status)
  if (mmr >= 2200 || scanCount >= 50) return 'endgame';
  // Scaffolding: past first week or 5+ scans (habit formed)
  if (streak >= 7 || scanCount >= 5) return 'scaffolding';
  // Onboarding: completed first scan but not yet a habit
  if (scanCount >= 1) return 'onboarding';
  // Discovery: hasn't scanned yet
  return 'discovery';
};

// === CD1: EPIC MEANING & CALLING — Smile Missions ===
// Yu-kai Chou: "People contribute because they believe they are engaged in
// something bigger than themselves." This is the #1 White Hat drive for
// long-term loyalty, and the biggest gap in most gamified systems.
export const SMILE_MISSIONS = [
  {
    id: 'first_smile',
    title: 'The First Smile',
    narrative: 'Every great journey begins with a single scan. Yours starts now.',
    quest: 'Take your first scan',
    check: (s) => s.scans >= 1,
    reward: 'Beginner\'s Luck charm',
  },
  {
    id: 'baseline_builder',
    title: 'Know Your Starting Point',
    narrative: 'You can\'t improve what you don\'t measure. Three scans create your smile baseline — the foundation everything else is built on.',
    quest: 'Complete 3 scans',
    check: (s) => s.scans >= 3,
    reward: 'Baseline Badge',
  },
  {
    id: 'habit_forge',
    title: 'Forge the Habit',
    narrative: 'Consistency is where the magic lives. Seven days of scanning wires your smile into your daily rhythm.',
    quest: 'Reach a 7-day streak',
    check: (s) => s.streak >= 7,
    reward: 'Habit Forge milestone',
  },
  {
    id: 'self_knowledge',
    title: 'Master of Self',
    narrative: 'Ten scans in, you know your smile better than 99% of people know theirs. That knowledge is power.',
    quest: 'Complete 10 scans',
    check: (s) => s.scans >= 10,
    reward: 'Self-Mastery badge',
  },
  {
    id: 'transformation',
    title: 'The Transformation',
    narrative: 'Real change happens slowly, then all at once. Prove it — show measurable improvement from where you started.',
    quest: 'Improve your whiteness score by 10+ points',
    check: (s) => s.improvement >= 10,
    reward: 'Transformer charm',
  },
  {
    id: 'unbreakable',
    title: 'Unbreakable',
    narrative: 'Thirty days. Most people quit by day 12. You didn\'t. This is who you are now — someone who finishes what they start.',
    quest: 'Reach a 30-day streak',
    check: (s) => s.streak >= 30,
    reward: 'Unbreakable milestone',
  },
  {
    id: 'smile_scholar',
    title: 'Smile Scholar',
    narrative: 'Twenty-five scans of data. You\'ve turned your smile into a science — and yourself into the study.',
    quest: 'Complete 25 scans',
    check: (s) => s.scans >= 25,
    reward: 'Scholar badge',
  },
  {
    id: 'mastery',
    title: 'The Mastery',
    narrative: 'Diamond rank. You\'ve climbed higher than 99.5% of teewai users. Your smile journey is now a story others look to for inspiration.',
    quest: 'Reach Diamond rank',
    check: (s) => s.mmr >= 2200,
    reward: 'Master status',
  },
  {
    id: 'legend',
    title: 'Smile Legend',
    narrative: 'Fifty scans. A half-century of data points. You are the embodiment of what teewai was built for — a person who took charge of their own smile destiny.',
    quest: 'Complete 50 scans',
    check: (s) => s.scans >= 50,
    reward: 'Legend status',
  },
];

export const getCurrentMission = (stats) => {
  return SMILE_MISSIONS.find((m) => !m.check(stats)) || SMILE_MISSIONS[SMILE_MISSIONS.length - 1];
};

export const getCompletedMissions = (stats) => {
  return SMILE_MISSIONS.filter((m) => m.check(stats));
};

// === CD1: BEGINNER'S LUCK (Game Technique #23) ===
// Yu-kai Chou: "If a gamer, upon the first day of playing, randomly earns one
// of the most powerful items... he isn't going to quit on day one."
// First-scan users get a guaranteed rare-or-better "destiny" reward.
export const BEGINNER_LUCK_CHARMS = [
  { id: 'destiny_pearl', label: 'Pearl of Destiny', icon: '🦪', rarity: 'rare', desc: 'Your first scan awakened something special. This pearl marks the beginning of your journey.' },
  { id: 'first_light', label: 'First Light', icon: '🌅', rarity: 'rare', desc: 'The first smile you shared with teewai. A new dawn for your teeth.' },
  { id: 'chosen_one', label: 'The Chosen Charm', icon: '🌟', rarity: 'charm', desc: 'Some say this charm only appears for those destined for great smiles. You found it on day one.' },
  { id: 'genesis_gem', label: 'Genesis Gem', icon: '💎', rarity: 'jackpot', desc: 'An extraordinarily rare drop. Legends say it appears only once per smile journey — and only at the very start.' },
];

export const rollBeginnerLuck = () => {
  // Weighted: first scan gets a strong reward (no common drops)
  const weights = [30, 30, 25, 15];
  let roll = Math.random() * 100;
  for (let i = 0; i < BEGINNER_LUCK_CHARMS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return BEGINNER_LUCK_CHARMS[i];
  }
  return BEGINNER_LUCK_CHARMS[0];
};

// === CD1: ENDGAME — Smile Ambassador system ===
// Yu-kai Chou: "Endgame focuses on Social Influence, Epic Meaning, and Loss &
// Avoidance to turn veterans into mentors, advocates, and high-value customers."
export const ENDGAME_TITLES = [
  { minMmr: 3000, title: 'Smile Luminary', desc: 'You\'ve reached the summit. Your journey inspires everyone who sees it.', privileges: ['mentor_eligible', 'exclusive_aurora_badge', 'season_legacy_status'] },
  { minMmr: 2200, title: 'Smile Ambassador', desc: 'Diamond rank — you\'re in the top 0.5%. New scanners look up to you.', privileges: ['mentor_eligible', 'ambassador_badge'] },
  { minMmr: 1500, title: 'Smile Mentor', desc: 'Aurora rank — your consistency is a beacon. Consider mentoring newer members.', privileges: ['mentor_unlocked'] },
];

export const getEndgameTitle = (mmr) => {
  return ENDGAME_TITLES.find((t) => mmr >= t.minMmr) || null;
};

// === STREAK CALCULATION (UTC-normalized) ===
// Duolingo learned the hard way: using local browser time for streaks causes
// inconsistency when users travel timezones. We use UTC date boundaries so a
// scan at 11pm in Lagos (22:00 UTC) and 8am in London (08:00 UTC next day)
// are treated consistently. The "day" is defined as a UTC calendar day.
export const computeStreak = (scans) => {
  if (!scans.length) return 0;
  const dayKey = (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const daySet = new Set(scans.map((s) => dayKey(new Date(s.created_date))));
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

// === MMR CALCULATION ===
// Everyone starts at Stone III (0 MMR) and climbs from there. Raw scan quality
// (whiteness / health) used to be applied at full weight from the very first
// scan, which catapulted brand-new users straight into Sapphire. Quality now
// ramps in over the first ~10 scans, so rank is earned through consistency.
export const computeMMR = (scans, streak) => {
  if (!scans.length) return 0;
  let mmr = 0;
  mmr += Math.min(scans.length * 15, 300);
  mmr += streak * 25;
  if (scans.length >= 2) {
    const improvement = (scans[0]?.score || 0) - (scans[scans.length - 1]?.score || 0);
    mmr += Math.max(0, improvement * 8);
  }
  const experience = Math.min(1, scans.length / 10);
  const avgScore = scans.reduce((a, s) => a + (s.score || 0), 0) / scans.length;
  const avgHealth = scans.reduce((a, s) => a + (s.dental_health_score || 0), 0) / scans.length;
  mmr += (avgScore * 5 + avgHealth * 3) * experience;
  return Math.round(mmr);
};

// === CD7: VARIABLE RATIO REINFORCEMENT ===
// Unpredictable rewards keep the brain in a "chase state" (Skinner / Finch).
export const RARITIES = {
  common:   { weight: 40, label: 'Common',       color: 'hsl(0 0% 60%)',   xp: 50,  icon: '✨' },
  uncommon: { weight: 20, label: 'Uncommon',     color: 'hsl(160 70% 42%)', xp: 100, icon: '🌿' },
  bonus:    { weight: 25, label: 'Bonus XP',     color: 'hsl(43 90% 55%)', xp: 150, icon: '⚡' },
  rare:     { weight: 22, label: 'Rare Badge',    color: 'hsl(280 70% 60%)', xp: 100, icon: '🌟' },
  charm:    { weight: 10, label: 'Lucky Charm',  color: 'hsl(190 80% 55%)', xp: 120, icon: '🍀' },
  jackpot:  { weight: 3,  label: 'JACKPOT',      color: 'hsl(174 100% 50%)', xp: 500, icon: '💎' },
};

export const rollReward = () => {
  const total = Object.values(RARITIES).reduce((a, r) => a + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, rarity] of Object.entries(RARITIES)) {
    roll -= rarity.weight;
    if (roll <= 0) return { key, ...rarity };
  }
  return { key: 'common', ...RARITIES.common };
};

// === MILESTONES — infinite game, always a next step ===
// Each milestone has a `why` (what this means for your dental health, in plain
// language) and a `progress(stats)` function returning 0–100, so the tracker
// shows real progress instead of a hacky parseInt guess. Labels are
// straightforward, not gamey — the user is tracking their own smile, not
// playing a slot machine.
export const MILESTONES = [
  { id: 'first_scan',     label: 'First Scan',          desc: 'Take your first scan',            xp: 50,   check: (s) => s.scans >= 1,    progress: (s) => Math.min(100, (s.scans / 1) * 100),    why: 'Your first scan sets your baseline — the starting point every improvement is measured against.' },
  { id: 'streak3',        label: '3-Day Streak',        desc: 'Scan 3 days in a row',            xp: 100,  check: (s) => s.streak >= 3,   progress: (s) => Math.min(100, (s.streak / 3) * 100),   why: 'Three days is where a habit starts to stick. Consistent care is what moves your shade.' },
  { id: 'scans5',         label: '5 Scans',             desc: 'Complete 5 scans',                xp: 100,  check: (s) => s.scans >= 5,    progress: (s) => Math.min(100, (s.scans / 5) * 100),    why: 'Five scans give teewai enough data to spot real trends instead of daily noise.' },
  { id: 'streak7',        label: '7-Day Streak',        desc: 'Scan every day for a week',        xp: 200,  check: (s) => s.streak >= 7,   progress: (s) => Math.min(100, (s.streak / 7) * 100),   why: 'A full week of scanning wires your smile into your daily rhythm — the hardest part is behind you.' },
  { id: 'rank_pearl',     label: 'Pearl Rank',          desc: 'Reach Pearl rank (100 MMR)',       xp: 150,  check: (s) => s.mmr >= 100,    progress: (s) => Math.min(100, (s.mmr / 100) * 100),    why: 'You have crossed from Stone into Pearl — your first real rank-up. The ladder has begun.' },
  { id: 'scans10',        label: '10 Scans',            desc: 'Complete 10 scans',                xp: 200,  check: (s) => s.scans >= 10,   progress: (s) => Math.min(100, (s.scans / 10) * 100),   why: 'Ten scans in, you know your smile better than most people ever will. That knowledge is leverage.' },
  { id: 'streak14',       label: '14-Day Streak',       desc: 'Scan every day for two weeks',     xp: 300,  check: (s) => s.streak >= 14,  progress: (s) => Math.min(100, (s.streak / 14) * 100),  why: 'Most people quit by day 12. You did not. This is who you are now — someone who finishes.' },
  { id: 'rank_crystal',   label: 'Crystal Rank',       desc: 'Reach Crystal rank (300 MMR)',     xp: 250,  check: (s) => s.mmr >= 300,    progress: (s) => Math.min(100, (s.mmr / 300) * 100),    why: 'Crystal means your consistency is producing measurable results. You are pulling ahead of the pack.' },
  { id: 'improve10',      label: '10-Point Improvement', desc: 'Improve your whiteness by 10 pts', xp: 250,  check: (s) => s.improvement >= 10, progress: (s) => Math.min(100, (s.improvement / 10) * 100), why: 'Ten points of improvement is visible in the mirror. This is real change, not a number on a screen.' },
  { id: 'streak30',       label: '30-Day Streak',       desc: 'Scan every day for a month',       xp: 500,  check: (s) => s.streak >= 30,  progress: (s) => Math.min(100, (s.streak / 30) * 100),  why: 'Thirty days. Your enamel has gone through a full remineralization cycle at this consistency.' },
  { id: 'rank_sapphire',  label: 'Sapphire Rank',      desc: 'Reach Sapphire rank (600 MMR)',    xp: 400,  check: (s) => s.mmr >= 600,    progress: (s) => Math.min(100, (s.mmr / 600) * 100),    why: 'Sapphire is where dedication starts to show. You are in the top 12% of teewai users.' },
  { id: 'scans25',        label: '25 Scans',            desc: 'Complete 25 scans',                xp: 400,  check: (s) => s.scans >= 25,   progress: (s) => Math.min(100, (s.scans / 25) * 100),   why: 'A quarter-century of data points. You have turned your smile into a science — and yourself into the study.' },
  { id: 'rank_emerald',   label: 'Emerald Rank',       desc: 'Reach Emerald rank (1000 MMR)',    xp: 500,  check: (s) => s.mmr >= 1000,   progress: (s) => Math.min(100, (s.mmr / 1000) * 100),   why: 'Emerald puts you in the top 5%. Your smile journey is now a story others look to.' },
  { id: 'streak60',       label: '60-Day Streak',       desc: 'Scan every day for two months',    xp: 800,  check: (s) => s.streak >= 60,  progress: (s) => Math.min(100, (s.streak / 60) * 100),  why: 'Two months unbroken. At this point your routine is not something you do — it is who you are.' },
  { id: 'rank_aurora',    label: 'Aurora Rank',        desc: 'Reach Aurora rank (1500 MMR)',     xp: 700,  check: (s) => s.mmr >= 1500,   progress: (s) => Math.min(100, (s.mmr / 1500) * 100),   why: 'Aurora is the top 2%. You are no longer climbing — you are leading.' },
  { id: 'scans50',        label: '50 Scans',            desc: 'Complete 50 scans',                xp: 600,  check: (s) => s.scans >= 50,   progress: (s) => Math.min(100, (s.scans / 50) * 100),   why: 'Fifty scans. You are the embodiment of what teewai was built for — a person who took charge of their smile.' },
  { id: 'rank_diamond',   label: 'Diamond Rank',       desc: 'Reach Diamond rank (2200 MMR)',    xp: 1000, check: (s) => s.mmr >= 2200,   progress: (s) => Math.min(100, (s.mmr / 2200) * 100),   why: 'Diamond is the top 0.5%. Your journey is an inspiration to everyone on teewai.' },
  { id: 'rank_celestial', label: 'Celestial Rank',     desc: 'Reach Celestial rank (3000 MMR)',  xp: 1500, check: (s) => s.mmr >= 3000,   progress: (s) => Math.min(100, (s.mmr / 3000) * 100),   why: 'Celestial is the summit. There is no higher rank — only the legacy you build from here.' },
];

export const getNextMilestones = (stats, earned = []) => {
  return MILESTONES.filter((m) => !earned.includes(m.id) && !m.check(stats)).slice(0, 4);
};

export const getEarnedMilestones = (stats) => {
  return MILESTONES.filter((m) => m.check(stats));
};

export const getNewlyEarned = (stats, previouslyEarned = []) => {
  return MILESTONES.filter((m) => m.check(stats) && !previouslyEarned.includes(m.id));
};

// === PARASOCIAL COMPANION — teewai AI personality ===
// White Hat transition: as users mature through Experience Phases, messaging
// shifts from Black Hat (loss aversion / fear of losing streak) to White Hat
// (accomplishment / pride / epic meaning). Yu-kai warns that staying in
// Black Hat too long causes burnout and trust erosion.
export const getCompanionMessage = (stats) => {
  const { scans, streak, latest, daysSinceScan } = stats;
  const phase = getExperiencePhase(stats);
  const scanCount = typeof scans === 'number' ? scans : (scans?.length || 0);
  const endgameTitle = getEndgameTitle(stats.mmr);

  // ENDGAME: White Hat — status, mastery, contribution (CD1 + CD5)
  if (phase === 'endgame') {
    if (endgameTitle) {
      if (daysSinceScan > 7) {
        return { mood: 'nostalgic', text: `It's been ${daysSinceScan} days, ${endgameTitle.title}. Your legacy doesn't need daily proof — but your smile misses you 💫` };
      }
      if (streak >= 30) {
        return { mood: 'proud', text: `${streak} days strong. You're not just scanning — you're setting the standard. New members look up to your journey 🌟` };
      }
      return { mood: 'proud', text: `${endgameTitle.title} — ${endgameTitle.desc} Your smile story is an inspiration to everyone on teewai 💫` };
    }
  }

  // SCAFFOLDING: Balanced — accomplishment + gentle nudge (CD2 + CD7)
  if (phase === 'scaffolding') {
    if (daysSinceScan > 5) {
      return { mood: 'concerned', text: `Hey, it's been ${daysSinceScan} days. Your ${streak}-day streak is worth protecting — but more importantly, you're close to your next milestone 💪` };
    }
    if (latest && scanCount >= 2) {
      const prev = scans[1] || (scans?.[1]);
      const diff = (latest.score || 0) - (prev?.score || 0);
      if (diff > 0) {
        return { mood: 'celebrating', text: `You improved by ${Math.round(diff)} points! Look at that trend line — this is what consistency looks like 🎉` };
      }
    }
    if (streak >= 14) {
      return { mood: 'proud', text: `${streak} days! You've built something rare. Most people quit by day 12 — you didn't. That says everything 🌟` };
    }
    if (streak >= 7) {
      return { mood: 'happy', text: `A whole week of scanning! You're building something special. I can feel your smile getting brighter ✨` };
    }
    return { mood: 'encouraging', text: `Day ${streak} of your streak! Every scan brings you closer to your next rank 💪` };
  }

  // ONBOARDING: White Hat — encouragement, early wins (CD1 + CD2)
  if (phase === 'onboarding') {
    if (latest && scanCount >= 2) {
      const prev = scans[1] || (scans?.[1]);
      const diff = (latest.score || 0) - (prev?.score || 0);
      if (diff > 0) {
        return { mood: 'celebrating', text: `Yes! You improved by ${Math.round(diff)} points! I knew you could do it 🎉` };
      }
    }
    return { mood: 'encouraging', text: `Great start! You've taken your first scan — that's the hardest step. Ready for another? Your smile baseline is forming ✨` };
  }

  // DISCOVERY: Welcome + Epic Meaning hook (CD1)
  if (scanCount === 0) {
    return { mood: 'excited', text: "Hi! I'm teewai ✨ I can't wait to see your smile. Your first scan starts a journey — let's begin together!" };
  }

  return { mood: 'friendly', text: "Great to see you! Ready for a scan? Your smile journey continues ✨" };
};

export const MOOD_EMOJI = {
  excited: '🤩', happy: '😊', proud: '🥹', celebrating: '🎉',
  encouraging: '💪', friendly: '✨', concerned: '🤔', sad: '🥺',
  nostalgic: '💫',
};

// === INVISIBLE SCOREBOARD — social comparison ===
export const getPercentile = (mmr) => {
  if (mmr >= 3000) return 99.9;
  if (mmr >= 2200) return 99.5;
  if (mmr >= 1500) return 98;
  if (mmr >= 1000) return 95;
  if (mmr >= 600) return 88;
  if (mmr >= 300) return 75;
  if (mmr >= 100) return 55;
  return 30;
};

// === CD5: SOCIAL INFLUENCE — Rivals ===
// Yu-kai Chou: "Done lazily, social design produces conformity-pressure and
// burnout." Fake social proof (bot rivals pretending to be real users) is the
// #1 mistake in CD5 — users eventually notice and it destroys trust in CD1.
//
// We label these as "ghost rivals" (AI training partners) — honest about what
// they are, while still providing competitive motivation. When real leaderboard
// data is available, use generateRivalsFromReal() instead.
export const generateRivals = (mmr, count = 5) => {
  const names = ['SmileSeeker', 'BrightSmile', 'PearlPursuit', 'CrystalCrown', 'DazzleDan', 'GleamGuru', 'ShineSeeker', 'LuminaLover', 'SparkleSue', 'GlowGetter', 'BeamBoss', 'WhiteWolf'];
  const rivals = [];
  for (let i = 0; i < count; i++) {
    const variance = (Math.random() - 0.5) * 300;
    rivals.push({
      name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 99),
      mmr: Math.max(0, Math.round(mmr + variance)),
      scans: Math.floor(Math.random() * 20) + 3,
      isUser: false,
      isGhost: true, // Honest labeling — these are AI training partners, not real users
    });
  }
  return rivals.sort((a, b) => b.mmr - a.mmr);
};

// Generate rivals from real leaderboard data — preferred over ghost rivals.
// Falls back to ghost rivals if no real data is available.
export const generateRivalsFromReal = (mmr, leaderboard = [], count = 5) => {
  if (!leaderboard || leaderboard.length === 0) return generateRivals(mmr, count);
  // Find users near the player's MMR — closest competitors are most motivating
  const sorted = [...leaderboard]
    .filter((u) => !u.isCurrentUser)
    .sort((a, b) => Math.abs(a.mmr - mmr) - Math.abs(b.mmr - mmr));
  return sorted.slice(0, count).map((u) => ({
    name: u.display_name || u.username || 'Fellow Smiler',
    mmr: u.mmr,
    scans: u.scan_count || 0,
    isUser: false,
    isGhost: false,
  }));
};

// === DAILY QUESTS — seamless goals that feel like natural intentions ===
export const generateDailyQuests = (stats) => {
  const today = new Date().toDateString();
  const scannedToday = stats.latest && new Date(stats.latest.created_date).toDateString() === today;
  const quests = [];

  quests.push({
    id: 'daily_scan',
    label: 'Snap your daily scan',
    desc: 'Keep your streak growing',
    xp: 50,
    done: scannedToday,
  });

  const lastScore = stats.latest?.score || 0;
  const scoreTarget = Math.min(100, lastScore + 5);
  quests.push({
    id: 'score_goal',
    label: lastScore > 0 ? `Reach ${scoreTarget} whiteness` : 'Take your first scan',
    desc: lastScore > 0 ? '5 points above your last scan' : 'Start your smile journey',
    xp: 75,
    done: lastScore > 0 && lastScore >= scoreTarget,
  });

  if (stats.streak >= 3) {
    quests.push({
      id: 'streak_keep',
      label: 'Don\'t break the chain',
      desc: `${stats.streak}-day streak — scan today`,
      xp: 100,
      done: scannedToday,
    });
  } else if (stats.scans >= 2) {
    quests.push({
      id: 'improve',
      label: 'Beat your last score',
      desc: 'Improve from your previous scan',
      xp: 100,
      done: stats.improvement > 0,
    });
  } else {
    quests.push({
      id: 'first_steps',
      label: 'Take 3 scans',
      desc: 'Build your smile baseline',
      xp: 100,
      done: stats.scans >= 3,
    });
  }

  return quests;
};

// === CD6: RETURNING USER BONUS — "Free Lunch" (Game Technique #69) ===
// Yu-kai Chou: "When users come back after being away, give them something for
// free — it removes the guilt of having left and reignites the engagement
// loop." This is a White Hat application of Scarcity & Impatience.
export const getReturningUserBonus = (daysSinceScan, streak) => {
  if (daysSinceScan < 3) return null;
  if (daysSinceScan >= 30) {
    return {
      type: 'welcome_back',
      title: 'Welcome back to your smile journey',
      message: "It's been a while — and that's okay. Your smile data is right where you left it. Here's a fresh streak shield to get you back on track.",
      reward: { type: 'streak_shield', count: 1 },
      xp: 100,
    };
  }
  if (daysSinceScan >= 14) {
    return {
      type: 'welcome_back',
      title: 'Your smile missed you',
      message: `It's been ${daysSinceScan} days. No judgment — just a bonus to restart your momentum. Your previous ${streak}-day streak proves you can do this.`,
      reward: { type: 'bonus_xp', count: 50 },
      xp: 50,
    };
  }
  if (daysSinceScan >= 3) {
    return {
      type: 'welcome_back',
      title: 'Great to see you again',
      message: `A few days away is fine — your smile journey picks up right where it left off. Scan today to keep your streak alive.`,
      reward: { type: 'bonus_xp', count: 25 },
      xp: 25,
    };
  }
  return null;
};

// === STREAK SHIELD — loss aversion power-up ===
export const STREAK_SHIELD_COST = 100; // XP

// === SEASONS — periodic resets that preserve historic status ===
export const SEASON_LENGTH_DAYS = 30;
export const getCurrentSeason = () => {
  const epoch = new Date('2025-01-01').getTime();
  const days = Math.floor((Date.now() - epoch) / (1000 * 60 * 60 * 24));
  return Math.floor(days / SEASON_LENGTH_DAYS) + 1;
};