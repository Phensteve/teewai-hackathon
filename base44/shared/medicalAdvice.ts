// Medical-advice detector for the Common Room. Non-verified users may share
// experiences but not diagnose or prescribe; teewai auto-flags anything that
// looks like clinical diagnosis or treatment recommendation so a medical
// admin can review it. Heuristic (regex) by design — false positives are
// expected and handled by the dispute flow, so the patterns err toward
// catching real advice rather than staying silent.
//
// Categories:
//   - diagnosis:   "you have a cavity", "this looks like gingivitis"
//   - treatment:   "you should use chlorhexidine", "take amoxicillin"
//   - prescription:"I can prescribe", "your dosage"
//   - definitive:  "this will cure your decay", "diagnosing your..."

export interface MedicalAdviceMatch {
  detected: boolean;
  reason: string;
  matched?: string;
}

const PATTERNS: { reason: string; re: RegExp }[] = [
  {
    reason: "clinical diagnosis",
    re: /\b(you have|you'?ve got|this is|that is|it'?s|looks like|sounds like|seems like|appears to be)\s+(a|an|the|like)?\s*(cavity|cavities|tooth decay|decay|gingivitis|periodontitis|periodontal disease|abscess|infection|plaque|tartar|calculus|oral cancer|lesion|erosion|recession|caries|thrush|halitosis)\b/i,
  },
  {
    reason: "treatment recommendation",
    re: /\b(you (should|need to|must|have to|ought to)|try (using|taking|applying)|take|use|apply|swish with|rinse with|brush with|start (on|using))\s+[^\n.]{0,50}(antibiotics?|fluoride|peroxide|hydrogen peroxide|chlorhexidine|mouthwash|gel|tray|strips?|medication|painkiller|ibuprofen|amoxicillin|paracetamol|clove oil|baking soda|hydrogen)\b/i,
  },
  {
    reason: "prescription language",
    re: /\b(i (can|could|will) prescrib|prescrib\w*|your dosage|dose of|mg of|refill your)\b/i,
  },
  {
    reason: "definitive clinical claim",
    re: /\b(diagnos\w+ your|treat\w* your (decay|cavity|gingivitis)|cure your|will (fix|heal|cure|whiten) your (teeth|gums|decay)|guaranteed to (fix|heal|cure|whiten))\b/i,
  },
];

export function detectMedicalAdvice(text: string): MedicalAdviceMatch {
  if (!text || typeof text !== "string") return { detected: false, reason: "" };
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) return { detected: true, reason: p.reason, matched: m[0].trim() };
  }
  return { detected: false, reason: "" };
}