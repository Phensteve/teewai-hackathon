# teewai — Brand Identity Reference Sheet

> The single source of truth for everything that makes teewai look, sound, and feel like teewai.
> Last updated: July 2026

---

## 1. Brand Essence

**Mission:** An AI-driven dental analysis and subscription-based whitening companion that turns smile care into a confident, gamified, premium ritual.

**Positioning:** Premium wellness, not a medical device. teewai guides cosmetic whitening journeys — it is a companion, never a replacement for a dentist.

**Tagline spirit:** *"Your smile, tracked."* — confident, warm, never clinical.

**Core promise:** See your smile improve, week by week, with the same shade science dentists use — wrapped in a premium, handcrafted experience.

---

## 2. Brand Personality

| Trait | Expression |
|---|---|
| **Warm** | Friendly, conversational, never formal or desperate |
| **Premium** | Handcrafted feel, considered details, generous spacing |
| **Confident** | Clear, direct, empowering — never apologetic |
| **Playful (measured)** | Gamified rewards, smile traits, streaks — fun without being childish |
| **Trustworthy** | Research-grounded, transparent about limitations, honest disclaimers |

**Voice principles:**
- Talk *to* the user, not *at* them — second person ("your smile", "you earned").
- Celebrate progress with genuine enthusiasm, not hype.
- Nudge gently; never demand or guilt-trip (e.g. payment reminders are soft nudges, not threats).
- Keep it human — a friendly coach, not a corporate helpdesk.

---

## 3. Logo

- **Wordmark:** `teewai` — always lowercase, tight tracking, Sora 700.
- **Logo mark:** The teewai icon (see `src/components/Logo.jsx`).
- **Clear space:** Minimum padding equal to the logo's height on all sides.
- **Minimum size:** 24px for digital; never distort or recolor outside the palette.
- **Don'ts:** No drop shadows on the logo itself (glow is reserved for UI accents), no stretching, no placing on busy un-contrasted backgrounds.

---

## 4. Color Palette

### Primary — "olo" (the signature teal)
The brand's heartbeat. A vibrant, luminous teal-cyan that reads as clean, clinical-adjacent, and energetic.

| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--olo` | `174 100% 36%` | `#00B8A5` | Primary accent, CTAs, active states, links |
| `--olo-deep` | `182 85% 16%` | `#064B49` | Deep teal fills, premium card backgrounds |
| `--olo-glow` | `174 100% 50%` | `#00FFE5` | Glow effects, luminous highlights |

### Light theme
| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--foreground` | `180 20% 8%` | `#101A1A` | Primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card surfaces |
| `--muted` | `168 40% 96%` | `#F2FAF8` | Muted backgrounds |
| `--muted-foreground` | `180 8% 42%` | `#647575` | Secondary text |
| `--border` | `168 30% 90%` | `#DCEBES` | Borders, dividers |
| `--accent` | `168 80% 92%` | `#E6F7F4` | Subtle accent fills |

### Dark theme (primary shell)
| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--background` | `182 60% 6%` | `#061818` | Deep teal-black shell |
| `--foreground` | `168 40% 96%` | `#E6F7F4` | High-contrast text |
| `--card` | `182 50% 9%` | `#0B2121` | Elevated surfaces |
| `--muted` | `182 40% 14%` | `#0F2424` | Recessed areas |
| `--muted-foreground` | `168 20% 65%` | `#8FB8B8` | Secondary text |
| `--border` | `182 40% 18%` | `#152E2E` | Subtle dividers |
| `--accent` | `174 60% 20%` | `#0E5252` | Active accent fills |

### Chart / data colors
| Token | HSL | Hex | Role |
|---|---|---|---|
| `--chart-1` | `174 100% 36%` | `#00B8A5` | Primary data (olo) |
| `--chart-2` | `190 80% 45%` | `#17CEB0` | Secondary data |
| `--chart-3` | `160 60% 40%` | `#29A37A` | Tertiary data |
| `--chart-4` | `43 74% 66%` | `#E5C36C` | Warm highlight (gold) |
| `--chart-5` | `27 87% 67%` | `#F4A362` | Warm highlight (amber) |

### Semantic colors
| Token | Usage |
|---|---|
| `--destructive` | Errors, destructive actions (`0 84% 60%` light / `0 62% 40%` dark) |

**Color rules:**
- `olo` is the *only* brand accent — never introduce competing hues for primary actions.
- Warm chart colors (gold/amber) are reserved for data visualization and "rare" / reward contexts — never for primary UI.
- Maintain high contrast: dark teal shell + luminous olo accents + high-contrast text is the signature look.

---

## 5. Typography

### Font families
| Role | Font | Token | Weights |
|---|---|---|---|
| **Headings / Display** | Sora | `--font-heading`, `--font-display` | 300, 400, 500, 600, 700, 800 |
| **Body / UI** | Inter | `--font-body` | 300, 400, 500, 600 |
| **Serif accent** | Fraunces | `--font-serif` | 300, 400, 500, 600 |

**Source:** Google Fonts — loaded in `src/index.css` via `@import`.

### Type scale & hierarchy
| Element | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| H1 (hero) | Sora | 700–800 | 3xl–5xl | tight |
| H2 (section) | Sora | 700 | xl–2xl | tight |
| H3 (subsection) | Sora | 600 | lg | tight |
| Body | Inter | 400 | sm–base | normal |
| Small / caption | Inter | 400–500 | xs–sm | normal |
| Label / eyebrow | Inter | 500–600 | 11px | wide (`0.2em`), uppercase |
| Mono | system mono | 400 | sm | normal |

**Type rules:**
- Headings always use Sora with tight tracking — it gives the premium, engineered feel.
- Fraunces (serif) is a *spice* — use sparingly for editorial accents, never for UI labels.
- Eyebrow labels: uppercase, wide tracking, olo or muted-foreground — the signature "premium" detail.
- Never use more than 3 font weights in a single view.

---

## 6. Shape & Surface

| Property | Value | Notes |
|---|---|---|
| **Border radius** | `0.75rem` (12px) base | `--radius`; cards 1.5–2rem, pills full |
| **Border weight** | 1px | Subtle, never heavy |
| **Elevation** | Soft, layered shadows | `shadow-2xl` for overlays; avoid hard drop shadows |
| **Glow** | `olo-glow` box-shadow | Signature luminous halo on premium CTAs and active cards |
| **Glass** | `backdrop-blur(20px)` + translucent fill | Used for top bars, overlays, floating elements |

**Shape language:** Generous, rounded corners everywhere — nothing sharp or square. Premium = soft, approachable, modern.

---

## 7. Texture & Pattern

| Element | Usage |
|---|---|
| **Grid pattern** | Subtle olo-tinted grid lines (`grid-pattern` utility) — tech/precision feel |
| **Radial olo** | Soft radial gradient from olo at top — hero backgrounds |
| **Paper texture** | Micro-noise overlay (`paper-texture`) — adds handcrafted warmth to premium surfaces |
| **Blur orbs** | Large, soft, olo-tinted blurred circles — depth and atmosphere in hero sections |

**Rule:** Texture is *felt, not seen* — opacity stays below 5%. It adds soul without distracting.

---

## 8. Motion & Animation

| Animation | Duration | Easing | Purpose |
|---|---|---|---|
| `fade-up` | 0.8s | `cubic-bezier(0.16, 1, 0.3, 1)` | Content reveal on scroll/load |
| `float` | 6s | ease-in-out | Idle floating elements (hero accents) |
| `pulse-glow` | 4s | ease-in-out | Pulsing glow on interactive highlights |
| `scan-line` | 2.2s | ease-in-out | Scanning animation (scan capture) |
| `shimmer` | — | linear | Loading placeholders |
| Route transitions | ~300ms | slide push/pop | Page-to-page navigation |

**Motion principles:**
- Smooth and confident — never bouncy or playful-beyond-restraint.
- Glow pulses are slow and meditative (4s+), not attention-grabbing.
- Reveals use a gentle upward float — content arrives, it doesn't pop.
- Respect `prefers-reduced-motion` where feasible.

---

## 9. Iconography

- **Library:** `lucide-react` only — consistent stroke weight, modern, minimal.
- **Stroke:** 1.5–2px default; sized contextually (16–24px UI, up to 48px hero).
- **Color:** Inherits current text color; accent icons use `text-olo`.
- **Never** mix icon libraries or use filled/emoji icons in primary UI (emoji allowed only in notification/reward copy).

---

## 10. Imagery & Photography

- **Style:** Clean, natural-lit, authentic smiles — never stocky or clinical.
- **Stock source:** Unsplash (valid URLs only).
- **Treatment:** Photos sit on dark teal shells with olo glow accents; never raw on white.
- **3D assets:** Physically-based materials (PBR), clean premium fidelity — smooth continuous gum arches, not discrete root geometry. Medical-aesthetic, not cartoonish.
- **Avoid:** Flash photography look, overly whitened/fake smiles, busy backgrounds.

---

## 11. Layout & Spacing

| Principle | Value |
|---|---|
| **Max content width** | 4xl–5xl (centered) |
| **Section padding** | `py-12 sm:py-16` vertical rhythm |
| **Card padding** | `p-5` to `p-8` |
| **Gap (grids)** | `gap-4` to `gap-6` |
| **Mobile top bar** | `3.5rem + safe-area-inset-top` (notch-safe) |
| **Bottom nav** | Fixed, 5-slot, safe-area-inset-bottom |

**Spacing philosophy:** Generous, breathable whitespace — premium feels *unhurried*. Never cram.

---

## 12. Component Patterns

| Pattern | Spec |
|---|---|
| **Primary CTA** | `bg-olo text-white`, rounded-xl/2xl, `olo-glow` on premium, hover scale-105 |
| **Cards** | `bg-card border border-border rounded-3xl`, hover `border-olo/40` |
| **Pills / badges** | Full rounded, `bg-olo/10 text-olo`, small uppercase |
| **Inputs** | `bg-card border-border rounded-xl`, focus `border-olo` |
| **Active nav** | `text-olo bg-olo/10` |
| **Premium hero card** | `bg-gradient-to-br from-olo-deep to-[#062a30]` + `olo-glow-strong` |

---

## 13. Tone & Copy Guidelines

| Context | Do | Don't |
|---|---|---|
| **Onboarding** | "Let's see that smile." | "Please proceed to scan." |
| **Payment nudge** | "Your next pack is waiting — grab it when you're ready." | "Pay now to continue." |
| **Empty state** | "No scans yet — your first one's free." | "You have 0 records." |
| **Reward unlock** | "You unlocked the Golden Smile trait! ✨" | "Achievement: Golden Smile unlocked." |
| **Error** | "Hmm, that didn't work. Try again?" | "Error 500: Internal Server Error" |
| **Disclaimer** | "teewai is a wellness companion, not a medical device." | (never omit disclaimers) |

**Microcopy rules:**
- Contractions are welcome (you're, let's, that's).
- Sentence case for UI labels; Title Case only for major headings.
- Periods omitted on buttons and labels; used in body sentences.
- Emoji: sparingly, only in celebratory/notification contexts (🎁, ✨, 🎉).

---

## 14. Gamification Visual Language

teewai borrows from competitive gaming (Free Fire-style progression) — keep it energetic but premium:

| Element | Treatment |
|---|---|
| **Ranks / tiers** | Stone I → Stone III naming, MMR-style scores |
| **Progress bars** | `bg-olo` fills on `bg-muted` tracks, rounded-full |
| **Reward reveals** | Glow + fade-up, celebratory but restrained |
| **Streak shields** | Iconic, badge-style, olo-tinted |
| **Leaderboards** | Clean tables, olo highlights for current user |

---

## 15. Accessibility

- **Contrast:** Minimum 4.5:1 for body text; olo on white passes for large text, use olo-deep for small text on light.
- **Touch targets:** Minimum 44×44px (w-11 h-11 standard).
- **Focus:** `ring` uses olo; never remove focus outlines.
- **Motion:** Animations are non-essential; content remains usable without them.
- **Safe areas:** All mobile layouts respect notch / home-indicator insets.

---

## 16. Do's and Don'ts

### ✅ Do
- Lead with olo as the single accent.
- Use Sora for every heading.
- Embrace generous whitespace and rounded corners.
- Add subtle glow to premium moments only.
- Keep copy warm, short, and human.
- Respect the dark-teal shell as the signature environment.

### ❌ Don't
- Introduce competing accent colors (purple, blue, red) for primary actions.
- Use heavy borders, hard shadows, or square corners.
- Stuff the UI — premium means breathing room.
- Use clinical/medical language that implies diagnosis.
- Place olo text on olo backgrounds (low contrast).
- Animate bouncy or aggressively — motion is meditative.

---

## 17. Quick Reference Card

```
FONT:     Sora (headings) · Inter (body) · Fraunces (serif accent)
ACCENT:   olo #00B8A5 · olo-deep #064B49 · olo-glow #00FFE5
SHELL:    Dark teal #061818 (dark) / White (light)
RADIUS:   12px base · 24–32px cards · full pills
VOICE:    Warm, confident, conversational — "your smile, tracked."
MOOD:     Premium · handcrafted · luminous · unhurried
```

---

*This document is the canonical brand reference. When in doubt, defer to it. Update via pull request when the brand evolves.*