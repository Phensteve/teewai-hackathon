// Discovery Rewards — exploration across teewai (not just scans) drops
// collectible charms + XP. Every discovery is uncommon-or-better so it
// always feels special. Charms + traits persist into UserProgress so the
// user builds a durable Collection (the /collection page).
//
// Discovery surfaces (CD7 Unpredictability & Curiosity + CD4 Ownership):
//   food_find  — food scan identifies a food teewai had never seen (new DiscoveredFood)
//   stain_log  — user logs a food/drink they had never tracked before
//   bloom      — a care action harvests a ripe Enamel Bloom (low odds)

import { userProgress, stainLogs } from './insforgeDb';
import { SMILE_TRAITS } from './smileTraits';

// Rarity metadata — mirrors TRAIT_RARITIES so charms + traits share one ladder.
export const RARITY_META = {
  common:    { label: 'Common',    color: 'hsl(0 0% 70%)',   icon: '✨' },
  uncommon:  { label: 'Uncommon',  color: 'hsl(160 70% 42%)', icon: '🌿' },
  rare:      { label: 'Rare',      color: 'hsl(220 80% 60%)', icon: '🌟' },
  epic:      { label: 'Epic',      color: 'hsl(280 70% 62%)', icon: '💠' },
  legendary: { label: 'Legendary', color: 'hsl(43 90% 55%)',  icon: '👑' },
};

// XP granted per rarity for discovery drops.
const RARITY_XP = {
  uncommon: 100,
  rare: 150,
  epic: 250,
  legendary: 500,
};

// The full charm catalog — every collectible in teewai. Each has a source
// surface so the Collection page can group by how it was found. Includes the
// Beginner's Luck charms (first-scan drops) and the olo seer lore charm so
// the Collection shows the complete set, locked silhouettes and all.
export const DISCOVERY_CHARMS = [
  // Discovery surfaces
  { id: 'first_discovery', label: 'First Discovery', icon: '🧭', rarity: 'uncommon', source: 'food_find', desc: 'You found a food teewai had never seen before — and added it to the map for everyone.' },
  { id: 'stain_cartographer', label: 'Stain Cartographer', icon: '🗺️', rarity: 'uncommon', source: 'stain_log', desc: 'You logged something you had never tracked. Your stain map grew a new route.' },
  { id: 'bloom_charm', label: 'Bloom Charm', icon: '🌸', rarity: 'rare', source: 'bloom', desc: 'A care action harvested a ripe Enamel Bloom — and this charm bloomed with it.' },
  // Beginner's Luck (first-scan destiny rewards)
  { id: 'destiny_pearl', label: 'Pearl of Destiny', icon: '🦪', rarity: 'rare', source: 'first_scan', desc: 'Your first scan awakened something special. This pearl marks the beginning of your journey.' },
  { id: 'first_light', label: 'First Light', icon: '🌅', rarity: 'rare', source: 'first_scan', desc: 'The first smile you shared with teewai. A new dawn for your teeth.' },
  { id: 'chosen_one', label: 'The Chosen Charm', icon: '🌟', rarity: 'epic', source: 'first_scan', desc: 'Some say this charm only appears for those destined for great smiles. You found it on day one.' },
  { id: 'genesis_gem', label: 'Genesis Gem', icon: '💎', rarity: 'legendary', source: 'first_scan', desc: 'An extraordinarily rare drop. Legends say it appears only once per smile journey — and only at the very start.' },
  // olo seer — the rare-color sight charm (static lore, always "owned")
  { id: 'olo_seer', label: 'olo seer', icon: '🔵', rarity: 'epic', source: 'olo_seer', desc: 'Your eyes can see olo — a saturated teal most screens cannot reproduce. A charm for the rare few.' },
];

// Roll a discovery reward for a given surface. No common drops — every
// discovery is uncommon-or-better. The bloom surface returns null ~92% of
// the time so it stays a pleasant surprise, not an expectation.
export function rollDiscoveryReward(surface) {
  if (surface === 'bloom') {
    if (Math.random() >= 0.08) return null;
  }
  const weights = { uncommon: 55, rare: 28, epic: 14, legendary: 3 };
  const total = Object.values(weights).reduce((a, w) => a + w, 0);
  let roll = Math.random() * total;
  let rarityKey = 'uncommon';
  for (const [k, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) { rarityKey = k; break; }
  }
  // Pick a charm for this surface at the rolled rarity; fall back to any
  // charm at that rarity so the roll never whiffs on an empty pool.
  let charm = DISCOVERY_CHARMS.find((c) => c.source === surface && c.rarity === rarityKey);
  if (!charm) charm = DISCOVERY_CHARMS.find((c) => c.rarity === rarityKey) || DISCOVERY_CHARMS[0];
  const meta = RARITY_META[rarityKey];
  return {
    key: rarityKey,
    rarity: rarityKey,
    label: charm.label,
    icon: charm.icon,
    color: meta.color,
    xp: RARITY_XP[rarityKey] || 100,
    charmId: charm.id,
    source: surface,
  };
}

// Best-effort fetch of the current user's UserProgress record.
async function getProgress() {
  try {
    const list = await userProgress.filter({});
    return (list && list[0]) || null;
  } catch {
    return null;
  }
}

// Persist a discovery: push the charm to charms_collected if new, and add
// its XP to discovery_xp / total_xp / season_xp. Returns the updated record
// or null. Fire-and-forget from the UI — never blocks the user flow.
export async function recordDiscovery({ charmId, xp }) {
  if (!charmId) return null;
  const prog = await getProgress();
  if (!prog) return null;
  const charms = Array.isArray(prog.charms_collected) ? [...prog.charms_collected] : [];
  if (!charms.includes(charmId)) charms.push(charmId);
  const gain = xp || 0;
  try {
    return await userProgress.update(prog.id, {
      charms_collected: charms,
      discovery_xp: (prog.discovery_xp || 0) + gain,
      total_xp: (prog.total_xp || 0) + gain,
      season_xp: (prog.season_xp || 0) + gain,
    });
  } catch {
    return null;
  }
}

// Persist a Smile Trait from a scan into traits_collected (upsert: new entry
// on first find with first_found_date, increment count on repeats). Called
// from the scan flow so every trait roll is durably collected.
export async function recordTraitFromScan(trait) {
  if (!trait?.id) return null;
  const prog = await getProgress();
  if (!prog) return null;
  const collected = Array.isArray(prog.traits_collected) ? [...prog.traits_collected] : [];
  const idx = collected.findIndex((t) => t.id === trait.id);
  if (idx >= 0) {
    collected[idx] = { ...collected[idx], count: (collected[idx].count || 1) + 1 };
  } else {
    collected.push({ id: trait.id, first_found_date: new Date().toISOString(), count: 1 });
  }
  try {
    return await userProgress.update(prog.id, { traits_collected: collected });
  } catch {
    return null;
  }
}

// First-log detection for the stain tracker: returns true if the user has
// never logged this item name before. Call BEFORE creating the log entry.
export async function isFirstStainLog(itemName) {
  if (!itemName) return false;
  try {
    const logs = await stainLogs.list('-created_date', 200);
    const name = String(itemName).toLowerCase().trim();
    return !logs.some((l) => String(l.item_name || '').toLowerCase().trim() === name);
  } catch {
    return false;
  }
}

// Resolve the discovery surface for a food-scan result. A new DiscoveredFood
// (food_find) takes priority over a first-time log (stain_log). Returns the
// surface string or null if nothing novel happened. Pure-ish: the first-log
// check is async.
export async function resolveFoodScanDiscovery(items) {
  if (!items?.length) return null;
  if (items.some((it) => it.isNewDiscovery)) return 'food_find';
  const firsts = await Promise.all(items.map((it) => isFirstStainLog(it.item?.name)));
  if (firsts.some(Boolean)) return 'stain_log';
  return null;
}

// === Collection stats — counts + per-rarity completion %, for the page + summary ===
export function collectionStats(progress) {
  const charms = Array.isArray(progress?.charms_collected) ? progress.charms_collected : [];
  const traits = Array.isArray(progress?.traits_collected) ? progress.traits_collected : [];
  const milestones = Array.isArray(progress?.milestones_earned) ? progress.milestones_earned : [];
  const discoveryXp = progress?.discovery_xp || 0;

  const completionByRarity = (haveIds, pool) => {
    const out = {};
    for (const r of Object.keys(RARITY_META)) {
      const total = pool.filter((c) => c.rarity === r).length;
      const have = haveIds.filter((id) => {
        const item = pool.find((c) => c.id === id);
        return item && item.rarity === r;
      }).length;
      out[r] = { have, total, pct: total ? Math.round((have / total) * 100) : 0 };
    }
    return out;
  };

  const traitIds = traits.map((t) => t.id);
  const charmIds = charms;

  return {
    charms: {
      count: charms.length,
      total: DISCOVERY_CHARMS.length,
      byRarity: completionByRarity(charmIds, DISCOVERY_CHARMS),
      ids: charmIds,
    },
    traits: {
      count: traitIds.length,
      total: SMILE_TRAITS.length,
      byRarity: completionByRarity(traitIds, SMILE_TRAITS),
      collected: traits,
    },
    milestones: milestones.length,
    discoveryXp,
    recentCharms: charms.slice(-3).reverse(),
  };
}