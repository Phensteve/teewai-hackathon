// Tracks which daily tips have been shown to the user, stored per-device in
// localStorage. Each day the dashboard records the health + advice tips it
// displayed; the TipHistory page reads this list back.

const KEY = 'teewai_tip_history';

export function recordShownTip(tip, category) {
  if (!tip?.id) return;
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    const dateKey = new Date().toISOString().slice(0, 10);
    // One entry per tip per day — avoids duplicates on re-renders / refreshes.
    if (all.some((e) => e.tipId === tip.id && e.date === dateKey)) return;
    all.unshift({
      tipId: tip.id,
      title: tip.title,
      body: tip.body,
      category,
      date: dateKey,
    });
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 365)));
  } catch {
    /* storage unavailable — silently skip */
  }
}

export function getTipHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}