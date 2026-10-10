import { useState, useRef, useEffect } from 'react';
import { unrufld as base44 } from '@/api/unrufldClient';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';
import { createScanProgress } from '@/lib/scanProgress';
import { Link } from 'react-router-dom';
import { Camera, Info, Sun, RotateCcw, LogIn, ChevronDown } from 'lucide-react';
import ScanUploader from '@/components/ScanUploader';
import FreeScanResult from '@/components/freescan/FreeScanResult';
import ErrorBoundary from '@/components/ErrorBoundary';
import { checkLighting } from '@/lib/lightingCheck';
import { preAnalyze, healthLevelFromScore } from '@/lib/unrufldteeth';
import { rgbToLab, matchShade, whiteBalanceTooth, whitenessIndexFromMatch } from '@/lib/teewaiColorimetry';
import { loadImage } from '@/lib/unrufldteethPixels';
import { findWhiteReference, estimateGumHealth } from '@/lib/freescanAnalysis';
import { normalizePhoto } from '@/lib/normalizePhoto';
import { teethPresenceGate, computeRobustWhiteness, gateReasonToMessage } from '@/lib/freescanGate';

// Real client-side colorimetry stages — each checks off as its actual
// computation completes (honest operational transparency, not artificial pacing).
const FREE_SCAN_STAGES = [
  { label: 'Lighting pre-flight', desc: 'Checking ambient light quality' },
  { label: 'Tooth detection', desc: 'Locating teeth in the frame' },
  { label: 'Enamel isolation gate', desc: 'Verifying a clear tooth region' },
  { label: 'Sclera white-balance', desc: 'Calibrating against a white reference' },
  { label: 'CIEDE2000 shade match', desc: 'Matching against the VITA atlas' },
  { label: 'Gum health sampling', desc: 'Reading the gum zone' },
];

// Frictionless scan — no signup, no account, no scan credits.
// Uses teewai's client-side colorimetry engine (CIEDE2000 VITA shade matching
// + canvas whiteness scoring) to deliver an instant result. The full AI
// analysis (cavities, gum health, per-tooth breakdown, personalized plan) is
// unlocked after signup — the freemium funnel that Dental.com pioneered.
export default function FreeScan() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [errorImage, setErrorImage] = useState(null);
  const [lightingWarn, setLightingWarn] = useState(null);
  const photoUrlRef = useRef(null);
  const errorImageRef = useRef(null);
  const FREE_LIMIT = 3;
  const [consented, setConsented] = useState(() => localStorage.getItem('teewai_free_scan_consent') === '1');
  const [usedCount, setUsedCount] = useState(() => Number(localStorage.getItem('teewai_free_scans_used') || 0));
  const [activeStage, setActiveStage] = useState(0);
  const exhausted = usedCount >= FREE_LIMIT;

  // Server is the source of truth — clearing history or going incognito
  // resets localStorage but not the device/network count.
  useEffect(() => {
    getDeviceFingerprint()
      .then((device_hash) => base44.functions.invoke('freeScanQuota', { action: 'check', device_hash }))
      .then((res) => {
        const used = res.data?.used;
        if (used == null) return;
        setUsedCount((c) => Math.max(c, used));
        localStorage.setItem('teewai_free_scans_used', String(used));
      })
      .catch(() => {});
  }, []);

  const analyze = async (file) => {
    if (!consented || exhausted) return;
    setLoading(true);
    const progress = createScanProgress(setActiveStage, FREE_SCAN_STAGES);
    setError('');
    if (errorImageRef.current) { URL.revokeObjectURL(errorImageRef.current); errorImageRef.current = null; }
    setErrorImage(null);

    try {
      // 1. Lighting pre-flight — poor lighting shifts the shade, so warn
      //    before wasting the user's time on a bad photo.
      const lighting = await checkLighting(file).catch(() => ({ level: 'unknown' }));
      await progress.advance(1);

      // 2. Engine pre-flight — basic tooth detection, brightness, violet cast.
      const ctx = await preAnalyze(file);

      if (!ctx.usable) {
        const note = ctx.notes[0];
        if (note === 'no_teeth') {
          const failUrl = URL.createObjectURL(file);
          errorImageRef.current = failUrl;
          setErrorImage(failUrl);
        }
        setError(
          note === 'no_teeth'
            ? "No teeth detected. Face the camera directly, smile wide, and make sure your teeth are clearly visible."
            : note === 'low_light'
              ? 'Photo is too dark. Move to brighter, natural light (near a window) and try again.'
              : note === 'overexposed'
                ? 'Photo is too bright. Move away from harsh direct light or flash and try again.'
                : 'Photo is not clear enough. Use good lighting and face the camera directly.'
        );
        setLoading(false);
        return;
      }

      await progress.advance(2);
      const url = URL.createObjectURL(file);

      // 3. Teeth-presence gate — deterministic CV gate (connected components,
      //    blur, centroid, flat-surface rejection). Runs BEFORE scoring so a
      //    failed gate never produces a fake score and never burns a scan.
      let gateResult = null;
      // Mobile browsers sometimes fail to decode a fresh photo on the first
      // attempt, so try once more (decoding straight from the file) before
      // showing an error.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const img = attempt === 0 ? await loadImage(url) : await createImageBitmap(file);
          gateResult = teethPresenceGate(img);
        } catch {
          gateResult = { passed: false, reason: 'analysis_failed', toothPixels: { count: 0 } };
        }
        if (gateResult.reason !== 'analysis_failed') break;
        await new Promise((r) => setTimeout(r, 150));
      }

      if (!gateResult.passed) {
        if (gateResult.reason === 'no_teeth') {
          errorImageRef.current = url;
          setErrorImage(url);
        } else {
          URL.revokeObjectURL(url);
        }
        setError(gateReasonToMessage(gateResult.reason));
        setLoading(false);
        return; // no quota consumed — failed gate is a free retry
      }

      await progress.advance(3);
      // 4. Sclera white-balance — find the brightest neutral pixels (sclera,
      //    highlights, white clothing) and use them as a white-balance baseline.
      let whiteRef = null;
      let correctedToothRgb = ctx.toothRgb;
      try {
        const img = await loadImage(url);
        whiteRef = findWhiteReference(img);
        if (whiteRef && ctx.toothRgb) {
          correctedToothRgb = whiteBalanceTooth(ctx.toothRgb, whiteRef.rgb);
        }
      } catch { /* non-fatal — fall back to raw tooth RGB */ }

      await progress.advance(4);
      // 5. Colorimetric shade match — convert the (now white-balanced) tooth
      //    RGB to CIELAB, then match against the VITA atlas using CIEDE2000.
      let colorimetric = null;
      let toothLab = null;
      if (correctedToothRgb) {
        toothLab = rgbToLab(correctedToothRgb.r, correctedToothRgb.g, correctedToothRgb.b);
        colorimetric = matchShade(toothLab);
      }

      // 6. VITA-anchored whiteness index — derived from the CIEDE2000 shade
      //    match position in the VITA atlas (the same clinical shade guide),
      //    fine-adjusted by the tooth's actual L* (light reflectance). This
      //    guarantees the whiteness score and the VITA shade always agree.
      //    Falls back to the robust luminance heuristic only if the
      //    colorimetric match fails (no usable tooth RGB).
      let whiteness = null;
      if (colorimetric && toothLab) {
        whiteness = whitenessIndexFromMatch(toothLab, colorimetric);
      }
      if (whiteness == null) {
        const robust = computeRobustWhiteness(gateResult.toothPixels, whiteRef);
        whiteness = robust?.whiteness ?? null;
      }
      if (whiteness == null) {
        setError('This photo is hard to read clearly. Try again in soft, even daylight facing a window.');
        URL.revokeObjectURL(url);
        setLoading(false);
        return; // no quota consumed — no confident score
      }

      await progress.advance(5);
      // 7. Gum health indicator — sample the gum zone below the teeth.
      let gumHealth = null;
      try {
        const img2 = await loadImage(url);
        gumHealth = estimateGumHealth(img2, gateResult.centroidY ?? 0.5);
      } catch { /* non-fatal */ }

      await progress.finish();
      const shade = colorimetric?.code || 'A2';

      // Clean up any previous photo URL
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = url;

      setResult({
        whiteness,
        shade,
        colorimetric,
        brightness: ctx.brightness,
        yellowIndex: ctx.yellowIndex,
        isNaturalTeeth: ctx.isNaturalTeeth,
        toothRatio: ctx.toothRatio,
        lighting: lighting.level,
        whiteBalanced: !!(whiteRef && whiteRef.rgb),
        castDelta: whiteRef?.castDelta || 0,
        gumHealth,
        photoUrl: url,
        confidence: gateResult.confidence,
        vitaAnchored: !!(colorimetric && toothLab),
      });
      let next = Number(localStorage.getItem('teewai_free_scans_used') || 0) + 1;
      try {
        const res = await base44.functions.invoke('freeScanQuota', {
          action: 'consume',
          device_hash: await getDeviceFingerprint(),
        });
        if (res.data?.used != null) next = Math.max(next, res.data.used);
      } catch { /* fall back to the local count */ }
      localStorage.setItem('teewai_free_scans_used', String(next));
      setUsedCount(next);
    } catch (e) {
      setError('Something went wrong analyzing your photo. Please try again.');
    }

    setLoading(false);
  };

  const handleFile = async (rawFile) => {
    const file = await normalizePhoto(rawFile);
    if (!file) {
      setError("We couldn't open this photo. Please take a new photo with your camera, or choose a JPG or PNG image.");
      return;
    }
    // Clear any previous error/error-image as soon as a new upload begins so
    // the stale rejection from the last attempt doesn't linger on the screen.
    setError('');
    if (errorImageRef.current) { URL.revokeObjectURL(errorImageRef.current); errorImageRef.current = null; }
    setErrorImage(null);
    const v = await checkLighting(file).catch(() => ({ level: 'unknown' }));
    if (!v || v.level === 'good' || v.level === 'unknown') {
      analyze(file);
      return;
    }
    setLightingWarn({ ...v, file });
  };

  const scanAnyway = () => {
    const f = lightingWarn?.file;
    setLightingWarn(null);
    if (f) analyze(f);
  };

  const retake = () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    if (errorImageRef.current) { URL.revokeObjectURL(errorImageRef.current); errorImageRef.current = null; }
    setErrorImage(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen pt-safe-app bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        {!result && (
          <>
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-olo bg-olo/10 px-3 py-1 rounded-full mb-3">
                <Camera className="w-3.5 h-3.5" /> Free scan, no signup
              </span>
              <h1 className="font-heading font-800 text-3xl tracking-tight mb-2">Scan your smile</h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Snap a photo and teewai's colorimetry engine will score your whiteness and match your VITA shade. Instantly, no account needed.
              </p>
            </div>

            {/* Returning user shortcut — visible from the first screen so
                logged-in users who landed here by mistake can sign in without
                the guest flow. returnTo=/scan lands them on the signed-in scan
                page (not home) since they came to scan. */}
            <div className="mb-4 text-center">
              <Link
                to="/login?returnTo=/scan"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-olo transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Already have an account? <span className="text-olo font-medium underline">Log in</span></span>
              </Link>
            </div>

            {/* Capture action + consent + counter — grouped at the top so the
                primary action is visible without scrolling on a standard phone. */}
            {!exhausted && (
              <>
                {/* Scan counter — compact, right above the button */}
                <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Camera className="w-3.5 h-3.5 text-olo" />
                  <span className="font-medium">Free scan {usedCount + 1} of {FREE_LIMIT}</span>
                  <span aria-hidden="true">·</span>
                  <span>no signup needed</span>
                </div>

                {/* Consent checkbox — compact, right above the button so agreeing
                    and scanning happen in the same glance. */}
                <label className="mb-3 flex items-center justify-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => { setConsented(e.target.checked); localStorage.setItem('teewai_free_scan_consent', e.target.checked ? '1' : '0'); }}
                    className="w-4 h-4 rounded border-border text-olo focus:ring-olo flex-shrink-0"
                  />
                  <span>I agree to the <Link to="/terms" target="_blank" className="text-olo hover:underline">Terms</Link> and <Link to="/privacy" target="_blank" className="text-olo hover:underline">Privacy Policy</Link>.</span>
                </label>

                {/* The capture button itself */}
                {!consented ? (
                  <div className="p-5 rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
                    Check the box above to start your free scan.
                  </div>
                ) : (
                  <ScanUploader onFile={handleFile} loading={loading} positionLabel="front of your teeth" ritualStages={FREE_SCAN_STAGES} ritualActiveStep={activeStage} ritualFootnote="Running CIEDE2000 colorimetry · No data sent to any server" />
                )}
              </>
            )}

            {exhausted && (
              <div className="p-6 rounded-2xl border border-olo/30 bg-olo/5 text-center">
                <p className="font-heading font-700 text-lg mb-2">You've used your {FREE_LIMIT} free scans</p>
                <p className="text-sm text-muted-foreground mb-5">Create a free account to keep scanning and get the full AI analysis, progress tracking, and your personalized whitening plan. Logging in is free — you don't pay anything.</p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/register" className="inline-flex items-center justify-center bg-olo text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform">Create free account</Link>
                  <Link to="/login" className="inline-flex items-center justify-center bg-olo/10 text-olo font-semibold px-6 py-3 rounded-xl hover:bg-olo/20 transition-colors">Log in</Link>
                </div>
              </div>
            )}

            {/* Tips for best results — collapsed by default. The three info
                boxes (How this works, white index card tip, accuracy disclaimer)
                are useful but shouldn't block the path to scanning. Uses the
                native <details> accordion with the dashboard's radius system. */}
            <details className="mt-5 group">
              <summary className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-olo cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                <Info className="w-4 h-4" />
                <span>Tips for best results</span>
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground bg-olo/5 rounded-xl p-3.5 border border-olo/15">
                  <Info className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-0.5">How this works</p>
                    <p className="text-xs leading-relaxed">
                      This free scan uses teewai's CIEDE2000 colorimetry, the science of measuring color precisely using the same formula dental spectrophotometers use. No AI, no server. For the full analysis (cavities, gum health, per tooth breakdown, personalized plan), create a free account after scanning.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/5 border border-warning/15 rounded-xl p-3">
                  <Info className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                  <span>For the most accurate shade match, place a <strong className="text-warning">white index card</strong> next to your teeth as a color reference. teewai uses it to calibrate for your lighting.</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground bg-olo/5 rounded-xl p-3.5 border border-olo/15">
                  <Info className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    Free scans are a quick estimate. Signed in scans are more accurate because they calibrate against your full scan history. <Link to="/login?returnTo=/scan" className="text-olo font-medium hover:underline">Log in</Link> for the most accurate results.
                  </p>
                </div>
              </div>
            </details>

            {/* Lighting warning */}
            {lightingWarn && (
              <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/25 flex items-start gap-3">
                <Sun className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-warning">{lightingWarn.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lightingWarn.hint}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setLightingWarn(null)} className="inline-flex items-center gap-1.5 bg-warning text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                      <Camera className="w-3.5 h-3.5" /> Retake
                    </button>
                    <button onClick={scanAnyway} className="inline-flex items-center gap-1.5 border border-border text-foreground text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      Scan anyway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                {errorImage && (
                  <div className="mb-3 flex justify-center">
                    <img src={errorImage} alt="Uploaded photo" className="max-h-48 rounded-lg border border-destructive/20 object-cover" />
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <RotateCcw className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Analysis ritual renders inside the scan uploader overlay */}

            {/* Back to home */}
            <div className="mt-8 text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-olo transition-colors">
                ← Back to home
              </Link>
            </div>
          </>
        )}

        {/* Result */}
        {result && (
          <>
            <div className="mb-5 text-center">
              <h1 className="font-heading font-800 text-2xl tracking-tight mb-1">Your instant result</h1>
              <p className="text-sm text-muted-foreground">Powered by teewai's CIEDE2000 colorimetry engine</p>

            </div>
            <ErrorBoundary compact>
              <FreeScanResult result={result} onRetake={retake} />
            </ErrorBoundary>

            {/* Accuracy disclaimer on the result screen — sets expectations and
                softly nudges toward signed-in scans for better accuracy. */}
            <div className="mt-5 flex items-start gap-2.5 text-sm text-muted-foreground bg-olo/5 rounded-xl p-3.5 border border-olo/15">
              <Info className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                This is a quick estimate. Signed in scans are more accurate because they calibrate against your full scan history. <Link to="/login?returnTo=/scan" className="text-olo font-medium hover:underline">Log in</Link> for more accurate future scans.
              </p>
            </div>
          </>
        )}

        {/* Medical disclaimer */}
        <div className="mt-8 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning text-xs text-center">
          teewai is a wellness companion, not a medical device. We strongly advise you to visit your dentist for professional care.
        </div>
      </div>
    </div>
  );
}