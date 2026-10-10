// Checkmarks follow completed work, never estimated processing timers.
// Minimum dwell times only keep quick milestones readable; slow work owns its duration.
export function createScanProgress(onStep, stages) {
  let current = 0;
  let started = performance.now();
  onStep(0);
  const advance = async (index) => {
    if (index !== current) {
      const minimum = stages[current]?.minMs ?? [1000, 1300, 900, 1400, 1100, 800][current] ?? 900;
      const remaining = minimum - (performance.now() - started);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      current = index;
      started = performance.now();
      onStep(index);
    }
    // Yield a frame before CPU-heavy image work so the active stage can paint.
    await new Promise((resolve) => setTimeout(resolve, 32));
  };
  return {
    advance,
    async finish() {
      await advance(stages.length);
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
  };
}

export const FOOD_SCAN_STAGES = [
  { label: 'Preparing your photo', desc: 'Checking scan access and compressing the image', minMs: 1000 },
  { label: 'Uploading for analysis', desc: 'Sending the prepared image to the scan engine', minMs: 800 },
  { label: 'Identifying food & nutrition', desc: 'Recognizing items, portions, calories and macros', minMs: 1700 },
  { label: 'Resolving stain chemistry', desc: 'Checking saved foods, the catalog and new-food research', minMs: 1200 },
  { label: 'Cross-checking photo colors', desc: 'Comparing stain scores with measured food pixels', minMs: 1400 },
  { label: 'Saving your food log', desc: 'Recording identified items and updating your account', minMs: 900 },
];

export const TEETH_SCAN_STAGES = [
  { label: 'Preparing your scan', desc: 'Checking scan access and preparing the photos', minMs: 1100 },
  { label: 'Uploading scan photos', desc: 'Sending your captured angles for analysis', minMs: 850 },
  { label: 'Analyzing your teeth', desc: 'Assessing shade, visible dental health and your care plan', minMs: 1800 },
  { label: 'Cross-checking your shade', desc: 'Comparing the analysis with measured color and lighting', minMs: 1500 },
  { label: 'Validating stain findings', desc: 'Processing the scan’s stain breakdown', minMs: 1000 },
  { label: 'Finalizing your scan', desc: 'Updating scan usage, care progress and rewards', minMs: 950 },
];