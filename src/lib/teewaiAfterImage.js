// Generates a realistic, AI-rendered "after" teeth-whitening preview from the
// user's real scan photo — replacing the old canvas filter. The original photo
// is passed as a reference so the regenerated smile keeps the same face, lips,
// gums and lighting; only tooth color/brightness moves toward the target shade.
// Falls back to the ITK canvas pipeline (teewaiVision) if generation fails.

import { unrufld } from '@/api/unrufldClient';

export async function generateWhiteningAfter(imageUrl, { targetShade, intensity } = {}) {
  const shade = targetShade || 'A1';
  const strength = intensity ?? 55;
  // Repigmentation prompt, modelled on how dedicated AI whitening apps work:
  // the enamel is REPAINTED to a new shade (yellow/grey pigment removed, hue
  // shifted toward neutral white) rather than merely brightened/exposed, which
  // is what made earlier previews look like a lamp had been pointed at the mouth.
  const prompt = [
    `Photorealistic "after" professional teeth-whitening result, edited from the provided photo.`,
    `Repaint the enamel of every visible tooth to VITA shade ${shade}: remove the yellow, brown, grey and beige pigment from the tooth surface and replace it with a clean, neutral, slightly cool white — a true change of tooth COLOR, not a brightness or exposure change.`,
    `Do NOT add light, glow, highlights, bloom, flash or HDR. Do not raise overall image exposure or contrast. The lighting, shadows and reflections on the face must be pixel-identical to the original — only the pigment of the teeth changes.`,
    `Neutralise intrinsic discoloration and surface stains (coffee, tea, tobacco, wine), lift dark interdental shadows slightly, and even out the shade across all teeth so no tooth stays noticeably darker than its neighbours.`,
    `Whitening strength ${strength}/100 — a bright, healthy natural white with real enamel depth. Never flat chalk-white, never pure #FFFFFF, never opaque paint.`,
    `Preserve exactly: the same face, lips, tongue, gums, gum colour, skin tone, hair, background, framing and camera angle; each tooth's shape, size, position, alignment, gaps, chips, existing restorations, natural surface texture and translucent incisal edges.`,
    `Keep the teeth masked precisely — no whitening spill onto the lips, gums or skin.`,
    `The result must read as an untouched photograph of the same person after real whitening treatment, not a sticker, filter or overexposed patch.`,
  ].join(' ');
  try {
    const res = await unrufld.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: [imageUrl],
    });
    return res?.url || null;
  } catch {
    return null;
  }
}