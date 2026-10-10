import { scans as insforgeScans, stainLogs, appointments } from '@/lib/insforgeDb';
import { userProfile } from '@/lib/insforgeDb';

const dayStr = (d) => d.toISOString().slice(0, 10);
const monthStr = (d) => d.toISOString().slice(0, 7);

// Local-time versions for brief reset keys so the daily brief resets at local
// midnight (not UTC midnight), which matches "every morning" for the user.
const localDayStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localMonthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const localYearStr = (d) => String(d.getFullYear());

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) { const x = startOfDay(d); const day = x.getDay(); x.setDate(x.getDate() - day); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }

function getPrevWeekStart() {
  const ws = startOfWeek(new Date());
  ws.setDate(ws.getDate() - 7);
  return ws;
}

// True when `now` is the final calendar day of its month (e.g. Aug 31, Sep 30).
function isLastDayOfMonth(now) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
}

// A period is "ready" (can alert / list) after 4pm on its final day. Before
// that moment the period has not ended, so its brief is not generated.
// Cutoff = the start of the earliest period that is NOT yet ready. Any period
// whose start is before this cutoff is complete and can be listed.
function getWeeklyCutoff(now) {
  const sow = startOfWeek(now);
  // Saturday after 4pm, or Sunday: the current week (ending) is ready.
  if ((now.getDay() === 6 && now.getHours() >= BRIEF_HOUR) || now.getDay() === 0) {
    return new Date(sow.getTime() + 7 * 86400000); // next week start
  }
  return sow; // current week not ready yet
}
function getMonthlyCutoff(now) {
  if (isLastDayOfMonth(now) && now.getHours() >= BRIEF_HOUR) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1); // next month start
  }
  return startOfMonth(now);
}
function getYearlyCutoff(now) {
  if (now.getMonth() === 11 && now.getDate() === 31 && now.getHours() >= BRIEF_HOUR) {
    return new Date(now.getFullYear() + 1, 0, 1); // next year start
  }
  return startOfYear(now);
}

// ── Period title helpers ──────────────────────────────────────────────────
export function getDailyTitle(date = new Date()) {
  return `Your brief for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`;
}

export function getWeeklyTitle(weekStart) {
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const s = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const e = weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Your week of ${s} to ${e}`;
}

export function getMonthlyTitle(year, month) {
  const name = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' });
  return new Date().getFullYear() !== year ? `Your ${name} ${year} brief` : `Your ${name} brief`;
}

export function getYearlyTitle(year) { return `Your ${year} brief`; }

export function getCurrentDailyTitle() { return getDailyTitle(new Date()); }
export function getCurrentWeeklyTitle() { return getWeeklyTitle(getPrevWeekStart()); }
export function getCurrentMonthlyTitle() {
  const m = new Date(); m.setMonth(m.getMonth() - 1);
  return getMonthlyTitle(m.getFullYear(), m.getMonth());
}
export function getCurrentYearlyTitle() { return getYearlyTitle(new Date().getFullYear() - 1); }

export async function fetchBriefData() {
  const [scanList, logList, apptList] = await Promise.all([
    insforgeScans.list('-created_date', 200).catch(() => []),
    stainLogs.list('-created_date', 500).catch(() => []),
    appointments.list('-created_date', 50).catch(() => []),
  ]);
  return { scans: scanList, logs: logList, appointments: apptList };
}

function getBrushLogs(logs, sinceMs) {
  return logs.filter(l => {
    if (l.category !== 'protective' || l.item_name !== 'Brushed teeth') return false;
    if (!sinceMs) return true;
    return new Date(l.created_date).getTime() >= sinceMs;
  });
}

function getStainLogs(logs, sinceMs) {
  return logs.filter(l => {
    if ((l.stain_level || 0) <= 0) return false;
    if (!sinceMs) return true;
    return new Date(l.created_date).getTime() >= sinceMs;
  });
}

function getMissedAppts(appts, sinceMs) {
  return (appts || []).filter(a => {
    if (a.status !== 'cancelled') return false;
    if (!sinceMs) return true;
    return new Date(a.requested_date || a.created_date).getTime() >= sinceMs;
  });
}

// Filter helpers for closed ranges (used by monthly/yearly briefs which cover
// a complete, finished period — both a start and end boundary).
function getStainLogsRange(logs, startMs, endMs) {
  return logs.filter(l => {
    if ((l.stain_level || 0) <= 0) return false;
    const t = new Date(l.created_date).getTime();
    return t >= startMs && t < endMs;
  });
}

function getMissedApptsRange(appts, startMs, endMs) {
  return (appts || []).filter(a => {
    if (a.status !== 'cancelled') return false;
    const t = new Date(a.requested_date || a.created_date).getTime();
    return t >= startMs && t < endMs;
  });
}

// ── Daily brief (popup — uses the latest scan overall) ──────────────────────
export function buildDailyBrief(data, referenceDate) {
  const { scans, logs } = data;
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = dayStr(yesterday);
  const todayStr = dayStr(now);

  const lines = [];

  const latest = scans[0];
  if (latest) {
    lines.push({
      type: 'score',
      text: `Your latest scan scored ${latest.score ?? '—'} (${latest.shade || 'measured'}).`,
    });
  }

  const yesterdayLogs = logs.filter(l => l.log_date === yesterdayStr && (l.stain_level || 0) > 0);
  if (yesterdayLogs.length > 0) {
    const top = yesterdayLogs.sort((a, b) => (b.stain_level || 0) - (a.stain_level || 0))[0];
    lines.push({
      type: 'food',
      text: `${top.item_name} hit your teeth hardest yesterday.`,
      image_url: top.image_url,
      foodName: top.item_name,
    });
  }

  const brushedToday = logs.some(l =>
    l.category === 'protective' &&
    l.item_name === 'Brushed teeth' &&
    l.log_date === todayStr
  );
  if (!brushedToday) {
    lines.push({
      type: 'brush_reminder',
      text: "You didn't log a brush for today. Your teeth will thank you.",
    });
  }

  if (latest?.color_correcting_product_detected) {
    lines.push({
      type: 'flagged',
      text: 'We detected a purple strip on your last scan. Your shade readings may be distorted.',
    });
  }

  return { lines, hasData: lines.length > 0 };
}

// ── Daily brief for a specific date (for past briefs list) ──────────────────
export function buildDailyBriefForDate(data, date) {
  const { scans, logs } = data;
  const dayKey = dayStr(date);
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDayKey = dayStr(prevDay);

  const lines = [];

  const dayScans = scans.filter(s => dayStr(new Date(s.created_date)) === dayKey);
  const latest = dayScans[0];
  if (latest) {
    lines.push({
      type: 'score',
      text: `Your scan scored ${latest.score ?? '—'} (${latest.shade || 'measured'}).`,
    });
  }

  const prevDayLogs = logs.filter(l => l.log_date === prevDayKey && (l.stain_level || 0) > 0);
  if (prevDayLogs.length > 0) {
    const top = prevDayLogs.sort((a, b) => (b.stain_level || 0) - (a.stain_level || 0))[0];
    lines.push({
      type: 'food',
      text: `${top.item_name} hit your teeth hardest the day before.`,
      image_url: top.image_url,
      foodName: top.item_name,
    });
  }

  const brushed = logs.some(l =>
    l.category === 'protective' &&
    l.item_name === 'Brushed teeth' &&
    l.log_date === dayKey
  );
  lines.push({
    type: brushed ? 'brush_done' : 'brush_missed',
    text: brushed ? 'You brushed your teeth that day.' : "You didn't log a brush that day.",
  });

  if (latest?.color_correcting_product_detected) {
    lines.push({
      type: 'flagged',
      text: 'A purple strip was detected on this scan. Shade readings may be distorted.',
    });
  }

  return { lines, hasData: lines.length > 0, date: dayKey };
}

// ── Daily brief history (all days with scans, most recent first) ────────────
export function getDailyBriefHistory(data) {
  const { scans } = data;
  const daySet = new Set();
  scans.forEach(s => { daySet.add(dayStr(new Date(s.created_date))); });
  const sortedDays = [...daySet].sort().reverse();
  return sortedDays.map(dayKey => {
    const date = new Date(dayKey + 'T12:00:00');
    return { date, dayKey, brief: buildDailyBriefForDate(data, date) };
  });
}

// ── Weekly brief for a specific completed week ──────────────────────────────
export function buildWeeklyBriefForWeek(data, weekStart) {
  const { scans, logs, appointments } = data;
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekStartMs + 7 * 86400000;
  const weekLabel = getWeeklyTitle(weekStart).replace('Your week of ', '');

  const sections = [];

  const weekScans = scans.filter(s => {
    const t = new Date(s.created_date).getTime();
    return t >= weekStartMs && t < weekEndMs;
  });
  if (weekScans.length >= 2) {
    const first = weekScans[weekScans.length - 1];
    const last = weekScans[0];
    const delta = (last.score || 0) - (first.score || 0);
    sections.push({
      type: 'trend',
      text: `Your whiteness went from ${first.score ?? '—'} to ${last.score ?? '—'} in the week of ${weekLabel}.`,
      delta,
      scan_image_url: last.image_url,
    });
  } else if (weekScans.length === 1) {
    sections.push({
      type: 'trend',
      text: `You scanned once in the week of ${weekLabel}, scoring ${weekScans[0].score ?? '—'}.`,
    });
  }

  const weekStainLogs = getStainLogsRange(logs, weekStartMs, weekEndMs);
  if (weekStainLogs.length > 0) {
    const grouped = {};
    weekStainLogs.forEach(l => {
      const name = l.item_name;
      if (!grouped[name]) grouped[name] = { name, total: 0, count: 0, image_url: l.image_url };
      grouped[name].total += l.stain_level || 0;
      grouped[name].count += 1;
    });
    const top = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 3);
    sections.push({
      type: 'top_foods',
      text: `Your top stain sources in the week of ${weekLabel}: ${top.map(f => f.name).join(', ')}.`,
      foods: top,
    });
  }

  const weekBrushes = logs.filter(l => {
    if (l.category !== 'protective' || l.item_name !== 'Brushed teeth') return false;
    const t = new Date(l.created_date).getTime();
    return t >= weekStartMs && t < weekEndMs;
  });
  const brushDays = new Set(weekBrushes.map(b => b.log_date || dayStr(new Date(b.created_date))));
  sections.push({
    type: 'brushing',
    text: `You brushed ${brushDays.size} of 7 days in the week of ${weekLabel}.`,
    count: brushDays.size,
    expected: 7,
  });

  const missedAppts = getMissedApptsRange(appointments, weekStartMs, weekEndMs);
  if (missedAppts.length > 0) {
    sections.push({
      type: 'appointments',
      text: `You missed ${missedAppts.length} appointment${missedAppts.length === 1 ? '' : 's'} in the week of ${weekLabel}.`,
    });
  }

  const brushEvents = weekBrushes;
  const stainEvents = weekStainLogs;
  let callback = null;
  for (const brush of brushEvents) {
    const brushTime = new Date(brush.created_date).getTime();
    const afterBrush = stainEvents.find(s => {
      const sTime = new Date(s.created_date).getTime();
      return sTime > brushTime && sTime - brushTime < 120 * 60 * 1000;
    });
    if (afterBrush) {
      callback = {
        text: `Remember that ${afterBrush.item_name} shortly after brushing? Your shade dipped from that one.`,
        foodName: afterBrush.item_name,
        image_url: afterBrush.image_url || null,
      };
      break;
    }
  }
  if (callback) sections.push({ type: 'callback', ...callback });

  if (weekScans.length > 0) {
    const whitest = weekScans.reduce((best, s) => (s.score > (best?.score || 0) ? s : best), null);
    if (whitest) {
      sections.push({
        type: 'whitest_day',
        text: `Your whitest day in the week of ${weekLabel}: ${whitest.shade || 'measured'} at ${whitest.score} points.`,
        score: whitest.score,
        shade: whitest.shade,
        scan_image_url: whitest.image_url,
      });
    }
  }
  if (weekStainLogs.length > 0) {
    const highest = weekStainLogs.reduce((max, l) => ((l.stain_level || 0) > (max?.stain_level || 0) ? l : max), null);
    if (highest) {
      sections.push({
        type: 'highest_stain',
        text: `Your biggest stain hit: ${highest.item_name} at ${highest.stain_level} stain.`,
        foodName: highest.item_name,
        stain_level: highest.stain_level,
        image_url: highest.image_url,
      });
    }
  }

  return { sections, hasData: sections.length > 0, weekStart, weekLabel };
}

// Weekly brief — defaults to the previous completed week (for the popup)
export function buildWeeklyBrief(data) {
  return buildWeeklyBriefForWeek(data, getActiveWeekStart(new Date()));
}

// ── Monthly brief for a specific period (year + 0-indexed month) ─────────────
export function buildMonthlyBriefForPeriod(data, year, month) {
  const { scans, logs, appointments } = data;
  const monthStartMs = new Date(year, month, 1).getTime();
  const monthEndMs = new Date(year, month + 1, 1).getTime();
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' });

  const sections = [];

  const monthScans = scans.filter(s => {
    const t = new Date(s.created_date).getTime();
    return t >= monthStartMs && t < monthEndMs;
  });
  if (monthScans.length >= 2) {
    const first = monthScans[monthScans.length - 1];
    const last = monthScans[0];
    const delta = (last.score || 0) - (first.score || 0);
    sections.push({
      type: 'shade_change',
      text: `Your shade moved from ${first.shade || '—'} to ${last.shade || '—'}.`,
      delta,
      scan_image_url: last.image_url,
    });
  }

  sections.push({
    type: 'total_scans',
    text: `You took ${monthScans.length} scan${monthScans.length === 1 ? '' : 's'} in ${monthName}.`,
    count: monthScans.length,
  });

  const monthStainLogs = getStainLogsRange(logs, monthStartMs, monthEndMs);
  if (monthStainLogs.length > 0) {
    const grouped = {};
    monthStainLogs.forEach(l => {
      const name = l.item_name;
      if (!grouped[name]) grouped[name] = { name, total: 0, count: 0, image_url: l.image_url };
      grouped[name].total += l.stain_level || 0;
      grouped[name].count += 1;
    });
    const ranked = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 5);
    sections.push({
      type: 'rankings',
      text: `Foods that stained your teeth the most in ${monthName}:`,
      foods: ranked,
    });
  }

  const lastMonthLatest = monthScans[0];
  if (lastMonthLatest?.whitening_potential_score && lastMonthLatest.score) {
    const progress = Math.round((lastMonthLatest.score / lastMonthLatest.whitening_potential_score) * 100);
    sections.push({
      type: 'progress',
      text: `You were ${progress}% of the way to your target shade ${lastMonthLatest.whitening_potential_shade || 'goal'} by the end of ${monthName}.`,
      scan_image_url: lastMonthLatest.image_url,
    });
  }

  const missedAppts = getMissedApptsRange(appointments, monthStartMs, monthEndMs);
  if (missedAppts.length > 0) {
    sections.push({
      type: 'appointments',
      text: `You missed ${missedAppts.length} appointment${missedAppts.length === 1 ? '' : 's'} in ${monthName}.`,
    });
  }

  if (monthScans.length > 0) {
    const whitest = monthScans.reduce((best, s) => (s.score > (best?.score || 0) ? s : best), null);
    if (whitest) {
      sections.push({
        type: 'whitest_day',
        text: `Your whitest day: ${whitest.shade || 'measured'} at ${whitest.score} points.`,
        score: whitest.score,
        shade: whitest.shade,
        scan_image_url: whitest.image_url,
      });
    }
  }
  if (monthStainLogs.length > 0) {
    const highest = monthStainLogs.reduce((max, l) => ((l.stain_level || 0) > (max?.stain_level || 0) ? l : max), null);
    if (highest) {
      sections.push({
        type: 'highest_stain',
        text: `Your biggest stain hit: ${highest.item_name} at ${highest.stain_level} stain.`,
        foodName: highest.item_name,
        stain_level: highest.stain_level,
        image_url: highest.image_url,
      });
    }
  }

  return { sections, hasData: sections.length > 0, hasAppts: (appointments || []).length > 0 };
}

// Monthly brief — defaults to the previous complete month (for the popup)
export function buildMonthlyBrief(data) {
  const now = new Date();
  return buildMonthlyBriefForPeriod(data, now.getFullYear(), now.getMonth() - 1);
}

// ── Yearly brief for a specific year ────────────────────────────────────────
export function buildYearlyBriefForYear(data, year) {
  const { scans, logs, appointments } = data;
  const yearStartMs = new Date(year, 0, 1).getTime();
  const yearEndMs = new Date(year + 1, 0, 1).getTime();

  const sections = [];

  const yearScans = scans.filter(s => {
    const t = new Date(s.created_date).getTime();
    return t >= yearStartMs && t < yearEndMs;
  });
  if (yearScans.length >= 2) {
    const first = yearScans[yearScans.length - 1];
    const last = yearScans[0];
    sections.push({
      type: 'shade_journey',
      text: `Your shade journey: ${first.shade || '—'} to ${last.shade || '—'} over ${yearScans.length} scans.`,
      scan_image_url: last.image_url,
    });
  }

  sections.push({
    type: 'total_scans',
    text: `You took ${yearScans.length} scan${yearScans.length === 1 ? '' : 's'} across ${year}.`,
    count: yearScans.length,
  });

  if (yearScans.length >= 2) {
    const byMonth = {};
    yearScans.forEach(s => {
      const m = monthStr(new Date(s.created_date));
      if (!byMonth[m]) byMonth[m] = { first: s.score, last: s.score, date: s.created_date };
      byMonth[m].last = s.score;
    });
    let bestMonth = null;
    let bestDelta = 0;
    Object.entries(byMonth).forEach(([m, v]) => {
      const delta = (v.last || 0) - (v.first || 0);
      if (delta > bestDelta) { bestDelta = delta; bestMonth = m; }
    });
    if (bestMonth) {
      const monthName = new Date(bestMonth + '-01').toLocaleDateString(undefined, { month: 'long' });
      sections.push({
        type: 'best_month',
        text: `${monthName} was your biggest jump: +${bestDelta} points.`,
      });
    }
  }

  const yearStainLogs = getStainLogsRange(logs, yearStartMs, yearEndMs);
  if (yearStainLogs.length > 0) {
    const grouped = {};
    yearStainLogs.forEach(l => {
      const name = l.item_name;
      if (!grouped[name]) grouped[name] = { name, total: 0, count: 0, image_url: l.image_url };
      grouped[name].total += l.stain_level || 0;
      grouped[name].count += 1;
    });
    const top3 = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 3);
    sections.push({
      type: 'top_foods',
      text: `Your top 3 staining foods across ${year}:`,
      foods: top3,
    });
  }

  if (yearScans.length >= 2) {
    const first = yearScans[yearScans.length - 1];
    const last = yearScans[0];
    sections.push({
      type: 'score_arc',
      text: `From ${first.score ?? '—'} in ${new Date(first.created_date).toLocaleDateString(undefined, { month: 'short' })} to ${last.score ?? '—'} in ${new Date(last.created_date).toLocaleDateString(undefined, { month: 'short' })}.`,
      firstScore: first.score,
      lastScore: last.score,
      scan_image_url: last.image_url,
    });
  }

  const missedAppts = getMissedApptsRange(appointments, yearStartMs, yearEndMs);
  if (missedAppts.length > 0) {
    sections.push({
      type: 'appointments',
      text: `You missed ${missedAppts.length} appointment${missedAppts.length === 1 ? '' : 's'} across ${year}.`,
    });
  }

  if (yearScans.length > 0) {
    const whitest = yearScans.reduce((best, s) => (s.score > (best?.score || 0) ? s : best), null);
    if (whitest) {
      sections.push({
        type: 'whitest_day',
        text: `Your whitest day: ${whitest.shade || 'measured'} at ${whitest.score} points.`,
        score: whitest.score,
        shade: whitest.shade,
        scan_image_url: whitest.image_url,
      });
    }
  }
  if (yearStainLogs.length > 0) {
    const highest = yearStainLogs.reduce((max, l) => ((l.stain_level || 0) > (max?.stain_level || 0) ? l : max), null);
    if (highest) {
      sections.push({
        type: 'highest_stain',
        text: `Your biggest stain hit: ${highest.item_name} at ${highest.stain_level} stain.`,
        foodName: highest.item_name,
        stain_level: highest.stain_level,
        image_url: highest.image_url,
      });
    }
  }

  return { sections, hasData: sections.length > 0, hasAppts: (appointments || []).length > 0 };
}

// Yearly brief — defaults to the previous complete year (for the popup)
export function buildYearlyBrief(data) {
  const now = new Date();
  return buildYearlyBriefForYear(data, now.getFullYear() - 1);
}

// ── Completed period history (for the Briefs page) ───────────────────────────
export function getCompletedWeeklyBriefs(data) {
  const { scans } = data;
  const cutoff = getWeeklyCutoff(new Date());
  const weekSet = new Set();
  scans.forEach(s => {
    const sw = startOfWeek(new Date(s.created_date));
    if (sw.getTime() < cutoff.getTime()) weekSet.add(localDayStr(sw));
  });
  return [...weekSet].sort().reverse().map(key => {
    const ws = new Date(key + 'T12:00:00');
    return { weekStart: ws, key, title: getWeeklyTitle(ws), brief: buildWeeklyBriefForWeek(data, ws) };
  });
}

export function getCompletedMonthlyBriefs(data) {
  const { scans } = data;
  const cutoff = getMonthlyCutoff(new Date());
  const monthSet = new Set();
  scans.forEach(s => {
    const d = new Date(s.created_date);
    if (startOfMonth(d).getTime() < cutoff.getTime()) {
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    }
  });
  return [...monthSet].sort().reverse().map(key => {
    const [y, m] = key.split('-').map(Number);
    return { year: y, month: m, key, title: getMonthlyTitle(y, m), brief: buildMonthlyBriefForPeriod(data, y, m) };
  });
}

export function getCompletedYearlyBriefs(data) {
  const { scans } = data;
  const cutoff = getYearlyCutoff(new Date());
  const yearSet = new Set();
  scans.forEach(s => {
    const y = new Date(s.created_date).getFullYear();
    if (new Date(y, 0, 1).getTime() < cutoff.getTime()) yearSet.add(y);
  });
  return [...yearSet].sort((a, b) => b - a).map(y => ({
    year: y, key: String(y), title: getYearlyTitle(y), brief: buildYearlyBriefForYear(data, y)
  }));
}

// ── Scheduling (popup auto-show with 4pm gates + morning carry-over) ────────

const BRIEF_HOUR = 16;

function isAfter4pm(now) { return now.getHours() >= BRIEF_HOUR; }

// The "active" daily brief key. After 4pm it's today's brief; before 4pm
// it's yesterday's (the carry-over candidate).
function getActiveDailyKey(now) {
  if (isAfter4pm(now)) return localDayStr(now);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  return localDayStr(y);
}

// The reference date for building the active daily brief's content.
// Carry-over briefs use yesterday as "now" so the content matches what
// was generated the evening before.
function getActiveDailyReference(now) {
  if (isAfter4pm(now)) return new Date(now);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  return y;
}

// Active weekly brief week start. Saturday after 4pm: current week (ending).
// Otherwise: previous completed week. Same week on Saturday and Sunday so
// the carry-over shows the same brief.
export function getActiveWeekStart(now) {
  const sow = startOfWeek(now);
  if (now.getDay() === 6 && now.getHours() >= BRIEF_HOUR) return sow;
  return new Date(sow.getTime() - 7 * 86400000);
}

// Weekly popup window: Saturday after 4pm through Sunday end-of-day.
function isWeeklyInPopupWindow(now) {
  const day = now.getDay();
  if (day === 6 && now.getHours() >= BRIEF_HOUR) return true;
  if (day === 0) return true;
  return false;
}

// Active monthly/yearly keys. A period becomes active (ready to alert) after
// 4pm on its final day; before that the previous completed period is active.
export function getActiveMonthlyKey(now) {
  if (isLastDayOfMonth(now) && now.getHours() >= BRIEF_HOUR) return localMonthStr(now);
  const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return localMonthStr(m);
}
export function getActiveYearlyKey(now) {
  if (now.getMonth() === 11 && now.getDate() === 31 && now.getHours() >= BRIEF_HOUR) return String(now.getFullYear());
  return String(now.getFullYear() - 1);
}

// ── Read / dismissed state ──────────────────────────
// Read: user opened the brief content (tapped "Got it"). Stops all future
//   pops for that period.
// Dismissed: user closed the popup without reading. Stored as
//   "briefKey|whenDay" so we can tell same-evening dismissal (don't re-pop
//   tonight) from cross-day dismissal (carry-over pop next morning).

const READ_KEY = (type) => `teewai_brief_read_${type}`;
const DISMISSED_KEY = (type) => `teewai_brief_dismissed_${type}`;
const ALERT_KEY = (type) => `teewai_brief_alert_${type}`;

function getDismissed(type) {
  const raw = localStorage.getItem(DISMISSED_KEY(type));
  if (!raw) return null;
  const [briefKey, whenDay] = raw.split('|');
  return { briefKey, whenDay };
}

function isRead(type, key) {
  return localStorage.getItem(READ_KEY(type)) === key;
}

// ── Cross-device sync (best-effort mirror to user profile) ──────────────────
// Reads are mirrored to the user profile so a brief read on device A
// doesn't pop on device B. Dismissals stay device-local (timing-specific).

export async function syncBriefReadStates() {
  try {
    const me = await userProfile.get();
    const raw = me?.brief_read_states;
    if (raw && typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      for (const [type, key] of Object.entries(parsed)) {
        if (key && localStorage.getItem(READ_KEY(type)) !== key) {
          localStorage.setItem(READ_KEY(type), key);
        }
      }
      window.dispatchEvent(new Event('brief-pending-changed'));
    }
  } catch { /* offline or not logged in */ }
}

async function pushBriefReadState(type, key) {
  try {
    const me = await userProfile.get();
    const existing = me?.brief_read_states ? JSON.parse(me.brief_read_states) : {};
    if (existing[type] === key) return;
    existing[type] = key;
    await userProfile.update({ brief_read_states: JSON.stringify(existing) });
  } catch { /* best-effort */ }
}

// ── Pending briefs (popup candidates — daily & weekly only) ─────────────────
export function getPendingBriefs() {
  const now = new Date();
  const pending = [];

  // Daily
  const dailyKey = getActiveDailyKey(now);
  const dailyRef = getActiveDailyReference(now);
  const dailyDismissed = getDismissed('daily');
  if (!isRead('daily', dailyKey)) {
    if (isAfter4pm(now)) {
      // Evening of day D: pop if not dismissed today (same-evening block)
      if (!dailyDismissed || dailyDismissed.briefKey !== dailyKey || dailyDismissed.whenDay !== localDayStr(now)) {
        pending.push({ type: 'daily', referenceDate: dailyRef });
      }
    } else {
      // Morning of day D+1: carry-over if dismissed on D (different day) and not read
      if (dailyDismissed && dailyDismissed.briefKey === dailyKey && dailyDismissed.whenDay !== localDayStr(now)) {
        pending.push({ type: 'daily', referenceDate: dailyRef });
      }
    }
  }

  // Weekly
  if (isWeeklyInPopupWindow(now)) {
    const weekKey = localDayStr(getActiveWeekStart(now));
    const weekDismissed = getDismissed('weekly');
    if (!isRead('weekly', weekKey)) {
      if (!weekDismissed || weekDismissed.briefKey !== weekKey || weekDismissed.whenDay !== localDayStr(now)) {
        pending.push({ type: 'weekly', referenceDate: getActiveWeekStart(now) });
      }
    }
  }

  const priority = { daily: 4, weekly: 3 };
  pending.sort((a, b) => priority[b.type] - priority[a.type]);
  return pending;
}

// ── Unread briefs (for badge/dot — includes monthly & yearly) ───────────────
export function getUnreadBriefs() {
  const now = new Date();
  const unread = [];
  getPendingBriefs().forEach(p => unread.push(p.type));
  if (!isRead('monthly', getActiveMonthlyKey(now))) unread.push('monthly');
  if (!isRead('yearly', getActiveYearlyKey(now))) unread.push('yearly');
  return unread;
}

export function hasUnreadBriefs() {
  return getUnreadBriefs().length > 0;
}

// ── Mark brief as read (user opened the content) ────────────────────────────
export function markBriefRead(type) {
  const now = new Date();
  const keys = {
    daily: getActiveDailyKey(now),
    weekly: localDayStr(getActiveWeekStart(now)),
    monthly: getActiveMonthlyKey(now),
    yearly: getActiveYearlyKey(now),
  };
  const key = keys[type];
  if (!key) return;
  localStorage.setItem(READ_KEY(type), key);
  localStorage.removeItem(DISMISSED_KEY(type));
  pushBriefReadState(type, key);
  window.dispatchEvent(new Event('brief-pending-changed'));
}

// ── Mark brief as dismissed (user closed popup without reading) ──────────────
export function markBriefDismissed(type) {
  const now = new Date();
  const keys = {
    daily: getActiveDailyKey(now),
    weekly: localDayStr(getActiveWeekStart(now)),
  };
  const key = keys[type];
  if (!key) return;
  localStorage.setItem(DISMISSED_KEY(type), `${key}|${localDayStr(now)}`);
  window.dispatchEvent(new Event('brief-pending-changed'));
}

// ── Monthly/yearly sleek alert (one-shot, non-popup) ────────────────────────
export function shouldShowBriefAlert(type) {
  if (type !== 'monthly' && type !== 'yearly') return false;
  const now = new Date();
  const keys = { monthly: getActiveMonthlyKey(now), yearly: getActiveYearlyKey(now) };
  const key = keys[type];
  return localStorage.getItem(ALERT_KEY(type)) !== key && !isRead(type, key);
}

export function markBriefAlertShown(type) {
  const now = new Date();
  const keys = { monthly: getActiveMonthlyKey(now), yearly: getActiveYearlyKey(now) };
  localStorage.setItem(ALERT_KEY(type), keys[type]);
}

// ── Backward compat ──────────────────────────────────────────────────────────
export function markBriefShown(type) {
  markBriefRead(type);
}

export function getAvailableBriefs() {
  return getPendingBriefs().map(p => p.type);
}

// ── Hint dismissal (coach mark pill) ────────────────────────────────────────
// Permanent one-shot flag: once the "Your briefs live in here" hint has been
// shown, it never appears again — even when new briefs arrive later.
export function getBriefHintDismissed() {
  return localStorage.getItem('teewai_brief_hint_dismissed') === '1';
}

export function dismissBriefHint() {
  localStorage.setItem('teewai_brief_hint_dismissed', '1');
}