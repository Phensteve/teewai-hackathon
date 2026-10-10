import { callInsforge, ensureTable, countRecords, insertRecords, deleteRecords } from "../../shared/insforgeRateLimit.ts";
import { buildQuery } from "../../shared/insforge.ts";
import { getClientIp } from "../../shared/ipUtils.ts";

// User-facing auth rate limiting + disposable email blocking.
// Backed by InsForge so limits persist across Worker instances.
//
// Rate types:
//   login   — 5 per 15 min  (per identifier + per IP at 3x)
//   otp     — 5 per 10 min  (per email + per IP at 3x)
//   resend  — 3 per 10 min  (per email)
//   reset   — 3 per 60 min  (per email)
//   resolve — 10 per 15 min (per IP — gates username→email resolution)

const ATTEMPTS_TABLE = "user_auth_attempts";

const RATE_CONFIG: Record<string, { max: number; windowMs: number }> = {
  login:   { max: 5,  windowMs: 15 * 60 * 1000 },
  otp:     { max: 5,  windowMs: 10 * 60 * 1000 },
  resend:  { max: 3,  windowMs: 10 * 60 * 1000 },
  reset:   { max: 3,  windowMs: 60 * 60 * 1000 },
  resolve: { max: 10, windowMs: 15 * 60 * 1000 },
};

// Top disposable/temporary email domains — covers the vast majority of abuse.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","10minutemail.com","guerrillamail.com","tempmail.com",
  "temp-mail.org","throwawaymail.com","yopmail.com","getnada.com",
  "maildrop.cc","dispostable.com","fakeinbox.com","mailnesia.com",
  "sharklasers.com","guerrillamailblock.com","spam4.me","tempinbox.com",
  "mintemail.com","tempmailo.com","emailondeck.com","keepmymail.com",
  "moakt.com","tempmailaddress.com","trashmail.com","mytemp.email",
  "tempr.email","discard.email","mailcatch.com","20minutemail.com",
  "incognitomail.com","mail7.io","mohmal.com","nada.email",
  "onewaymail.com","trash-mail.com","tmpmail.org","tmpmail.net",
  "meltmail.com","spamgourmet.com","guerrillamail.info","grr.la",
  "33mail.com","armyspy.com","cuvox.de","dayrep.com","einrot.com",
  "freesportstv.org","lastmail.co","mailasaur.us","mailinator.net",
  "mailita.com","monolith.email","neutrinoplc.com","odnorazovoe.ru",
  "paplease.com","quickinbox.com","reppop.com","rhyta.com","rmqkr.net",
  "safe-mail.net","shouts.net","smailpro.com","sp.uctoon.com","spam.la",
  "spamfree.eu","spamfree24.org","superdater.com","te.mpero.net",
  "tyldd.com","uacro.com","vmani.com","webemail.me","wimsg.com",
  "zainmax.com","zoemail.com","zomg.info","nospammail.net","trbvm.com",
  "fleckens.hu","guerrillamail.net","harakirimail.com","kickmail.com",
  "mail54.com","mfsa.ru","mt2015.com","my10minutemail.com","o2.pl",
  "privatemail.me","roids365.com","safetymail.info","saynotospams.com",
  "sendspamhere.com","shortmail.net","sinnlos-mail.com","slipry.net",
  "sofimail.com","solvemail.info","spamcorptastic.com","spamfree24.com",
  "spamfree24.net","superrito.com","suremail.info","svip520.com",
  "t.psh.me","tagmymedia.com","tempemail.co.za","tempmail.biz",
  "tempmaildemo.com","tempmailer.com","tempmailo.org","trashmail.me",
  "trashmail.net","trbvn.com","wasteland.rfc822.org","wegwerfemail.de",
  "wegwerfmail.de","wh4f.org","x1x14.com","x24.com","xmmail.ru",
  "yomail.info","yopmail.fr","yopmail.net","yyhmail.com","zetmail.com",
]);

let tableEnsured = false;

async function ensureAttemptsTable() {
  if (tableEnsured) return;
  tableEnsured = true;
  await ensureTable(ATTEMPTS_TABLE, [
    { columnName: "attempt_type", type: "string", isUnique: false, isNullable: false },
    { columnName: "attempt_key", type: "string", isUnique: false, isNullable: false },
    { columnName: "ip_address", type: "string", isUnique: false, isNullable: false },
    { columnName: "attempted_at", type: "string", isUnique: false, isNullable: false },
  ]);
}

async function countRecent(type: string, key: string) {
  const cfg = RATE_CONFIG[type];
  if (!cfg) return 0;
  const cutoff = new Date(Date.now() - cfg.windowMs).toISOString();
  // Opportunistic cleanup: delete records older than 2x the window to prevent
  // unbounded table growth (DOS vector + performance degradation at scale).
  const cleanupCutoff = new Date(Date.now() - cfg.windowMs * 2).toISOString();
  deleteRecords(ATTEMPTS_TABLE, { attempt_type: type, attempted_at: { lt: cleanupCutoff } });
  return countRecords(ATTEMPTS_TABLE, { attempt_type: type, attempt_key: key, attempted_at: { gte: cutoff } });
}

async function countRecentByIp(type: string, ip: string) {
  const cfg = RATE_CONFIG[type];
  if (!cfg) return 0;
  const cutoff = new Date(Date.now() - cfg.windowMs).toISOString();
  return countRecords(ATTEMPTS_TABLE, { attempt_type: type, ip_address: ip, attempted_at: { gte: cutoff } }, 200);
}

async function logAttemptRecord(type: string, key: string, ip: string) {
  return insertRecords(ATTEMPTS_TABLE, [
    { attempt_type: type, attempt_key: key, ip_address: ip || "unknown", attempted_at: new Date().toISOString() },
  ]);
}

async function clearAttemptRecords(type: string, key: string) {
  return deleteRecords(ATTEMPTS_TABLE, { attempt_type: type, attempt_key: key });
}

// Top 100+ most common breached passwords (Have I Been Pwned / SecLists).
// NIST 800-63B Rev 4 requires screening against these.
const COMMON_PASSWORDS = new Set([
  "password","12345678","123456789","1234567890","qwerty123","abc12345",
  "password1","password12","password123","1234567","11111111","00000000",
  "iloveyou","princess","sunshine","password!","letmein","welcome1",
  "monkey123","football","baseball","dragon11","master123","superman",
  "trustno1","iloveyou1","batman123","access14","shadow1","michael1",
  "charlie1","donald12","qazwsx123","passw0rd","passw0rd!","p@ssw0rd",
  "p@ssword","admin123","administrator","welcome123","welcome2024",
  "changeme","mustang1","corvette1","harley123","jordan23","gunner1",
  "hunter22","ranger1","marine1","killer1","pepper1","summer1",
  "winter1","spring1","autumn1","computer1","microsoft","internet1",
  "service1","canada1","jessica1","ashley12","amanda12","nicole12",
  "daniel12","thomas12","robert12","jennifer1","william1","richard1",
  "samantha","starwars1","whatever1","freedom1","whatever","fuckyou1",
  "asshole1","bitch123"," fuckyou2","q1w2e3r4","1q2w3e4r","1qaz2wsx",
  "zaq12wsx","zxcvbnm1","asdfghjk","asdf1234","qwertyui","12qwaszx",
  "aaaa1111","abcd1234","abc123456","11112222","22223333","99998888",
  "1234abcd","a1b2c3d4","pa55word","pa55w0rd","s3cr3t","s3cure1",
  "test1234","testtest","guest1234","default1","root1234","toor1234",
]);

// Detect sequential (1234, abcd) or repeating (aaaa, 1111) patterns
function isSequentialOrRepeating(pw: string): boolean {
  const lower = pw.toLowerCase();
  // All same character
  if (/^(.)\1+$/.test(lower)) return true;
  // Sequential ascending digits
  const seq = "0123456789abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i <= seq.length - 4; i++) {
    if (lower.includes(seq.slice(i, i + 4))) return true;
  }
  // Sequential descending
  const rev = seq.split("").reverse().join("");
  for (let i = 0; i <= rev.length - 4; i++) {
    if (lower.includes(rev.slice(i, i + 4))) return true;
  }
  // Keyboard patterns
  const kbd = ["qwerty","asdfgh","zxcvbn","qweasd","asdfzx"];
  for (const k of kbd) {
    if (lower.includes(k)) return true;
  }
  return false;
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1];
  if (!domain) return false;
  const parts = domain.toLowerCase().split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const sub = parts.slice(i).join(".");
    if (DISPOSABLE_DOMAINS.has(sub)) return true;
  }
  return false;
}

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { op, ...p } = body;
    const ip = getClientIp(req);

    switch (op) {
      case "checkRate": {
        const type = String(p.type || "");
        const cfg = RATE_CONFIG[type];
        if (!cfg) return Response.json({ error: "Invalid type" }, { status: 400 });
        const key = String(p.key || "").trim().toLowerCase();
        try {
          await ensureAttemptsTable();
          const [keyCount, ipCount] = await Promise.all([
            key ? countRecent(type, key) : Promise.resolve(0),
            ip && ip !== "unknown" ? countRecentByIp(type, ip) : Promise.resolve(0),
          ]);
          const blocked = keyCount >= cfg.max || ipCount >= cfg.max * 3;
          const retryAfter = blocked ? Math.ceil(cfg.windowMs / 1000) : 0;
          return Response.json({ blocked, retryAfter, keyCount, ipCount });
        } catch {
          // Fail open — never block a legitimate user due to a check error
          return Response.json({ blocked: false, retryAfter: 0, error: "Rate check skipped" });
        }
      }

      case "logAttempt": {
        const type = String(p.type || "");
        if (!RATE_CONFIG[type]) return Response.json({ error: "Invalid type" }, { status: 400 });
        const key = String(p.key || "").trim().toLowerCase();
        try {
          await ensureAttemptsTable();
          await logAttemptRecord(type, key, ip);
        } catch {}
        return Response.json({ ok: true });
      }

      case "clearAttempts": {
        const type = String(p.type || "");
        if (!RATE_CONFIG[type]) return Response.json({ error: "Invalid type" }, { status: 400 });
        const key = String(p.key || "").trim().toLowerCase();
        try {
          await ensureAttemptsTable();
          await clearAttemptRecords(type, key);
        } catch {}
        return Response.json({ ok: true });
      }

      case "checkEmail": {
        const email = String(p.email || "").trim().toLowerCase();
        if (!email || !email.includes("@")) {
          return Response.json({ valid: false, reason: "Invalid email" });
        }
        const disposable = isDisposableEmail(email);
        return Response.json({ valid: !disposable, disposable, domain: email.split("@")[1] });
      }

      case "checkPassword": {
        // NIST SP 800-63B Rev 4 §5.1.1.2: passwords must be screened against
        // a list of commonly-used, expected, or compromised passwords.
        const pw = String(p.password || "");
        if (pw.length < 8) {
          return Response.json({ valid: false, reason: "too_short" });
        }
        const lower = pw.toLowerCase();
        // Check against common breached passwords + simple patterns
        const breached = COMMON_PASSWORDS.has(lower);
        const sequential = isSequentialOrRepeating(pw);
        return Response.json({ valid: !breached && !sequential, reason: breached ? "breached" : sequential ? "pattern" : "ok" });
      }

      default:
        return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}