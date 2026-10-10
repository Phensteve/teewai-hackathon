# teewai — Scan Algorithm & Dental Intelligence Core

A technical reference for how a teewai scan turns a phone photo into a
calibrated, clinically-grounded dental report. Written so a founder or
engineer can explain the two-layer architecture — the AI vision layer and the
deterministic `unrufldteeth` engine — and why teewai's scores are defensible,
consistent, and fast.

---

## 1. The two-layer architecture

teewai's scan is **not** "send the photo to an AI and show whatever it says."
It is a deliberate two-layer system:

```
   ┌─────────────────────────────────────────────────────────────┐
   │  LAYER 1 — AI VISION (extracts raw clinical metrics)        │
   │  base44/functions/analyzeScan + base44/shared/teewai.ts      │
   │  Gemini 3 Flash (vision) + structured JSON schema           │
   └──────────────────────────┬──────────────────────────────────┘
                              │  raw metrics (luminance, yellow index,
                              │  plaque %, per-tooth scores, indices…)
   ┌──────────────────────────▼──────────────────────────────────┐
   │  LAYER 2 — DETERMINISTIC ENGINE (computes final scores)     │
   │  src/lib/unrufldteeth.js + src/lib/teewaiTeeth.js           │
   │  Pure functions, no AI, no side effects, portable           │
   └──────────────────────────┬──────────────────────────────────┘
                              │  final calibrated whiteness score,
                              │  VITA shade, health grade, plan…
                              ▼
                          Results page
```

**Why two layers?**

- **Defensibility (the moat):** anyone can call Gemini. teewai's value is the
  calibrated, deterministic layer that turns a raw photo into a clinically
  grounded, gamified journey. That layer is pure, documented, and portable.
- **Consistency:** the AI is asked to *extract* raw metrics (luminance, yellow
  index, plaque coverage), not to *judge* a final score. The final 0-100 score
  is computed by fixed math, so the same smile scores the same across scans —
  the AI's natural variance is absorbed by the deterministic formula.
- **Auditability:** every score can be traced back to the raw metrics the AI
  emitted and the formula that combined them. Nothing is a black-box "the AI
  said 73."
- **Speed:** a fast client-side pre-read (`fastEstimate`) gives the user a
  preliminary number within ~100ms, before the AI even returns.

---

## 2. Layer 1 — The AI vision system

### 2.1 The backend function — `base44/functions/analyzeScan/entry.ts`

A Deno edge function (`Deno.serve`) that:

1. Authenticates the user (`base44.auth.me()`).
2. Calls `base44.integrations.Core.InvokeLLM` with:
   - **`model: "gemini_3_flash"`** — Google's multimodal vision model. Chosen
     for speed (the scan completes in seconds, not the 40-50s of heavier models).
   - **`file_urls: [file_url]`** — the uploaded teeth photo, passed as a
     vision input.
   - **`add_context_from_internet: true`** — enables web search so the model
     can recommend *real, current* products (actual brand names, prices,
     retailers) rather than hallucinating from training data.
   - **`response_json_schema: TEEWAI_RESPONSE_SCHEMA`** — forces the model to
     return structured JSON matching the schema, not free text.
   - **`prompt: buildTeewaiPrompt(position)`** — the clinical prompt (below).
3. Returns the structured result to the client.

The function runs server-side because the analysis is heavy and exceeds the
client fetch window; backend functions have a 5-minute execution limit so the
long call completes reliably.

A `mode === "braces"` branch runs a separate orthodontic alignment prompt
(`buildBracesPrompt`) that skips web search (no product research needed) for a
faster braces check.

### 2.2 The prompt — `base44/shared/teewai.ts` (`buildTeewaiPrompt`)

The prompt is the clinical specification. It tells the AI it is "teewai v4.0, a
proprietary dental vision AI" analyzing a photo "already normalized with an
ITK-inspired pipeline (gray-world white balance + histogram stretch)." It then
demands **raw clinical metrics only** — explicitly instructing the model *not*
to compute a final whiteness score ("our proprietary algorithm does that from
your metrics").

The prompt is organized into sections, each mapping to a part of the response
schema:

- **Reference material check** — is a VITA shade tab or white card visible?
  (drives the calibration-confidence warning on the results page)
- **VITA shade** — assign the most accurate VITA Classical shade (A1-D4) plus a
  VITA Bleached shade (0M1-0M3) for the whitening target.
- **Tooth-by-tooth classification** — for each visible tooth: id (FDI-style,
  e.g. "UR1"), type (incisor/canine/premolar/molar), health score, whiteness
  score, conditions, and 1-4 **color segments** (incisal/middle/cervical/whole)
  each tagged with one of 25 granular health levels.
- **Stain typing** — likely causes (coffee, tea, tobacco, etc.) with per-type
  severity.
- **Smile zone** — zone-weighted score for the front 6 teeth.
- **Whitening potential** — realistic target after 4-8 weeks, target shade,
  weeks to reach it.
- **Instant whitening filter** — recommended calibrated filter intensity +
  color temperature.
- **Per-tooth whitening targets** — current → target shade per tooth.
- **Zone-weighted enamel metrics** — `enamel_luminance_score`,
  `yellow_hue_saturation_index`, `plaque_coverage_percentage`,
  `stain_density_index`. These are the inputs to the proprietary score. The
  prompt includes explicit calibration anchors (e.g. "a typical healthy adult
  smile scores 72-82") so the model doesn't undersell healthy teeth.
- **Plaque detection** — coverage %, texture (biofilm/mature/calculus),
  locations, affected teeth.
- **Caries detection** — per-lesion: type (white_spot, brown_spot,
  pit_fissure, interproximal, root, cavitation), severity, location,
  confidence.
- **Clinical indices** — research-validated scales: Silness & Löe Plaque
  Index, Löe & Silness Gingival Index, BEWE erosion score, periodontal risk,
  DMF surfaces, calculus, restorations, white-spot demineralization.
- **Recommendations, procedures, products** — evidence-based methods,
  professional procedures, and real product recommendations (via web search)
  with spread budget tiers.
- **AI feedback** — 1-2 encouraging sentences.

### 2.3 The response schema — `TEEWAI_RESPONSE_SCHEMA`

A JSON Schema object that `InvokeLLM` uses to constrain the model's output to
exactly these fields. This is what makes the result machine-readable — the
client never parses free text. Every field the deterministic engine needs
(luminance, yellow index, plaque %, per-tooth scores, clinical indices) is a
typed property in the schema.

### 2.4 The braces check — `buildBracesPrompt` / `BRACES_RESPONSE_SCHEMA`

A focused orthodontic alignment screening: alignment score, per-issue
crowding/spacing/bite/rotation detection, recommendation level, treatment
options. It's a distinct analysis from the whitening/health scan, with its own
schema, and skips web search for speed.

---

## 3. Layer 2 — The deterministic engine (`unrufldteeth`)

`src/lib/unrufldteeth.js` — teewai's proprietary dental intelligence core.
Pure functions, no PII, no side effects, portable across runtimes. This is the
moat.

### 3.1 Engine involvement: before & after the AI

The engine runs at two points:

- **`preAnalyze(file)` — BEFORE the AI.** Pure client-side pre-analysis. Loads
  the image into a tiny canvas, computes width/height/brightness, and flags
  unusable photos (too dark `< 45`, overexposed `> 235`). No model call — just
  image-derived signals so the engine can calibrate (and later short-circuit
  bad photos). Keeps teewai fast.
- **`postProcess(result, preContext)` — AFTER the AI.** Wraps the live scoring
  (`computeProprietaryScore`) and plaque/caries reconciliation so the engine
  owns the final calibrated numbers.

### 3.2 The proprietary score — `computeProprietaryScore` (in `teewaiTeeth.js`)

This is the single most important function. The AI emits four raw metrics; the
engine combines them into the final 0-100 whiteness score:

```
score = luminance
      - (yellowIndex × 0.35)
      - (plaquePenalty × 0.12)
      - (stainDensity × 0.08)
```

- **`enamel_luminance_score`** (0-100) is the primary driver — it's already
  AI-calibrated and zone-weighted (incisors 0.5, canines 0.3, premolars 0.2).
- **`yellow_hue_saturation_index`**, **`plaque_coverage_percentage`**, and
  **`stain_density_index`** subtract from it, weighted by clinical importance
  (yellow discoloration matters most for *whiteness*, so it's weighted 0.35).

Key engineering detail: the defaults use `??` (nullish coalescing), not `||`,
so a true `0` ("no yellow," "no plaque") is honored instead of being replaced
by the fallback — otherwise perfectly white teeth were penalized by the
default yellow/plaque values, capping everyone's score low. The formula lets
healthy white teeth (high luminance, low yellow) land in the 75-90 range,
while stained teeth fall low.

### 3.3 Shade mapping — `shadeFromScore`

Maps the 0-100 score to a **VITA Classical** shade (A1-D4), the global dental
shade standard. 80+ → A1 (whitest natural), 70+ → A2, down to C4 (most
discolored). Used as a fallback when the AI omits the shade.

### 3.4 Clinical-index interpretation

The engine translates the AI's coarse enums into numeric severities grounded
in the validated indices:

- **`resolveGumSeverity`** — maps `gum_health` (excellent/good/fair/poor) to a
  0-100 severity, refined by the Löe-Silness Gingival Index.
- **`resolvePlaqueSeverity`** — maps `plaque_level` to severity, refined by
  the Silness-Löe Plaque Index.
- **`resolveEnamelSeverity`** — keyword-matches the `enamel_condition` text
  (e.g. "caries" → 30, "erosion" → 40, "mild" → 65).
- **`issueSeverity`** — keyword-matches dental health issue text to a severity.

### 3.5 ICDAS caries mapping — `icdasFromLesion` / `icdasLabel`

Translates the AI's lesion type/severity into the validated **International
Caries Detection & Assessment System** 0-6 code (0 = sound, 6 = extensive
distinct cavity). This raises caries detail from a coarse enum to a
research-grade grade.

### 3.6 Plaque/caries reconciliation — `reconcilePlaqueCaries`

Cross-checks the AI's structured detection against the emitted clinical
indices and flags inconsistencies (e.g. "high plaque coverage but zero plaque
index," "advanced lesion present but DMF-decayed count is zero"). This is how
the deterministic layer trusts — or corrects — the AI output.

### 3.7 Severity palette & whiteness color

- **`SEVERITY_PALETTE`** — a 10-band color system (100 = pristine green → 0 =
  severe deep red) used across the UI for gum, plaque, enamel, and issue
  severity bars.
- **`whitenessColor`** — a 7-stop gradient (white → stained brown) used to
  color the 3D teeth in "shade" view.

### 3.8 Output diversification

- **`diversifyImpacts`** — if the AI returned uniform recommendation impacts
  (e.g. all "medium"), rotates a high/medium/low spread so the plan never reads
  "all medium."
- **`diversifyTiers`** — same for product budget tiers (budget/mid/premium).

### 3.9 The 3D mockup bridge — `buildMockupArch`

Maps the AI's `tooth_analysis` array to render-ready 3D teeth (see
`TEETH_3D_ARCHITECTURE.md`). Each tooth gets a type, arch, side, position,
color (health or shade), and transform offsets derived from detected
conditions (rotation, crowding, gaps, crossbite). This is the bridge between
the scan data and the 3D Results visual.

### 3.10 Fast client-side estimate — `fastEstimate`

A preliminary whiteness reading from pure canvas math, available within ~100ms
of capture (before the AI returns). It loads the image into a 48×48 canvas,
isolates tooth-like pixels (bright + low saturation), computes average
luminance and yellow tint, and derives a whiteness proxy + VITA shade. It is
**not** the final score — the AI + proprietary scoring own that — but it gives
the user an instant ballpark so the wait feels shorter.

### 3.11 Feature registry

A `FEATURE_REGISTRY` object — the single source of truth for what the engine
can do. `live` features run in the app (calibrated scoring, VITA mapping,
severity grading, clinical indices, ICDAS, reconciliation). `dormant` features
are stored for upcoming releases (3D gingival mapping, caries depth
estimation, plaque timelapse, shade aging curve, bruxism screen) and are
never executed by the live app. Add a feature here first; promote to `live`
only after review.

### 3.12 Research grounding

The engine's knowledge base references validated frameworks (references only,
not user-facing): Silness & Löe Plaque Index, Löe & Silness Gingival Index,
Basic Erosive Wear Examination (BEWE), DMF Index, ICDAS, VITA Classical &
Bleached shade guides. These are encoded in `CLINICAL_FRAMEWORKS` and used to
interpret the AI's raw output.

---

## 4. The vision pipeline — `src/lib/teewaiVision.js`

ITK-inspired (Insight Toolkit) image preprocessing, ported to a lightweight
canvas pipeline. Pure `ImageData` math, no external deps. Used by the
before/after whitening slider and the instant preview.

### 4.1 Gray-world white balance — `grayWorldWhiteBalance`

Estimates the scene's average color and shifts each channel toward neutral
gray, correcting warm/cool lighting casts so teeth read their true shade. This
is why a photo taken under a yellow lamp doesn't score as "yellow teeth."

### 4.2 Histogram stretch — `histogramStretch`

Stretches the luminance histogram to fill the [2%, 98%] percentiles, recovering
detail lost to under/over-exposure. Standard contrast normalization.

### 4.3 Calibrated whitening — `calibrateWhitening` (HSV-targeted)

This is how real teeth-whitening photo apps work, implemented as pure pixel
math:

1. **Segment the teeth** — in HSV space, teeth are high Value (bright), low
   Saturation, and NOT the saturated red/pink of gums and lips (hue 340°→20°
   with real saturation is excluded). A crude luminance mask would whiten skin
   highlights too; the HSV mask targets enamel only.
2. **Desaturate the yellow channel** — tooth discoloration lives in the
   yellow/orange hue band (~30-75°). Saturation is reduced there, weighted by
   how yellow the pixel is — this removes the "yellow" without painting teeth
   flat white.
3. **Lift Value (brightness)** toward a natural enamel target (~0.82-0.94),
   never to pure #FFFFFF (which looks like chalk/paint).
4. **Leave gums, lips, and skin untouched** — the mask excludes saturated reds.

### 4.4 The full pipeline — `applyTeewaiPipeline` / `processImageToDataURL`

`white-balance → histogram stretch → calibrated whitening`, then exported as a
data URL for an `<img>` tag. This is what the before/after slider uses — a
deterministic edit of the user's real photo, not an AI-generated image.

---

## 5. End-to-end data flow

```
1. Capture / upload photo
2. preAnalyze(file)          ← client-side brightness/usable check
3. fastEstimate(url)         ← instant preliminary whiteness (shown in UI)
4. UploadFile → file_url
5. analyzeScan(file_url)     ← backend: Gemini 3 Flash + web search
   │  buildTeewaiPrompt → TEEWAI_RESPONSE_SCHEMA
   └→ raw clinical metrics (JSON)
6. postProcess(result)       ← deterministic engine
   │  computeProprietaryScore → final 0-100 whiteness
   │  shadeFromScore → VITA shade
   │  resolveGumSeverity / resolvePlaqueSeverity / resolveEnamelSeverity
   │  reconcilePlaqueCaries → ICDAS + consistency flags
   │  diversifyImpacts / diversifyTiers → plan spread
   └→ calibrated, gamified report
7. Persist Scan entity + update UserProgress (MMR, XP, streaks)
8. Render Results page
   │  ScoreCircle (whiteness + health)
   │  ToothMap (per-tooth analysis)
   │  TeethMockup3D (buildMockupArch → 3D arch, clickable)
   │  BeforeAfterSlider (teewaiVision pipeline)
   │  Recommendations + Products + PlanBuilder
   └→ user sees their smile, scored and explained
```

---

## 6. Key concepts for meetings

- **Two-layer architecture** — AI extracts, engine scores. The score is
  deterministic and auditable, not a black-box LLM judgment.
- **Structured output** — `response_json_schema` forces the model into typed
  JSON, so the engine consumes machine-readable fields, never free text.
- **Research-validated indices** — Silness-Löe, Löe-Silness, BEWE, DMF, ICDAS,
  VITA Classical & Bleached. The engine interprets the AI's output against
  these, not invented scales.
- **ITK-inspired normalization** — gray-world white balance + histogram
  stretch calibrate the image before the AI sees it, so color readings are
  lighting-robust.
- **HSV-targeted whitening** — the before/after preview isolates teeth and
  desaturates the yellow channel, the way real whitening photo apps work —
  not AI image generation.
- **Pure, portable engine** — `unrufldteeth` has no PII, no side effects, no
  runtime coupling. It runs identically client-side and server-side and can
  be transferred to another repo without modification.
- **Feature registry** — a live/dormant split that documents what the engine
  does today and what it's designed to do next, without shipping unfinished
  features.

---

## 7. Why this design

1. **The moat is the engine, not the model.** Anyone can call Gemini. The
   calibrated, deterministic, research-grounded layer that turns a photo into
   a clinically defensible, gamified journey is teewai's defensibility.
2. **Consistency over charisma.** A raw LLM "score" varies call to call. A
   fixed formula over extracted metrics is reproducible — the same smile
   scores the same, which is what a health-tracking app needs.
3. **Speed where it matters.** `fastEstimate` gives an instant number;
   `gemini_3_flash` keeps the full analysis in seconds; the braces check skips
   web search entirely.
4. **Auditability.** Every final score traces to the raw metrics the AI
   emitted and the formula that combined them — no unexplainable numbers.