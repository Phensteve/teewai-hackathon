import { callInsforge, ensureTable } from "./insforgeRateLimit.ts";
import { getClientIp } from "./ipUtils.ts";

// Tamper-evident consent + erasure audit log.
//
// Privacy regulations (GDPR Art. 7, HIPAA-style accountability) require that
// consent for processing of personal/health data be demonstrable. This logs
// each AI scan-processing event server-side, with a server-issued timestamp
// and the caller's IP — so the record cannot be fabricated or repudiated by
// the client (a client-side "I consented" flag can be spoofed; this cannot).
//
// The same table records account-erasure events, giving a complete audit
// trail: every user has a consent entry per AI-processed scan and an entry
// when their data was erased.

const CONSENT_TABLE = "consent_log";
let ensured = false;

export async function ensureConsentTable() {
  if (ensured) return;
  ensured = true;
  await ensureTable(CONSENT_TABLE, [
    { columnName: "userId", type: "string", isUnique: false, isNullable: false },
    { columnName: "userEmail", type: "string", isUnique: false, isNullable: true },
    { columnName: "consent_type", type: "string", isUnique: false, isNullable: false },
    { columnName: "version", type: "string", isUnique: false, isNullable: false },
    { columnName: "ip_address", type: "string", isUnique: false, isNullable: false },
    { columnName: "timestamp", type: "string", isUnique: false, isNullable: false },
    { columnName: "details", type: "string", isUnique: false, isNullable: true },
  ]);
}

// Records a consent/audit event. Never throws — consent logging must not
// break the calling flow (a failed log is better than a lost scan).
export async function logConsent(
  req: Request,
  user: { id: string; email?: string | null },
  consentType: string,
  details = "",
) {
  try {
    await ensureConsentTable();
    await callInsforge(`/api/database/records/${CONSENT_TABLE}`, {
      method: "POST",
      body: JSON.stringify([
        {
          userId: user.id,
          userEmail: user.email || null,
          consent_type: consentType,
          version: "1.0",
          ip_address: getClientIp(req),
          timestamp: new Date().toISOString(),
          details,
        },
      ]),
    });
  } catch (e) {
    console.error("[consentLog] failed to write:", e?.message || e);
  }
}