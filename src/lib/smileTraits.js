// Secret Smile Traits — rare, surprise unlockables discovered per scan.
// Variable-ratio reveal keeps users chasing the next rare drop (Skinner / gacha psychology).
// Streak and scan count slightly boost rare odds (rewarding retention without guaranteeing it).

export const TRAIT_RARITIES = {
  common:    { weight: 45, label: 'Common',    color: 'hsl(0 0% 70%)',   icon: '✨' },
  uncommon:  { weight: 28, label: 'Uncommon',  color: 'hsl(160 70% 42%)', icon: '🌿' },
  rare:      { weight: 17, label: 'Rare',      color: 'hsl(220 80% 60%)', icon: '🌟' },
  epic:      { weight: 8,  label: 'Epic',      color: 'hsl(280 70% 62%)', icon: '💠' },
  legendary: { weight: 2,  label: 'Legendary', color: 'hsl(43 90% 55%)',  icon: '👑' },
};

export const SMILE_TRAITS = [
  // Common
  { id: 'clean_line',     label: 'Clean Smile Line',      rarity: 'common',    desc: 'Your front teeth form a tidy, even line.' },
  { id: 'healthy_gum',     label: 'Healthy Gums',          rarity: 'common',    desc: 'Gum tissue looks well cared for.' },
  { id: 'natural_sym',     label: 'Natural Symmetry',      rarity: 'common',    desc: 'A balanced, approachable smile.' },
  // Uncommon
  { id: 'cool_tone',       label: 'Cool Undertone',        rarity: 'uncommon',  desc: 'A clean, cool tooth undertone — reads brighter.' },
  { id: 'even_gumline',    label: 'Even Gum Line',         rarity: 'uncommon',  desc: 'Gums frame your teeth with rare precision.' },
  { id: 'canine_sharp',    label: 'Sharp Canine Definition', rarity: 'uncommon', desc: 'Well-defined canines give your smile character.' },
  { id: 'broad_smile',     label: 'Broad Smile Zone',      rarity: 'uncommon',  desc: 'A wide smile zone — lots to brighten.' },
  // Rare
  { id: 'symmetry_top5',   label: 'Symmetry: Top 5%',      rarity: 'rare',      desc: 'Near-mirror symmetry across your smile zone.' },
  { id: 'enamel_radiance', label: 'Enamel Radiance Spike', rarity: 'rare',      desc: 'A region of unusually luminous enamel detected.' },
  { id: 'golden_ratio',    label: 'Golden-Ratio Smile',    rarity: 'rare',      desc: 'Tooth proportions approach the golden ratio.' },
  // Epic
  { id: 'pristine_zone',   label: 'Pristine Zone Found',   rarity: 'epic',      desc: 'A tooth segment at the very top of the scale.' },
  { id: 'rapid_response',  label: 'Rapid Response Potential', rarity: 'epic',   desc: 'Your enamel signals fast whitening response.' },
  // Legendary
  { id: 'frozen_perfection', label: 'Frozen Perfection',  rarity: 'legendary', desc: 'A scan so balanced teewai calls it perfect. One in thousands.' },
];

// Weighted roll. Streak & scan count nudge rare odds upward (loss-aversion friendly).
export const rollTrait = (streak = 0, scanCount = 0) => {
  const luckBoost = Math.min(0.5, streak * 0.01 + scanCount * 0.005);
  const total = Object.values(TRAIT_RARITIES).reduce((a, r) => a + r.weight, 0);
  let roll = Math.random() * total;
  let rarityKey = 'common';
  for (const [key, rarity] of Object.entries(TRAIT_RARITIES)) {
    roll -= rarity.weight;
    if (roll <= 0) { rarityKey = key; break; }
  }
  // Apply luck boost: small chance to bump up one tier.
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  if (Math.random() < luckBoost) {
    const idx = order.indexOf(rarityKey);
    if (idx < order.length - 1) rarityKey = order[idx + 1];
  }
  const pool = SMILE_TRAITS.filter((t) => t.rarity === rarityKey);
  const trait = pool[Math.floor(Math.random() * pool.length)] || SMILE_TRAITS[0];
  return {
    ...trait,
    rarityLabel: TRAIT_RARITIES[trait.rarity].label,
    rarityColor: TRAIT_RARITIES[trait.rarity].color,
    rarityIcon: TRAIT_RARITIES[trait.rarity].icon,
  };
};