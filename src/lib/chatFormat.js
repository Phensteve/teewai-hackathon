// Tidies model output before display: collapses runaway punctuation
// ("!!!!!") and repeated characters, removes exclamation marks for a calm
// professional tone, and drops a stray leading "Hi" greeting line.
export function tidyBotText(text) {
  if (!text) return '';
  return String(text)
    .replace(/([!?.,])\1{2,}/g, '$1')
    .replace(/(\S)\1{6,}/g, '$1')
    .replace(/!+/g, '.')
    .replace(/\.{2}(?!\.)/g, '.')
    .replace(/^\s*(hi|hello|hey)[\s.,]*(there)?[\s.,]*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';

// Detects a chart request and the start date it refers to.
// Returns null when the message isn't asking for a visual.
export function detectChartIntent(q) {
  const t = q.toLowerCase();
  if (!/(graph|chart|plot|visual|illustrat|trend|progress over|show me how)/.test(t)) return null;
  const now = new Date();
  let since = null;
  const rel = t.match(/(?:last|past)\s+(\d+)?\s*(day|week|month|year)s?/);
  if (rel) {
    const n = Number(rel[1] || 1);
    const days = { day: 1, week: 7, month: 30, year: 365 }[rel[2]];
    since = new Date(now.getTime() - n * days * 86400000);
  }
  const abs = t.match(new RegExp(`(?:since|from|after)\\s+((?:\\d{1,2}\\s+)?(?:${MONTHS})[a-z]*\\.?(?:\\s+\\d{1,2})?(?:,?\\s+\\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{2,4})`));
  if (!since && abs) {
    let s = abs[1];
    if (!/\d{4}/.test(s)) s += ` ${now.getFullYear()}`;
    const d = new Date(s);
    if (!isNaN(d)) since = d > now ? new Date(d.setFullYear(d.getFullYear() - 1)) : d;
  }
  const metric = /gum/.test(t) ? 'gum' : /health/.test(t) ? 'health' : 'score';
  return { since: since ? since.toISOString() : null, metric };
}