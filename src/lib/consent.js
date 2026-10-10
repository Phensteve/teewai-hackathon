// Cookie / storage consent — single source of truth for whether non-essential
// browser storage and first-party tracking (the visitor session ID) may be
// used. The consent banner writes here; VisitorHeartbeat reads here before
// setting teewai_session_id or sending heartbeats.
//
// BROWSER + DATABASE: localStorage is the fast UX state (no re-prompt on every
// visit). For logged-in users, every choice also appends a CookieConsent
// record to the database as an append-only audit trail. Guests get
// localStorage only — no database record for people without accounts.
//
// IP monitoring for abuse prevention / free-scan enforcement is ALWAYS ACTIVE
// (essential, legitimate-interest basis) and is NOT affected by this choice.

import { unrufld } from '@/api/unrufldClient';

const KEY = 'teewai_consent';

// Bump this when the consent policy changes. A version mismatch clears the
// stored choice and re-prompts the user.
export const POLICY_VERSION = '1.0';

export function getConsent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.choice === 'accepted' || parsed.choice === 'rejected')) {
      // Version mismatch = stale consent from an old policy. Treat as no
      // consent so the banner re-prompts under the new policy version.
      if (parsed.version !== POLICY_VERSION) return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function hasConsented() {
  return getConsent() !== null;
}

// Returns true only when the user has explicitly accepted non-essential
// storage/tracking. False for "rejected" and for "no decision yet".
export function canTrack() {
  const c = getConsent();
  return c?.choice === 'accepted';
}

// Map internal choice string to the database enum.
function dbChoice(choice) {
  return choice === 'accepted' ? 'accept_all' : 'reject_non_essential';
}

// Fire-and-forget: append a CookieConsent record for logged-in users. Guests
// get localStorage only — no database record for people without accounts.
async function appendConsentRecord(choice, source) {
  try {
    const user = await unrufld.auth.me();
    if (!user?.id) return;
    await unrufld.entities.CookieConsent.create({
      user_id: user.id,
      choice: dbChoice(choice),
      policy_version: POLICY_VERSION,
      consent_date: new Date().toISOString(),
      source,
    });
  } catch { /* not logged in or DB unavailable — local-only is fine */ }
}

// Persist the choice with a fresh timestamp, policy version, and notify
// listeners (VisitorHeartbeat) so they can start/stop immediately without a
// page reload. Also appends a DB record for logged-in users (audit trail).
export function setConsent(choice, source = 'banner') {
  const record = { choice, timestamp: Date.now(), version: POLICY_VERSION };
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent('teewai:consent-change', { detail: record }));
  // If the user rejected, remove any existing non-essential session ID so
  // no further heartbeats can be sent and no orphaned identifier lingers.
  if (choice === 'rejected') {
    try { localStorage.removeItem('teewai_session_id'); } catch { /* */ }
  }
  // Append a DB record for logged-in users (fire-and-forget, non-blocking).
  appendConsentRecord(choice, source);
}

// Sync consent from the server after login. Called once the user is
// authenticated. If a server record exists, it is honored as truth and
// localStorage is updated (no re-prompt). If no server record exists, the
// local choice (if any) is pushed up to the server.
export async function syncConsentFromServer() {
  try {
    const user = await unrufld.auth.me();
    if (!user?.id) return;
    const records = await unrufld.entities.CookieConsent.filter(
      { user_id: user.id }, '-consent_date', 1
    );
    const latest = records?.[0];
    if (!latest) {
      // No server record — push the local choice up if one exists.
      const local = getConsent();
      if (local) {
        await unrufld.entities.CookieConsent.create({
          user_id: user.id,
          choice: dbChoice(local.choice),
          policy_version: local.version || POLICY_VERSION,
          consent_date: new Date(local.timestamp || Date.now()).toISOString(),
          source: 'banner',
        });
      }
      return;
    }
    // Server record exists. If the version matches, honor it as truth.
    if (latest.policy_version === POLICY_VERSION) {
      const choice = latest.choice === 'accept_all' ? 'accepted' : 'rejected';
      const record = {
        choice,
        timestamp: new Date(latest.consent_date).getTime() || Date.now(),
        version: POLICY_VERSION,
      };
      try { localStorage.setItem(KEY, JSON.stringify(record)); } catch {}
      window.dispatchEvent(new CustomEvent('teewai:consent-change', { detail: record }));
    } else {
      // Version mismatch — clear local consent so the banner re-prompts
      // under the new policy version on the next visit.
      try { localStorage.removeItem(KEY); } catch {}
    }
  } catch { /* not logged in or DB unavailable — local-only is fine */ }
}

// Dispatch an event that the ConsentBanner listens for — used by the footer
// "Cookie settings" link to re-open the banner so users can change their
// choice. The source is passed so the DB record knows where the change came
// from (banner vs settings).
export function openConsentBanner(source = 'banner') {
  window.dispatchEvent(new CustomEvent('teewai:open-consent', { detail: { source } }));
}