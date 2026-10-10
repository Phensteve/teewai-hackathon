// Clinical session ID for each scan — stamps every scan with a unique code
// (e.g. CAL-2026-0921-B1) so the experience reads as a diagnostic ceremony.
//
// Format: CAL-<YYYY>-<MM><DD>-<batch><sequence>
//   batch    — a single letter that rotates each calendar day (A→B→C…)
//   sequence — increments per scan within a day, resets when the batch rotates
//
// The sequence is device-local (localStorage) — it only needs to feel unique
// to the user, not globally unique. A collision across users is meaningless
// because the scan's database ID is the true unique key.

export function generateScanSessionId(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const dayKey = `${y}-${m}-${d}`;

  let seq = 1;
  let batch = 'A';
  try {
    const raw = localStorage.getItem('teewai_session_seq');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.day === dayKey) {
        seq = (parsed.seq || 0) + 1;
        batch = parsed.batch || 'A';
      } else {
        // New day — rotate the batch letter and reset the sequence.
        const prevBatch = (parsed.batch || 'A').charCodeAt(0) - 65;
        batch = String.fromCharCode(((prevBatch + 1) % 26) + 65);
        seq = 1;
      }
    }
    localStorage.setItem('teewai_session_seq', JSON.stringify({ day: dayKey, seq, batch }));
  } catch { /* localStorage unavailable — still return a valid ID */ }

  return `CAL-${y}-${m}${d}-${batch}${seq}`;
}