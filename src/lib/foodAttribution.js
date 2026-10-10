// Food Attribution Insight — attributes a shade shift between two teeth scans
// to food(s) the user logged in between. Read-only presentation layer over
// existing scan data. Never feeds baseline, What-changed, or purple logic.

import { computePerToothDeltas, shadeDeltaSteps, isFlagged } from './baseline';

// Attempt to attribute a shade shift to food(s) logged between two scans.
// Returns an attribution object, or null if no credible attribution exists.
export function attributeFoodShift(currentScan, previousScan, stainLogs, simActions = []) {
  // Guards
  if (!currentScan || !previousScan) return null;
  if (currentScan.id === previousScan.id) return null;
  if (isFlagged(currentScan) || isFlagged(previousScan)) return null;

  // Must have a shade shift (only attribute darkening — negative steps)
  const steps = shadeDeltaSteps(currentScan.shade_code, previousScan.shade_code);
  if (steps == null || steps >= 0) return null;

  // Time window between the two scans
  const prevTime = new Date(previousScan.created_date).getTime();
  const currTime = new Date(currentScan.created_date).getTime();
  if (!prevTime || !currTime || prevTime >= currTime) return null;

  // Food logs between the two scans (use created_date for precise timing,
  // since log_date is a date-only field without time)
  const foodsBetween = (stainLogs || []).filter((log) => {
    const logTime = new Date(log.created_date).getTime();
    return logTime > prevTime && logTime <= currTime;
  });
  if (foodsBetween.length === 0) return null;

  // Per-tooth deltas — which teeth darkened
  const toothDeltas = computePerToothDeltas(currentScan, previousScan);
  const darkened = toothDeltas.filter((t) => t.status === 'darkened');
  if (darkened.length === 0) return null;

  // Account for brushing / water rinse in between
  const brushed = (simActions || []).some(
    (a) => a.type === 'brush' && a.timestamp > prevTime && a.timestamp <= currTime
  );
  const waterRinses = (simActions || []).filter(
    (a) => a.type === 'water' && a.timestamp > prevTime && a.timestamp <= currTime
  ).length;

  // Rank foods by staining potential
  const rankedFoods = foodsBetween
    .map((log) => ({
      ...log,
      stainPower:
        (log.stain_level || 0) +
        (log.chromogenic || 0) * 0.4 +
        (log.tannin || 0) * 0.3,
    }))
    .sort((a, b) => b.stainPower - a.stainPower);

  const dominantFood = rankedFoods[0];
  const secondaryFood = rankedFoods[1] || null;

  const shiftMagnitude = Math.abs(steps);
  const foodStainPower = dominantFood.stainPower;

  // Confidence gate: the dominant food must be strong enough to plausibly
  // explain the observed shift. Brushing raises the bar.
  const minPower = brushed ? 55 : 35;
  if (foodStainPower < minPower) return null;

  // A big shift needs a strong food
  if (shiftMagnitude >= 2 && foodStainPower < 50) return null;

  // If water rinse happened and the shift is small and the food is weak,
  // the net effect is unclear — stay silent
  if (waterRinses > 0 && shiftMagnitude <= 1 && foodStainPower < 45) return null;

  // Acknowledge secondary food only if it's meaningfully strong
  const acknowledgeSecondary =
    secondaryFood &&
    secondaryFood.stainPower > 40 &&
    secondaryFood.stainPower / dominantFood.stainPower > 0.5;

  // Teeth description
  const teethDesc = describeTeeth(darkened);
  const teethCount = darkened.length;

  // Shade labels
  const shadeFrom = previousScan.shade_code || previousScan.shade || null;
  const shadeTo = currentScan.shade_code || currentScan.shade || null;
  if (!shadeFrom || !shadeTo) return null;

  // Time context
  const timePhrase = buildTimePhrase(
    previousScan.created_date,
    dominantFood.created_date
  );

  return {
    dominantFood,
    secondaryFood: acknowledgeSecondary ? secondaryFood : null,
    teethDesc,
    teethCount,
    shadeFrom,
    shadeTo,
    shiftMagnitude,
    timePhrase,
    brushed,
    waterRinse: waterRinses > 0,
    foodImage: dominantFood.image_url || null,
    foodName: dominantFood.item_name || dominantFood.name || 'that food',
    secondaryName: acknowledgeSecondary
      ? secondaryFood.item_name || secondaryFood.name || ''
      : null,
    foodDate: dominantFood.created_date,
  };
}

// Group darkened teeth by type and describe naturally.
function describeTeeth(darkened) {
  if (!darkened.length) return '';
  const byType = {};
  darkened.forEach((t) => {
    byType[t.tooth_type] = (byType[t.tooth_type] || 0) + 1;
  });
  // Priority: incisors (smile zone) > canines > premolars > molars
  if (byType.incisor) return toothLabel('incisor', byType.incisor);
  if (byType.canine) return toothLabel('canine', byType.canine);
  if (byType.premolar) return toothLabel('premolar', byType.premolar);
  if (byType.molar) return toothLabel('molar', byType.molar);
  return 'your teeth';
}

function toothLabel(type, count) {
  const labels = {
    incisor: { one: 'one of your front teeth', two: 'your two front teeth', many: 'your front teeth' },
    canine: { one: 'your canine', two: 'your canines', many: 'your canines' },
    premolar: { one: 'your premolar', two: 'your premolars', many: 'your premolars' },
    molar: { one: 'your molar', two: 'your molars', many: 'your molars' },
  };
  const l = labels[type] || { one: 'a tooth', two: 'two teeth', many: 'your teeth' };
  if (count === 1) return l.one;
  if (count === 2) return l.two;
  return l.many;
}

// Build a time phrase for the food event.
function buildTimePhrase(prevScanDate, foodDate) {
  if (!foodDate) return 'since your last scan';
  const prev = new Date(prevScanDate);
  const food = new Date(foodDate);
  const now = new Date();

  // Same day as the previous scan
  if (food.toDateString() === prev.toDateString()) return 'since your last scan';

  // Within the last week — use day name
  const daysAgo = Math.floor((now - food) / 86400000);
  if (daysAgo <= 7) {
    const dayName = food.toLocaleDateString(undefined, { weekday: 'long' });
    return `on ${dayName}`;
  }

  // Older — use date
  return `on ${food.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

// Generate a dynamic, natural attribution line. Never a single hardcoded
// sentence — selects from 8+ phrasings based on context, with deterministic
// variety so a repeat user doesn't see the same line every time.
export function generateAttributionLine(attr) {
  if (!attr) return null;
  const {
    foodName,
    secondaryName,
    teethDesc,
    teethCount,
    shadeFrom,
    shadeTo,
    shiftMagnitude,
    timePhrase,
    brushed,
    waterRinse,
  } = attr;

  const isSingleTooth = teethCount === 1;
  const isNudge = shiftMagnitude === 1;
  const hasSecondary = !!secondaryName;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Build context-appropriate candidates
  const candidates = [];

  // --- Base phrasings by tooth count + magnitude ---
  if (isSingleTooth && isNudge) {
    candidates.push(`That ${foodName} nudged ${teethDesc} a shade, from ${shadeFrom} to ${shadeTo}.`);
    candidates.push(`The ${foodName} you logged ${timePhrase} left a faint mark on ${teethDesc}, ${shadeFrom} to ${shadeTo}.`);
  } else if (isSingleTooth && !isNudge) {
    candidates.push(`That ${foodName} left a mark. ${cap(teethDesc)} went from ${shadeFrom} to ${shadeTo}.`);
    candidates.push(`${cap(teethDesc)} went from ${shadeFrom} to ${shadeTo}. That ${foodName} ${timePhrase} is probably why.`);
  } else if (!isSingleTooth && isNudge) {
    candidates.push(`The ${foodName} you scanned ${timePhrase} nudged ${teethDesc} a shade, ${shadeFrom} to ${shadeTo}.`);
    candidates.push(`That ${foodName} shifted ${teethDesc} from ${shadeFrom} to ${shadeTo} since your last scan.`);
  } else {
    candidates.push(`Your scan caught what that ${foodName} started. ${cap(teethDesc)}, ${shadeFrom} to ${shadeTo} since your last scan.`);
    candidates.push(`That ${foodName} took a toll on ${teethDesc}, ${shadeFrom} to ${shadeTo}.`);
  }

  // --- With secondary food ---
  if (hasSecondary) {
    candidates.push(`That ${foodName} moved ${teethDesc} from ${shadeFrom} to ${shadeTo}, and the ${secondaryName} pitched in.`);
    candidates.push(`${cap(teethDesc)} went from ${shadeFrom} to ${shadeTo}. The ${foodName} ${timePhrase} did most of it, with a little help from the ${secondaryName}.`);
  }

  // --- With brushing in between ---
  if (brushed) {
    candidates.push(`Even with brushing in between, that ${foodName} still shifted ${teethDesc} from ${shadeFrom} to ${shadeTo}.`);
    candidates.push(`You brushed after that ${foodName}, but it still left its mark. ${cap(teethDesc)}, ${shadeFrom} to ${shadeTo}.`);
  }

  // --- With water rinse (no brushing) ---
  if (waterRinse && !brushed) {
    candidates.push(`The water you had helped, but that ${foodName} still moved ${teethDesc} from ${shadeFrom} to ${shadeTo}.`);
  }

  // --- Time-context variants (when we have a specific day) ---
  if (timePhrase && timePhrase !== 'since your last scan') {
    candidates.push(`That ${foodName} ${timePhrase} caught up with ${teethDesc}. ${shadeFrom} to ${shadeTo}.`);
    candidates.push(`Since your last scan, that ${foodName} shifted ${teethDesc} from ${shadeFrom} to ${shadeTo}.`);
  }

  // Deterministic selection: same scan + food always shows the same line,
  // but different scans vary. Hash from scan IDs + food name + shades.
  const seed = [
    attr.dominantFood?.id || '',
    foodName,
    shadeFrom,
    shadeTo,
    String(teethCount),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return candidates[Math.abs(hash) % candidates.length];
}