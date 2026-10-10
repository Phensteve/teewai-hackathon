# Teewai — Engineering & Product Audit

Date: 2026-08-09
Scope: Full inspection prompted by the "software engineering vs. vibe coding" concern — design, feel, functionality, performance, billing correctness, and conversion.

This audit is honest about what is **fixed** and what is **deferred** (with the reason and the recommended next step). Doing all 25+ items in one pass would have produced the broken-pillar foundation you explicitly do not want, so a verified core landed and the rest is sequenced.

---

## ✅ Batch 1 — Premium feel & satisfying feedback (fixed)

### 1. Companion Vitality card — premium, integral, responsive
**Flaw:** Solid `bg-olo` + heavy `olo-glow` box-shadow produced a hard floating box that "cut" against the dashboard and read as bolted-on. Not perfectly responsive; the moment felt glanceable-not-satisfying.
**Fix (`src/components/CompanionVitality.jsx`):** Replaced the harsh outer box-shadow with the same `bg-olo-deep + radial-olo` inner-glow treatment used by the Results first-scan card (shared visual language = integral). Vitality ring now uses a white→olo-glow gradient stroke with a soft drop-shadow glow. Stacks vertically on mobile, side-by-side on `sm+`.

### 2. Sounds at every confetti blast + claim reward
**Fix:** Added `playConfetti()` + `playClaim()` to `src/lib/sounds.js`. `Scan.jsx`'s `fireConfetti()` plays it (covers all 4 blast sites). `Results.jsx` first-scan confetti plays it. `RewardReveal.jsx` "Claim reward" plays `playClaim()`.

### 3. Consistent loaders
**Fix:** New shared `src/components/Spinner.jsx`, adopted in `App.jsx`, `AppShell.jsx`, `Scan.jsx`, `Subscription.jsx`, `Family.jsx`.

### 4. Offline indicator moved out of the APK status bar
**Fix:** `.offline-bar` utility in `src/index.css` offsets the banner to just below the teewai top bar on mobile (clear of the phone status/notification bar) and flush top on desktop. `OfflineIndicator.jsx` uses it.

### 5. Retake scan deletes the unclear scan
**Fix (`src/pages/Results.jsx`):** "Retake scan" now deletes the `needs_another_photo` scan first, then navigates to `/scan`. If the user doesn't retake, the scan is kept.

### 6. "Are you lost?" sitemap link
**Fix:** `src/lib/PageNotFound.jsx` redesigned to olo theme with "Are you lost?" + diagonal-arrow sitemap link. `MobileMoreMenu.jsx` footer has an "Are you lost? ↗ Sitemap" link.

---

## ✅ Batch 2 — Billing correctness (fixed)

### 7. Family owner is now member 1; scans visibly decrement ("johndoe still 15")
**Flaw:** On a `family_15`/`family_pro` purchase, the backend added 75 scans to the top-level `scans_limit` but never created the owner as a member slot. The Scan page increments `members[0].scans_used`, but the Subscription page read the *top-level* `scans_used` (never incremented for family plans) — so it always showed 15/15.
**Fix:**
- `paystack/entry.ts` `activateSubscription`: for family plans, the buyer is auto-inserted as `members[0]` (name from display_name/username/full_name/email) with their own 15-scan allocation, unless the slot is already claimed.
- `Subscription.jsx`: the family owner's "Scans remaining" now reads `members[0].scans_used` / `members[0].scans_limit` — so it decrements as they scan.

### 8. Add-a-family-member price 2.99 → 3.49, and the payment now works
**Flaw:** `family_extra_member` was missing from the Paystack `PLAN_PRICES` map, so `initialize` returned "Invalid plan" — the "Pay now" button for an extra member was broken.
**Fix:** `payment.js` (`EXTRA_MEMBER.price`, `USD_FOR`) → 3.49; `paystack/entry.ts` added `family_extra_member: 3.49` to `PLAN_PRICES` and `→ 15` to `SCANS_FOR_PLAN`, so the extra-member checkout initializes and credits 15 scans.

### 9. Family linking removed from the Subscription page
**Fix:** `Subscription.jsx` removed the `FamilyDashboard` embed + import (family management lives on `/family`). `MobileMoreMenu.jsx` added a `/family` link (shown to non-members, i.e. family owners and non-family users) so mobile family owners can still reach the Family dashboard; family members keep the bottom-nav Family tab.

### 10. Individual Unlimited now precedes Family Unlimited
**Fix:** `Subscription.jsx` "Go unlimited" reordered — Unlimited Monthly + Yearly grid first, Family Unlimited full-width below. (Landing/HomeTest pricing order still pending.)

### 11. Subscription page loader standardized
**Fix:** `Subscription.jsx` uses the shared `Spinner`.

---

## 🟡 Deferred — needs deeper work (reason + next step)

### A. ✅ FIXED — Family-after-pack precedence
The `Subscription` entity now carries `pack_scans_total` / `pack_scans_remaining`. `paystack/entry.ts` captures leftover pack + bonus scans into `pack_scans_*` on the first family purchase, and the Scan page consumes pack scans before the family 15-scan allocation (and before a linked member's own allocation). No more double-counting.

### B. ✅ FIXED — New users get 3 scans instead of 2
**Root cause:** `Dashboard.jsx` used `subscription?.scans_limit || 3` — defaulting the scan counter to **3** when a brand-new user had no subscription yet (subscription is null → `undefined || 3` → 3), even though the free tier is 2 scans. The Scan page and Subscription page already defaulted to 2; only the Dashboard counter was wrong.
**Fix:** `Dashboard.jsx` now imports `FREE_SCANS` from `@/lib/payment` and uses `subscription?.scans_limit ?? FREE_SCANS` (nullish coalescing). Backend `analyzeScan` was also inspected — it correctly PATCHes the same `scan_id` row (no duplicate record), so the earlier "duplicate Scan record" hypothesis was ruled out.

### C. 📋 PLANNED — Move users + password hashes to InsForge entirely
**Status:** Migration plan + rollback written (`MIGRATION_PLAN.md`). NOT cut over — by design.
**Why not done in-place:** The Base44 platform owns auth (tokens, sessions, password storage) and never exposes password hashes to the app (the existing `useUserMirrorSync` hook already notes this). So a literal "hash migration" is impossible; the only safe re-homing is a **passwordless cutover**. A blind one-turn flip would lock out every live user. The plan documents 6 phases (Prep → Dual-write → Passwordless opt-in → Campaign → Cutover → Decommission), each independently rollback- able, with auto-revert triggers. Foundational prep is already in place: InsForge service-token data layer, profile mirror (`useUserMirrorSync`), InsForge-backed auth rate limiting + abuse screening (`userAuth`). Execute Phase 2+ as a dedicated project with a maintenance window — not from a chat turn.
**Update (2026-08-09):** A forced password-reset cutover is now live as a security hardening step — all existing users (created before the `PASSWORD_RESET_CUTOFF` in `Login.jsx`) must set a fresh password at their next password login; Google-auth users are exempt (they never hit the password gate). Implemented as an app-level gate using a `must_reset_password` flag on the User entity + the platform's existing reset-email flow (no custom auth backend). The platform blocks bulk user updates, so the flag is set lazily on each user's first login (`updateMe`) rather than bulk-flagged ahead of time; a one-shot `teewai_just_reset` localStorage flag clears the requirement on the login that follows a reset. The full InsForge re-homing (phases 2+) remains a dedicated project.

### D. ✅ FIXED — AI chatbot in the Help Center
`HelpCenter.jsx` embeds `HelpChat` — a conversational, FAQ-grounded assistant with automated customer-service routing.

### E. ✅ FIXED — Notifications section polish
`NotificationsBell.jsx` polished with Framer Motion entry/exit animations and type-specific accents (gift / info / warning), plus read-state and empty-state handling.

### F. ✅ FIXED — Real tooth-shape mesh (outer = tooth shape, inner = moving vines)
**Approach:** Deterministic client-side canvas CV (`src/lib/toothContour.js`) traces the REAL tooth boundary + inter-tooth gaps from the scan photo at view time — not LLM-hallucinated polygon coordinates (consistent with the "deterministic dentalCV over hallucinated coordinates" dead-end lesson). Works for every scan, past and present, with no re-analysis or record bloat.
- `extractSmileContour(url, bbox)` crops to the smile region, builds a gradient tooth-confidence mask (mirrors `dentalCV` thresholds), traces the per-row tooth extent into a closed arch silhouette, and finds inter-tooth gaps as minima in the column-confidence profile.
- `ToothMeshOverlay.jsx` renders the real outline as a glowing tooth-shape stroke (+ subtle fill), with animated `vine-flow` filaments flowing along the boundary and down each real gap position, plus a gumline thread and sampled landmark nodes. Falls back to the original uniform grid mesh if extraction fails or there's no bbox, so the page never breaks.
- Added `vine-flow` keyframe to `src/index.css`.

### G. ✅ FIXED — Ongoing-scan persistence verification
`Scan.jsx` creates the scan record with `status: 'analyzing'` early and polls on re-mount to recover scans interrupted by network drops or navigation. `FullScanStepper` advances steps immediately and runs angle checks in the background to keep the camera loop responsive.

### H. ✅ FIXED — Results floating tab bar
`ResultsTabBar` redesigned to a floating frosted-pill aesthetic with icons and a sliding active indicator, so the Overview / Your smile / Health / Your plan tabs stay accessible without obstructing content.

### I. ✅ FIXED — Pricing order on Landing + HomeTest; sticky currency switcher; duplicate pricing
`LandingPricing.jsx` + `HomeTestPricing.jsx` both render scan packs → individual Unlimited (monthly/yearly) → Family pack → Family Unlimited. `StickyCurrencySwitcher` is mounted in both with safe-area-aware offsets. `HomeTest.jsx` renders `HomeTestPricing` exactly once (no duplicate section).

### J. Remove family linking from the Subscription page
✅ Done (Batch 2, item 9).

### K. ✅ FIXED — Site visitors record now saves IP addresses
**Fix (`visitorStats/entry.ts`):** Added an `ip_address` column to the `site_visitors` table and capture the visitor IP via `getClientIp` on every heartbeat (stored on insert + refreshed on upsert), so the admin dashboard can see where visitors connect from.

### L. ✅ FIXED — Page load speed (prefetch + defer heavy chunks)
**Prefetch likely routes:** new `src/lib/routePrefetch.js` exposes `prefetchRoute` + `prefetchOnIdle`. `AppShell` warms the most-likely next route chunks (Scan, My scans, Subscription, Rank, Profile) on `requestIdleCallback` after mount, and every desktop sidebar + mobile bottom-nav link prefetches its chunk on hover/touch-start — so by the time the user taps, the chunk is already cached and the page renders instantly.
**Defer recharts:** `ProgressChart` (the only recharts consumer on the Dashboard) is split into a lightweight wrapper + a lazy `ProgressChartCanvas`. The recharts chunk (~400KB) now only downloads when a user has ≥2 scans; brand-new users (0–1 scans, the most connection-sensitive) never load recharts on their first Dashboard. Three.js chunks remain on their own lazy routes (Results/HomeTest) and were not touched.

### M. ✅ FIXED — Competitor parity (Mouthy / Smile AI / Shade / WhiteSmile)
**Food/drink stain-impact tracker** (`src/pages/StainTracker.jsx` + `src/lib/stainCatalog.js` + `StainLog` entity): a research-grounded catalog of 27 items (chromogenic / acidity / tannin / stain_level + mitigation tips), a daily stain-load meter, a 7-day trend, today's logged items with remove, a personalized insight tied to the user's latest scan shade, and an AI "scan a food/drink" button (UploadFile → InvokeLLM vision identify → auto-log) — Smile AI's camera differentiator. Entry point on the Dashboard.
**Private VITA timeline** (`src/pages/VitaTimeline.jsx` + `src/lib/vitaShade.js`): plots the user's shade progression over time on the VITA ladder (SVG chart, lighter = up, target as a dashed line), reuses `VitaShadeScale` for current-vs-target, shows steps/weeks to target, total progress since first scan, and a scan-by-scan history with deltas. Private by existing Scan RLS. Entry point on the Dashboard.

### N. 🟡 IN PROGRESS — Conversion optimization pass
CRO is iterative and measurement-driven; not a one-shot edit. First bounded pass: the scan paywall (highest-intent conversion surface) now surfaces the entry price ("scan packs start at $0.99") and offers a dual CTA — "Get a scan pack" + "Go unlimited" — so users hitting the limit see both the low-friction entry and the unlimited upsell. Second pass: the Dashboard first-scan empty state (the single highest-intent surface for new users) was a small tucked-in card — replaced with a premium full-width `FirstScanEmpty` hero that sells the value (whiteness score, health check, personalized plan), surfaces the "2 free scans — no card needed" trust signal, and drives a strong CTA to /scan. Subsequent passes should be guided by analytics (funnel drop-off, paywall→checkout rate, first-scan completion). **Instrumentation landed:** the conversion funnel is now tracked — `scan_paywall_view` (Scan.jsx, fires when a user hits the out-of-scans gate), `checkout_view` (Checkout.jsx, on mount), `checkout_complete` (ThankYou.jsx, on mount), and `scan_complete` with `is_first` + `scan_type` (Scan.jsx, on every successful quick/full scan). These four events give the paywall→checkout rate, checkout→complete rate, and first-scan completion rate the audit says should guide the next CRO passes — so further changes are data-driven, not guessed.

---

## 🧱 Foundation health (the "solid pillars" concern)

**Good foundations already in place:** route-level code splitting with auto-reload; drop-survival for long AI calls; centralized sound system; theme tokens; shared utilities; RLS on every user-data entity.

**Foundation debt to address (deferred, sequenced):**
1. ✅ FIXED — `Results.jsx` split into 4 focused tab components (`OverviewTab`, `SmileTab`, `HealthTab`, `PlanTab` under `src/components/results/`), reducing the page from 726 → ~280 lines. `Scan.jsx` de-duplicated via `src/lib/scanFlow.js` (shared `playGamificationCues` / `buildRewardState` / `isNetworkError` / `fireConfetti`), removing ~120 lines of duplicated success/poll/error logic and fixing a latent `playLevelUp` import bug.
2. Auth/identity split between Base44 User entity and InsForge — the "move users to InsForge" item (C) is the root fix.
3. ✅ FIXED — Billing logic consolidated into one server-side path. New `scanQuota` backend function (`base44/functions/scanQuota/entry.ts`) is the single source of truth for the quota check + counter increment across all plan types (free / pack / pro / family-owner / linked-member), with pack precedence and the pack→family switch notification handled server-side. Shared member-matching extracted to `base44/shared/familyMatch.ts` (used by `scanQuota` + `familyResolve`). `Scan.jsx`'s `runScan` + `runFullScan` now call `scanQuota.check` (before the AI) and `scanQuota.consume` (after), then re-read state from the server — removing ~55 lines of duplicated plan-detection / limit / increment logic. Side-effect fix: the InsForge client proxy's `+1 only` guard on `scansUsed` silently broke full-scan (cost 3) increments for solo users; the service-token path bypasses that, so full scans now count correctly.
4. ✅ FIXED — Per-route error boundary added inside `AppShell` (wraps `<Outlet />` with `<ErrorBoundary compact>`), so an in-app page crash keeps the sidebar/nav intact instead of blanking the whole app. The top-level boundary remains as the catch-all for public routes.

---

## Recommended next session priority order
1. **A** — family-after-pack precedence (small schema addition + Scan logic).
2. **D** — Help Center AI chatbot.
3. **I** — pricing order on Landing/HomeTest + sticky currency switcher + duplicate pricing.
4. **F** — real tooth-shape mesh.
5. **E + H** — notifications polish + Results floating sidebar.
6. **C** — InsForge auth migration (largest; do last with a migration plan).