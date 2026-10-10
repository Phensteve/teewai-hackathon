# InsForge Identity Migration — Plan & Rollback

**Status:** Planned. NOT cut over. This document is the deliverable for audit
item C ("Move users + password hashes to InsForge entirely"), which the audit
itself flags as the largest item — to be sequenced as its own project with a
migration plan + rollback.

---

## 1. Why this can't be a one-turn "flip"

Two hard constraints make a blind cutover dangerous:

1. **The Base44 platform owns auth.** Per platform rules, the auth backend
   (tokens, sessions, email verification, password storage) is managed by
   Base44 — the app must not implement its own auth backend, and cannot insert
   `User` records. `base44.auth.me()`, `loginViaEmailPassword`, `verifyOtp`,
   `setToken`, and the session are all platform-owned.

2. **Password hashes are not extractable.** No auth provider exposes password
   hashes to the app. The existing `useUserMirrorSync` hook already documents
   this (line 7-8): *"Passwords are never synced (no auth provider exposes
   them) — pair with a passwordless login on the new platform instead."*

So "move password hashes to InsForge" is literally impossible as stated. The
only safe re-homing path is **passwordless cutover** (OTP / magic-link on the
new platform), not a hash copy. Flipping the login flow in one turn would
break login for every live user with no recovery path.

## 2. Current architecture (as read from the code)

- **Source of truth for identity & sessions:** Base44 (`base44.auth.*`).
- **Profile mirror:** InsForge. `useUserMirrorSync` → `syncUserToMirror(me)`
  copies the current user's Base44 profile (id, email, username, display
  name, etc.) into an InsForge table, throttled to once / 24h / device.
- **App data:** Already on InsForge (scans, subscriptions, progress, dentist
  profiles) via `src/lib/insforgeDb.js`, accessed through a service token
  (`INSFORGE_PROJECT_TOKEN`) + the `callInsforge` rate-limited helper.
- **Rate limiting / abuse:** `base44/functions/userAuth/entry.ts` already uses
  InsForge (`user_auth_attempts` table) for login/OTP/reset rate limits +
  disposable-email + breached-password screening.
- **Admin / invites:** `base44.users.inviteUser(email, role)` — platform-owned.
  Admin user listing lives in `UserManagement.jsx` over `base44.entities.User`.

## 3. Inventory of touchpoints to migrate (cutover scope)

Every place that currently trusts Base44 for identity must be rewired to
trust InsForge. Categories (not an exhaustive line list — verify with a
codebase-wide search before each phase):

| Area | Current | Target |
|------|---------|--------|
| Session / token | `base44.auth` token in localStorage | InsForge-issued JWT |
| Login | `loginViaEmailPassword`, Google OAuth | InsForge passwordless (OTP) + OAuth bridge |
| Register | `register` → `verifyOtp` → `setToken` | InsForge OTP signup → InsForge JWT |
| Current user | `base44.auth.me()` (dozens of call sites) | InsForge `/me` from its JWT |
| User writes | `base44.auth.updateMe(data)` | InsForge `users` table update |
| User entity reads | `base44.entities.User.*` (admin) | InsForge `users` table |
| Invites | `base44.users.inviteUser` | InsForge invite + role row |
| RLS `{{user.id}}` | Base44 user id | InsForge user id (must stay stable) |
| AuthContext | `src/lib/AuthContext.jsx` | Swap provider to InsForge |
| Auth pages | `Login/Register/ForgotPassword/ResetPassword` | InsForge-backed flows |

## 4. Phased migration (each phase is independently rollback-able)

### Phase 0 — Preparation (no user impact)
- Stand up InsForge `users` table with: `id` (matching Base44 user id, kept
  stable), `email`, `username`, `display_name`, `full_name`, `role`,
  `created_at`, `mirror_updated_at`, `password_set_at` (nullable).
- Backfill `users` from existing mirror data + a one-shot admin export of
  `base44.entities.User.list()` (admin-only, service role).
- Add a `passwordless_enabled` flag per user (default false).

### Phase 1 — Dual-write (shadow, no cutover)
- `useUserMirrorSync` moves from 24h throttle → write-through: every
  `auth.me()` result upserts into InsForge `users`.
- Add an InsForge OTP endpoint (issue + verify) that does NOT yet issue
  sessions — only records that a user has proven ownership of the email.
- Rollback: stop dual-write; InsForge `users` table is read-only mirror.

### Phase 2 — Passwordless opt-in (parallel login)
- Ship a new "Sign in with email — passwordless" option alongside the
  existing Base44 login. On success, InsForge issues its own JWT and the app
  stores it under a **separate** localStorage key.
- App tries InsForge JWT first; if absent/invalid, falls back to Base44 auth.
- Users self-migrate by choosing passwordless once. No one is forced.
- Rollback: remove the passwordless option; Base44 auth is untouched.

### Phase 3 — Migration campaign
- Email + in-app nudge all users: "Set up passwordless sign-in" with a
   deadline. Track `password_set_at` to measure coverage.
- Admin dashboard shows migration progress (% of active users with
  `password_set_at`).
- Rollback: keep both paths live; campaign is just comms.

### Phase 4 — Cutover (only when ≥99% of active users migrated)
- Make InsForge JWT the primary session. Base44 auth becomes the fallback,
  then is removed once monitoring shows zero Base44 fallbacks for 14 days.
- Rewire `base44.auth.me()` call sites to the InsForge `/me`. Rewire RLS
  `{{user.id}}` (id is already stable from Phase 0). Rewire invites + admin.
- Rollback: flip the feature flag back to Base44-primary. Because both paths
  were kept live through Phase 3, rollback is a flag toggle, not a restore.

### Phase 5 — Decommission
- After 30 days of InsForge-primary with no incidents, remove the Base44
  auth fallback + the dual-write. This is the only non-rollbackable step.

## 5. Rollback triggers (auto-revert criteria)

- Any phase reverts immediately if:
  - Login success rate drops > 1% vs the pre-phase baseline.
  - A user reports inability to log in AND cannot recover via the other path.
  - InsForge `/me` or OTP endpoint error rate > 0.5%.
- Phase 4 (cutover) additionally reverts if the Base44 fallback fires for >
  5% of sessions in a 24h window (means too many users weren't migrated).

## 6. What is NOT in scope of this turn

- The actual cutover (Phase 2+). It requires a maintenance window, user
  comms, and live monitoring — not a code-only change.
- Extracting password hashes (impossible — see §1). The plan is passwordless.

## 7. What IS done now (foundational prep already in place)

- InsForge service-token data layer (`base44/shared/insforge.ts`).
- Profile mirror (`useUserMirrorSync` → `syncUserToMirror`).
- InsForge-backed auth rate limiting + abuse screening
  (`base44/functions/userAuth/entry.ts`).
- InsForge as the source of truth for all app data (scans, subscriptions…).

The migration plan above is the sequence to finish C safely. Execute it as
a dedicated project with a maintenance window — do not run Phase 2+ from a
chat turn.