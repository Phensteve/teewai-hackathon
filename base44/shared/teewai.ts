// Shared teewai dental-vision prompt + response schema (v4.0).
// Used by the analyzeScan backend function and re-exported by the client lib
// so there is a single source of truth. The proprietary score computation and
// health-level tables stay in the client lib (src/lib/teewaiTeeth.js).

export const TEEWAI_VISION_VERSION = "4.0";

// v4 adds validated clinical indices grounded in dental research:
//   - Silness & Löe Plaque Index (0-3 per surface)
//   - Löe & Silness Gingival Index (0-3) with mild/moderate/severe grading
//   - Basic Erosive Wear Examination (BEWE, 0-3 per sextant, cumulative 0-18)
//   - Periodontal risk from BPE-style screening
//   - DMF (decayed/missing/filled surfaces), calculus, restorations, white-spot demineralization
//   - VITA Classical A1-D4 + VITA Bleached Shades 0M1-0M3 for whitening targets
//   - Professional procedures (scaling/prophylaxis, in-office bleaching, take-home trays, strips, bonding, veneers)
// The prompt is tighter than v3 (less prose) so the model emits fewer tokens and the scan completes faster.

const APPLIANCE_CONTEXT: Record<string, string> = {
  metal_braces: "The user wears METAL BRACES. Note brackets/wires in the photo — do NOT flag them as restorations or foreign objects. Watch for plaque accumulation around brackets, demineralization (white-spot lesions) adjacent to brackets, and gingival inflammation from difficult cleaning. Tailor recommendations to braces-safe oral hygiene (interdental brushes, floss threaders, fluoride rinses) and avoid recommending whitening while active braces are present.",
  ceramic_braces: "The user wears CERAMIC (clear) BRACES. Clear brackets can stain from coffee/tea/curry — note bracket discoloration separately from tooth shade. Watch for plaque around brackets and white-spot lesions. Tailor recommendations to braces-safe hygiene and avoid recommending whitening while active braces are present.",
  lingual_braces: "The user wears LINGUAL BRACES (behind the teeth). Plaque traps on the lingual surfaces are hard to clean — inspect lingual surfaces carefully. Tailor recommendations to braces-safe hygiene and avoid recommending whitening while active braces are present.",
  clear_aligners: "The user wears CLEAR ALIGNERS (e.g. Invisalign). They should remove aligners to eat/drink anything but water. Watch for cavities from drinking sugary drinks with aligners in, and plaque from infrequent cleaning. Whitening is compatible with aligners (can use whitening gel in trays) — note this in recommendations.",
  hawley_retainer: "The user wears a HAWLEY RETAINER (wire + acrylic). It should be removed for eating and cleaned daily. Watch for plaque buildup and shifting if worn inconsistently. Whitening is fine — remove the retainer during whitening sessions.",
  clear_retainer: "The user wears a CLEAR RETAINER (plastic tray). It can stain/warp; avoid hot water and colored drinks while wearing it. Watch for plaque and calculus on the retainer. Whitening is fine — remove the retainer during whitening sessions.",
  fixed_retainer: "The user wears a FIXED (bonded) RETAINER behind the lower front teeth. Plaque traps on the lingual surface — inspect carefully. Whitening is fine but the bonded wire area needs special flossing.",
};

// Full-mouth exam — only for 5-angle scans. Modeled on how a dentist runs a
// comprehensive oral exam: chart by SEXTANT (the unit used by BPE periodontal
// screening and BEWE erosion scoring), check every surface type (buccal,
// lingual/palatal, occlusal), compare sides and arches, screen the bite from
// the lateral views, and call out what the front photo alone could never show.
const FULL_EXAM_PROMPT = `
=== FULL-MOUTH EXAM (5-angle scan only — this is what makes it comprehensive) ===
full_report: a dentist-style comprehensive exam built from ALL 5 photos. Cross-reference angles: confirm a finding when two angles agree, and use the angle that shows a surface best.
- exam_summary (string): 3-5 plain-language sentences summarising the whole mouth, naming the strongest and weakest areas.
- coverage: { teeth_charted (number of distinct teeth assessed across all photos), surfaces_examined[] (subset of "buccal","lingual","palatal","occlusal","incisal","interproximal","gumline"), completeness (0-100: how much of the mouth was readable) }.
- angles[]: one per photo in order front, upper, lower, left, right: { angle, quality (0-100 usability), teeth_visible[] (tooth_ids), key_finding (one sentence, what this angle uniquely revealed), whiteness_score (0-100), health_score (0-100) }. If an angle is unusable, quality < 40 and say why in key_finding.
- sextants[]: exactly 6: "upper_right" (UR4-UR8), "upper_front" (UR3-UL3), "upper_left" (UL4-UL8), "lower_left" (LL4-LL8), "lower_front" (LL3-LR3), "lower_right" (LR4-LR8). Each: { sextant, health_score (0-100), whiteness_score (0-100), gum ("healthy"|"mild"|"moderate"|"severe"), plaque ("none"|"minimal"|"moderate"|"heavy"), wear (BEWE 0-3), finding (one sentence) }.
- symmetry: { left_score, right_score, upper_score, lower_score (0-100 health each), note (one sentence; e.g. more plaque on one side often means brushing favours the dominant hand side, more wear on one side suggests a chewing-side habit) }.
- bite: { midline ("aligned"|"deviated"|"unclear"), crowding ("none"|"mild"|"moderate"|"severe"), spacing ("none"|"mild"|"moderate"|"severe"), overbite ("normal"|"deep"|"open"|"edge_to_edge"|"unclear"), wear_facets (bool: flat shiny facets suggesting grinding), note (one sentence) }. Screening only.
- hidden_findings[]: findings seen ONLY in the upper/lower/left/right photos and invisible from the front: { finding, angle, tooth_id, severity ("mild"|"moderate"|"severe") }. Typical: lingual calculus behind lower incisors, occlusal pit staining or fissure caries on molars, buccal molar plaque, palatal staining, recession on premolars. Empty array if none.
- consensus: { shade_agreement ("high"|"medium"|"low": do the angles agree on shade, i.e. was lighting consistent), note }.
- priorities[]: the 3 most important things to act on, ranked: { title, detail, urgency ("routine"|"soon"|"urgent"), teeth[] }.
The top-level scores and shade must reflect the WHOLE mouth (all sextants), not just the front teeth.
`;

export const buildTeewaiPrompt = (position, isFullScan = false, applianceType?: string) => `You are teewai v${TEEWAI_VISION_VERSION}, a proprietary dental vision AI. ${isFullScan ? `The user submitted 5 intraoral photos of their whole mouth, in this order: (1) front, (2) upper/top, (3) lower, (4) left, (5) right. Analyze ALL 5 photos as ONE composite full-mouth capture and produce a SINGLE unified assessment — not per-photo. De-duplicate findings: a lesion or stain visible in multiple angles is ONE finding. With 5 angles you can see more teeth (molars, lingual surfaces) — classify every visible tooth across all angles.` : `Analyze this REAL teeth photo (${position} view)`}, captured as-is with NO color correction applied — read the true tooth shade from the raw image colors. Extract RAW CLINICAL METRICS and PER-TOOTH CLASSIFICATION only — do NOT compute a final 0-100 whiteness score; our proprietary algorithm does that from your metrics. Be concise and clinical.${applianceType && APPLIANCE_CONTEXT[applianceType] ? `\n\n=== USER APPLIANCE CONTEXT ===\n${APPLIANCE_CONTEXT[applianceType]}\nFactor this into your recommendations, dental_health_issues, and ai_feedback.` : ''}

=== REFERENCE MATERIAL CHECK ===
reference_material_detected (bool): is a VITA shade tab, shade card, or white/gray reference card visible?
reference_material_note (string): if NOT detected, instruct the user to place a plain white index card (or VITA shade tab) next to the teeth in the same lighting for color calibration.
reference_card_rgb ({r,g,b} 0-255, or null): if a white/gray reference card IS visible, report its observed average RGB. This is the white-balance anchor — the card is known neutral, so its measured color reveals the ambient light's cast. Report the RAW observed values (e.g. a white card in warm light reads r:238, g:235, b:218 — NOT corrected to white). null if no card is visible.
When a reference card is visible, USE IT as the white-balance anchor for the VITA shade: compare the tooth's color to the known-neutral card to cancel the ambient lighting and assign the shade from that comparison. Report enamel_luminance_score and yellow_hue_saturation_index as the RAW observed values (what you see in the photo) — the deterministic engine applies the card correction, so do NOT pre-correct those two metrics yourself.

=== VITA SHADE ===
Always assign the most accurate VITA Classical shade (A1-D4) when any tooth is visible and lighting is adequate — never blank in normal conditions. shade = label (e.g. "A1"), shade_code = code. For the whitening target, also assign a VITA Bleached Shade (0M1, 0M2 or 0M3) in whitening_potential_bleached_shade. Only omit shades when needs_another_photo is true.

=== TOOTH-BY-TOOTH CLASSIFICATION ===
Identify EVERY visible tooth in the photo — not just the front six. A typical front-view smile shows 10-14 upper teeth and 8-10 lower teeth. Include premolars and molars visible at the corners of the smile, even if partially visible. For full (5-angle) scans, classify ALL visible teeth across every angle (up to 16 per arch including wisdom teeth if present).
- tooth_id: e.g. "UR1" (upper right central incisor), "UL2", "LL3", "LR6", "UR8" (upper right wisdom tooth). Use UR/UL/LL/LR prefix + position number 1-8 (1=central incisor, 2=lateral incisor, 3=canine, 4=1st premolar, 5=2nd premolar, 6=1st molar, 7=2nd molar, 8=3rd molar/wisdom). Be consistent: always use this exact prefix+number format.
- tooth_type: incisor | canine | premolar | molar
- health_score: 0-100 (100 = perfectly healthy)
- whiteness_score: 0-100 (100 = pure white)
- conditions[]: issues found (e.g. "staining", "plaque", "calculus", "caries", "erosion", "abrasion", "abfraction", "chip", "crack", "crowding", "gap", "rotation", "restoration", "hypoplasia", "fluorosis", "recession", "white_spot_lesion")
- color_segments[]: split each tooth into 1-4 segments. A tooth CAN be multi-color. Each segment: { area: "incisal"|"middle"|"cervical"|"whole", health (one of the 25 levels below), note }.
  Use the health key that best matches the segment's health score:
  pristine(96-100), luminous(92-95), radiant(88-91), excellent(84-87), bright(80-83), very_good(76-79), clear(72-75), gleaming(68-71), good(64-67), decent(60-63), fresh(56-59), fair(52-55), muted(48-51), steady(44-47), mediocre(40-43), dull(36-39), weathered(32-35), poor(28-31), fading(24-27), bad(20-23), stained(16-19), rough(12-15), critical(8-11), harsh(4-7), severe(0-3).
  Prefer smooth transitions: if a tooth is healthier incisally and worse cervically, use 2-3 segments so the gradient blends.

=== STAIN TYPING ===
stain_types[]: likely causes (e.g. "coffee", "tea", "red_wine", "tobacco", "medication_tetracycline", "aging", "plaque", "fluorosis", "calculus").
stain_severity_per_type (object): { "coffee": "mild"|"moderate"|"heavy", ... }

=== SMILE ZONE ===
smile_zone_score (0-100): zone-weighted average of the front 6 teeth (upper centrals + laterals + canines).
smile_zone_shade (string): VITA shade for the smile zone.

=== WHITENING POTENTIAL ===
whitening_potential_score (0-100): realistic target after 4-8 weeks of adherence.
whitening_potential_shade / whitening_potential_shade_code: target VITA Classical shade.
whitening_potential_bleached_shade: target VITA Bleached Shade (0M1-0M3).
weeks_to_potential (number): estimated weeks to reach target with adherence.

=== INSTANT WHITENING FILTER ===
whitening_filter_intensity (0-100): recommended calibrated filter strength for a realistic instant preview. Heavier stains tolerate more without looking fake.
color_temperature: "warm" | "neutral" | "cool" (cool reads whiter/cleaner).

=== SMILE REGION (for whitening preview) ===
smile_bbox: normalized bounding box of the visible teeth/smile area as { x, y, width, height } where each value is 0-1 (fraction of image width/height). x,y is the top-left corner. Cover ALL visible teeth tightly with ~5% padding. This confines the instant whitening preview to the tooth area so lips, gums and skin are never touched. If no teeth are visible, return null.

=== PER-TOOTH WHITENING TARGETS ===
per_tooth_whitening_targets[]: { tooth_id, current_shade, target_shade, weeks }.

=== ZONE-WEIGHTED ENAMEL METRICS (for proprietary scoring) ===
enamel_luminance_score (0-100): zone-weighted (incisors 0.5, canines 0.3, premolars 0.2). Exclude gum tissue, plaque, saliva glare. Calibrate CONSISTENTLY and do NOT undersell healthy teeth: a typical healthy adult smile with no visible staining scores 72-82; notably bright/white teeth 82-92; average slightly-stained 55-72; mildly stained 40-55; heavily stained 20-40. Do not impose a minimum score based on an assumed healthy smile; only use the visible evidence. Be consistent: the same smile under similar lighting should score within ±5 across scans.
yellow_hue_saturation_index (0-100): 0 = pure white (A1), 100 = severely discolored. NATURAL TEETH BASELINE: natural teeth are ivory/off-white (VITA A2-A3), NOT pure white — a natural yellow hue is healthy. Calibrate: bleached 0-5, natural white (A1-A2) 5-20, natural ivory/yellow (A2-A3) 20-35 — this is NATURAL and HEALTHY, do NOT flag as stained, mild staining 35-50, moderate 50-70, heavy 70+. Natural yellow teeth (yellow index 20-35) are healthy — only flag as stained when yellow index > 35 AND there are visible extrinsic stain deposits (coffee/tea/tobacco). A normal smile with natural yellow hue is NOT stained and should score 70-85.
plaque_coverage_percentage (0-100).
stain_density_index (0-100).

=== PLAQUE DETECTION ===
plaque_detection: { present (bool), coverage_percent (0-100): estimated % of visible tooth surfaces coated in plaque biofilm, texture: "biofilm" (soft yellowish film) | "mature" (thicker, opaque) | "calculus" (hardened tartar), locations[]: where it concentrates (e.g. "cervical_margins", "interproximal", "lingual_mandibular_incisors", "buccal_molars"), affected_teeth[]: tooth_ids with visible plaque, severity: "none"|"minimal"|"moderate"|"heavy" }.
Look specifically along the gumline (cervical third), between teeth, and behind the lower front teeth — the classic plaque/calculus sites.

=== CARIES DETECTION ===
caries_detection[]: for each suspicious lesion: { tooth_id, type: "white_spot" (early demineralization, chalky white) | "brown_spot" (darker enamel stain) | "pit_fissure" (occlusal groove decay) | "interproximal" (between teeth) | "root" (root-surface caries near the gumline) | "cavitation" (visible hole/structural loss), severity: "early"|"moderate"|"advanced", location: where on the tooth (e.g. "occlusal","mesial","distal","buccal","lingual","cervical"), confidence: 0-100 }.
Distinguish active caries (opaque white/brown, loss of translucency, structural breakdown) from staining and from hypoplasia/fluorosis. Only report what you can defend from the photo.

=== CLINICAL INDICES (research-validated) ===
plaque_index (0-3): Silness & Löe Plaque Index — 0 no plaque, 1 film only on probe, 2 visible plaque, 3 abundant plaque. Report the scene average.
gingival_index (0-3): Löe & Silness Gingival Index — 0 healthy, 1 mild inflammation, 2 moderate, 3 severe. Report the scene average.
gingival_index_grade: "healthy" | "mild" | "moderate" | "severe".
bewe_score (0-18): Basic Erosive Wear Examination — sum of the most-affected score (0-3) per sextant. 0 no erosion, ≥9 severe.
erosion_risk: "low" | "moderate" | "high".
periodontal_risk: "low" | "moderate" | "high" — from visible gum inflammation, recession, plaque/calculus burden (BPE-style screening; note this is a photo screen, not probing).
calculus_present (bool): visible supragingival calculus/tartar (often near lower front teeth).
restorations_detected[]: visible fillings/crowns/veneers/bridges (describe tooth + material if discernible).
demineralization_white_spots (bool): early white-spot lesions / enamel hypocalcification.
dmf_decayed_surfaces, dmf_missing_surfaces, dmf_filled_surfaces (numbers): visible decayed/missing/filled surfaces estimate from the photo.

=== DENTAL HEALTH SUMMARY ===
gum_health: excellent|good|fair|poor.
plaque_level: none|minimal|moderate|heavy.
enamel_condition (string): erosion, cracks, translucency, abrasion notes.
dental_health_issues[]: specific issues.
dental_health_score (0-100).
gum_health_severity (0-100): numeric severity for the gums where 100 = pristine and 0 = severe. Base on gum_health (excellent~92, good~74, fair~45, poor~20) and refine with gingival_index (higher index lowers it).
plaque_severity (0-100): numeric severity for plaque where 100 = none and 0 = heavy/abundant. Base on plaque_level (none~90, minimal~70, moderate~40, heavy~16) and refine with plaque_index.
enamel_severity (0-100): numeric severity for the enamel where 100 = flawless and 0 = rampant caries / massive structural loss. Base on the enamel_condition text and dental_health_score.

=== RESEARCH-BACKED RECOMMENDATIONS ===
recommendations[]: { title, description, method, frequency, impact (high|medium|low) } — evidence-based home and professional methods. VARY the impact: include at least one high-impact AND at least one low-impact recommendation; never set every recommendation to the same impact.
procedures[]: professional procedures worth discussing with a dentist: { name, category (e.g. "cleaning","bleaching","restorative","cosmetic"), reason, timing, professional (bool true) } — e.g. scaling & prophylaxis, in-office bleaching, take-home custom trays, whitening strips, microabrasion, composite bonding, veneers. Keep educational; advise a dentist visit.
Recommend REAL products (actual brand names from your training knowledge of common dental whitening products — e.g. Crest, Colgate, Sensodyne, Oral-B, Philips Sonicare, Opalescence, Glo, Snow): products[]: { name, category, active_ingredient, price_range, why, where_to_buy, budget_tier (budget|mid|premium) }. SPREAD the budget tiers: include at least one budget AND at least one premium option whenever clinically reasonable; never default every product to mid.

=== AI FEEDBACK ===
ai_feedback (string): 1-2 encouraging sentences summarizing what you saw and the top next step.
${isFullScan ? FULL_EXAM_PROMPT : ''}
=== EVIDENCE AND QUALITY RULES (override any conflicting instruction above) ===
This is a photo-based wellness screen, NOT a clinical examination. First verify that real human teeth inside a mouth are visible, rather than a tooth model, illustration, screen, white object or empty frame. Set needs_another_photo=true for no readable teeth, severe blur, clipped glare, obstructed surfaces or insufficient resolution. For five-angle scans, if any requested view is unreadable, needs_another_photo=true and name that view in ai_feedback. On rejection omit all scores, metrics, products and findings; return empty tooth_analysis and explain how to retake in ai_feedback.
Do not reject naturally yellow, stained, restored or braced teeth simply because they are not white. Do not require a fixed number of teeth. Only chart clearly distinguishable visible teeth; do not invent molars or label an unseen tooth missing. A dark fissure is not automatically decay; reflections, shadows, stains and restorations are alternatives. Describe suspected lesions as possible findings requiring dentist confirmation, never confirmed active decay from a photograph alone.
Do not infer probing depths, bleeding on probing, bone loss, lesion depth, vitality, activity of decay or microscopic deposits. Omit non-observable clinical indices rather than inventing a normal zero. Restrict summaries to visible surfaces; state that hidden/interproximal decay and gum disease cannot be excluded. Unseen sextants must not receive invented normal scores; note 'not assessable' and omit their numeric metrics. VITA shade and whitening outcomes are approximate; do not guarantee an exact shade or treatment timeline.
A known neutral card can support white balance, but a VITA tab, enamel, clothing or highlights are NOT a neutral white/gray card. Return reference_card_rgb only for an actual neutral reference, with observed values; do not claim to measure color precisely by visual guessing. Natural shade and scene lighting are confounded. Never infer coffee, tea, tobacco or medication as the cause of staining from color alone; prefer nonspecific surface staining unless user history confirms the cause.
Return JSON matching the schema.`;

export const TEEWAI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reference_material_detected: { type: "boolean" },
    reference_material_note: { type: "string" },
    reference_card_rgb: {
      type: "object",
      description: "Observed average RGB (0-255) of the white/gray reference card if visible. null if no card.",
      properties: { r: { type: "number" }, g: { type: "number" }, b: { type: "number" } },
    },
    tooth_analysis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tooth_id: { type: "string" },
          tooth_type: { type: "string" },
          health_score: { type: "number" },
          whiteness_score: { type: "number", description: "0-100. Calibrate: A1 shade ≈ 78-88, A2 ≈ 65-78, A3 ≈ 48-62, B1 ≈ 72-82, B2 ≈ 55-68. Healthy natural teeth score 55-88. Only score below 45 when teeth are visibly yellowed or heavily stained." },
          conditions: { type: "array", items: { type: "string" } },
          color_segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                health: { type: "string" },
                note: { type: "string" },
              },
            },
          },
        },
      },
    },
    stain_types: { type: "array", items: { type: "string" } },
    stain_severity_per_type: { type: "object" },
    smile_zone_score: { type: "number" },
    smile_zone_shade: { type: "string" },
    whitening_potential_score: { type: "number" },
    whitening_potential_shade: { type: "string" },
    whitening_potential_shade_code: { type: "string" },
    whitening_potential_bleached_shade: { type: "string" },
    weeks_to_potential: { type: "number" },
    whitening_filter_intensity: { type: "number" },
    color_temperature: { type: "string" },
    smile_bbox: {
      type: "object",
      properties: {
        x: { type: "number", description: "0-1 fraction of image width (top-left)" },
        y: { type: "number", description: "0-1 fraction of image height (top-left)" },
        width: { type: "number", description: "0-1 fraction of image width" },
        height: { type: "number", description: "0-1 fraction of image height" },
      },
    },
    per_tooth_whitening_targets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tooth_id: { type: "string" },
          current_shade: { type: "string" },
          target_shade: { type: "string" },
          weeks: { type: "number" },
        },
      },
    },
    enamel_luminance_score: { type: "number" },
    yellow_hue_saturation_index: { type: "number" },
    plaque_coverage_percentage: { type: "number" },
    stain_density_index: { type: "number" },
    plaque_index: { type: "number" },
    gingival_index: { type: "number" },
    gingival_index_grade: { type: "string" },
    bewe_score: { type: "number" },
    erosion_risk: { type: "string" },
    periodontal_risk: { type: "string" },
    calculus_present: { type: "boolean" },
    restorations_detected: { type: "array", items: { type: "string" } },
    plaque_detection: { type: "object", properties: { present: { type: "boolean" }, coverage_percent: { type: "number" }, texture: { type: "string" }, locations: { type: "array", items: { type: "string" } }, affected_teeth: { type: "array", items: { type: "string" } }, severity: { type: "string" } } },
    caries_detection: { type: "array", items: { type: "object", properties: { tooth_id: { type: "string" }, type: { type: "string" }, severity: { type: "string" }, location: { type: "string" }, confidence: { type: "number" } } } },
    demineralization_white_spots: { type: "boolean" },
    dmf_decayed_surfaces: { type: "number" },
    dmf_missing_surfaces: { type: "number" },
    dmf_filled_surfaces: { type: "number" },
    shade: { type: "string" },
    shade_code: { type: "string" },
    brightness: { type: "number" },
    stains_detected: { type: "array", items: { type: "string" } },
    dental_health_score: { type: "number" },
    gum_health: { type: "string" },
    gum_health_severity: { type: "number" },
    plaque_level: { type: "string" },
    plaque_severity: { type: "number" },
    enamel_condition: { type: "string" },
    enamel_severity: { type: "number" },
    dental_health_issues: { type: "array", items: { type: "string" } },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          method: { type: "string" },
          frequency: { type: "string" },
          impact: { type: "string" },
        },
      },
    },
    procedures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          reason: { type: "string" },
          timing: { type: "string" },
          professional: { type: "boolean" },
        },
      },
    },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          active_ingredient: { type: "string" },
          price_range: { type: "string" },
          why: { type: "string" },
          where_to_buy: { type: "string" },
          budget_tier: { type: "string" },
        },
      },
    },
    needs_another_photo: { type: "boolean" },
    ai_feedback: { type: "string" },
  },
};

const str = { type: "string" };
const num = { type: "number" };
const strArr = { type: "array", items: str };
const FULL_REPORT_SCHEMA = {
  type: "object",
  properties: {
    exam_summary: str,
    coverage: { type: "object", properties: { teeth_charted: num, surfaces_examined: strArr, completeness: num } },
    angles: { type: "array", items: { type: "object", properties: { angle: str, quality: num, teeth_visible: strArr, key_finding: str, whiteness_score: num, health_score: num } } },
    sextants: { type: "array", items: { type: "object", properties: { sextant: str, health_score: num, whiteness_score: num, gum: str, plaque: str, wear: num, finding: str } } },
    symmetry: { type: "object", properties: { left_score: num, right_score: num, upper_score: num, lower_score: num, note: str } },
    bite: { type: "object", properties: { midline: str, crowding: str, spacing: str, overbite: str, wear_facets: { type: "boolean" }, note: str } },
    hidden_findings: { type: "array", items: { type: "object", properties: { finding: str, angle: str, tooth_id: str, severity: str } } },
    consensus: { type: "object", properties: { shade_agreement: str, note: str } },
    priorities: { type: "array", items: { type: "object", properties: { title: str, detail: str, urgency: str, teeth: strArr } } },
  },
};

// Full (5-angle) scans use the base schema plus the comprehensive exam.
export const TEEWAI_FULL_RESPONSE_SCHEMA = {
  ...TEEWAI_RESPONSE_SCHEMA,
  properties: { ...TEEWAI_RESPONSE_SCHEMA.properties, full_report: FULL_REPORT_SCHEMA },
};

// ─────────────────────────────────────────────────────────────────────────
// BRACES CHECK — orthodontic alignment screening prompt + schema.
// A focused, distinct analysis from the whitening/health scan: it assesses
// tooth alignment, crowding, spacing, bite, and whether a consult is worth it.
// ─────────────────────────────────────────────────────────────────────────
export const buildBracesPrompt = (position) => `You are teewai ortho-screen, a dental vision AI that assesses tooth ALIGNMENT from a photo. Analyze this REAL teeth photo (${position} view). Assess orthodontic alignment only — crowding, spacing, bite, rotations, midline. Be concise and clinical. This is a screening aid, not a diagnosis.

=== ALIGNMENT SCORE ===
alignment_score (0-100): 100 = perfectly aligned, 50 = moderate issues, 0 = severe malocclusion. Base on visible crowding, spacing, rotation, and bite.

=== ISSUES ===
issues[]: each visible alignment issue: { issue: "crowding"|"spacing"|"overbite"|"overjet"|"crossbite"|"open_bite"|"midline_deviation"|"rotation"|"impacted"|"missing"|"ectopic", severity: "mild"|"moderate"|"severe", teeth[]: affected tooth_ids (e.g. "UR1"), note: short clinical description }.
Only report what you can defend from the photo.

=== RECOMMENDATION ===
recommendation_level: "none"|"mild"|"moderate"|"severe".
summary (string): 1-2 plain-language sentences explaining whether the person would benefit from braces/aligners and why.
see_orthodontist (bool): true if a professional orthodontic consult is worthwhile.

=== TREATMENT OPTIONS ===
treatment_options[]: { name, description, estimated_duration (e.g. "6-12 months"), complexity: "mild"|"moderate"|"complex" }. Suggest realistic options (clear aligners, fixed braces, etc.) based on severity. Keep educational.

=== RETAINER ASSESSMENT ===
retainer_note (string): If alignment is good (recommendation_level "none") but there are signs the person previously had orthodontic work (e.g. mild relapse, slight crowding returning, or a bonded retainer wire visible), advise whether a retainer could help maintain their current alignment. If alignment is already poor, note that a retainer alone won't correct it — braces/aligners are needed first, then a retainer to hold the result. 1-2 plain-language sentences.

=== PHOTO QUALITY ===
needs_another_photo (bool): true if real human teeth cannot be read clearly due to blur, occlusion, darkness, clipped glare or inadequate resolution, or the image is a model/illustration/unrelated object. In that case explain the retake in summary and omit scores and findings. Do not infer impacted or missing teeth from unseen regions, or diagnose bite relationships when the bite is not shown.

Return JSON matching the schema.`;

export const BRACES_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    alignment_score: { type: "number" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          issue: { type: "string" },
          severity: { type: "string" },
          teeth: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
      },
    },
    recommendation_level: { type: "string" },
    summary: { type: "string" },
    see_orthodontist: { type: "boolean" },
    retainer_note: { type: "string" },
    treatment_options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          estimated_duration: { type: "string" },
          complexity: { type: "string" },
        },
      },
    },
    needs_another_photo: { type: "boolean" },
  },
};