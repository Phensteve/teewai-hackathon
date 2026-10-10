import { useState, useEffect } from 'react';
import ScanUploader from '@/components/ScanUploader';
import AnalysisRitual from '@/components/scan/AnalysisRitual';
import { TEETH_SCAN_STAGES } from '@/lib/scanProgress';
import ScanReference from '@/components/scan/ScanReference';
import { Check, RotateCcw, Camera, RotateCw, AlertTriangle } from 'lucide-react';
import { checkAngleMatch } from '@/lib/dentalCV';
import { prewarm, speakAngleIntro } from '@/lib/voiceCoach';

// Guided 5-angle capture for the "full scan" mode. Reuses the single-photo
// ScanUploader one angle at a time, collecting a File per position. When all
// five are captured, calls onComplete({ front, top, lower, left, right }).
//
// Each captured photo is verified against the expected angle using the non-AI
// dentalCV module. Verification is lenient — it never blocks capture, only
// shows a gentle warning if the angle seems wrong. "Don't reject a correct
// image" — if uncertain, accept.
const FULL_POSITIONS = [
  { key: 'front', label: 'the front of your teeth', desc: 'Smile straight at the camera — upper and lower front teeth visible.', short: 'Front', upsideDown: false },
  { key: 'top', label: 'the top of your teeth', desc: 'Turn your phone upside down and tilt your head back to show your upper teeth.', short: 'Upper', upsideDown: true },
  { key: 'lower', label: 'the lower teeth', desc: 'Lift the camera above your mouth and open wide to show your lower teeth.', short: 'Lower', upsideDown: false },
  { key: 'left', label: 'the left side', desc: 'Turn your head to show the left side of your smile, pulling your cheek back.', short: 'Left', upsideDown: false },
  { key: 'right', label: 'the right side', desc: 'Show the right side of your smile, pulling your cheek back.', short: 'Right', upsideDown: false },
];

export default function FullScanStepper({ onComplete, loading, activeStep = 0 }) {
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [step, setStep] = useState(0);
  const [angleResults, setAngleResults] = useState({}); // { [key]: 'match' | 'mismatch' | 'uncertain' | 'error' }

  // Prewarm voice clips for all angles so they're ready when needed.
  useEffect(() => { prewarm(); }, []);

  // Speak the intro prompt when the step changes.
  useEffect(() => { speakAngleIntro(FULL_POSITIONS[step].key); }, [step]);

  const capturedCount = Object.keys(photos).length;
  const allDone = capturedCount === FULL_POSITIONS.length;
  const cur = FULL_POSITIONS[step];

  const handleFile = async (file) => {
    const url = URL.createObjectURL(file);
    const key = cur.key;
    setPhotos((p) => ({ ...p, [key]: file }));
    setPreviews((p) => ({ ...p, [key]: url }));
    // Advance immediately so the camera reopens for the next angle without
    // waiting for angle verification (which previously left the camera stuck
    // on the captured photo until the check finished).
    if (step < FULL_POSITIONS.length - 1) setStep(step + 1);

    // Non-AI angle verification — lenient, never blocks. Runs in the
    // background and badges the thumbnail so the user can retake if the
    // angle looks wrong.
    try {
      const result = await checkAngleMatch(file, key);
      setAngleResults((r) => ({
        ...r,
        [key]: result.uncertain ? 'error' : result.match ? 'match' : 'mismatch',
      }));
    } catch {
      setAngleResults((r) => ({ ...r, [key]: 'error' }));
    }
  };

  const retake = (i) => {
    const key = FULL_POSITIONS[i].key;
    setPhotos((p) => { const n = { ...p }; delete n[key]; return n; });
    setPreviews((p) => { const n = { ...p }; if (n[key]) { URL.revokeObjectURL(n[key]); delete n[key]; } return n; });
    setAngleResults((r) => { const n = { ...r }; delete n[key]; return n; });
    setStep(i);
  };

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-olo" />
          <span className="text-sm font-medium">Full mouth scan</span>
        </div>
        <span className="text-xs text-muted-foreground">{capturedCount}/5 photos</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-5">
        <div
          className="h-full bg-olo transition-all duration-500"
          style={{ width: `${(capturedCount / 5) * 100}%` }}
        />
      </div>

      {/* Captured thumbnails */}
      {capturedCount > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-5">
          {FULL_POSITIONS.map((p, i) => {
            const url = previews[p.key];
            return (
              <button
                key={p.key}
                onClick={() => retake(i)}
                className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group"
                title={url ? `Retake ${p.short}` : `${p.short} — not captured`}
              >
                {url ? (
                  <>
                    <img src={url} alt={p.short} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-white text-[10px] font-medium">
                        <RotateCcw className="w-3 h-3" /> Retake
                      </span>
                    </div>
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-olo flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                    {(angleResults[p.key] === 'mismatch' || angleResults[p.key] === 'uncertain') && (
                      <span className="absolute bottom-1 left-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-black/30" title="Angle may be off — tap to retake">
                        <AlertTriangle className="w-2 h-2 text-white" />
                      </span>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    <span className="text-[10px]">{p.short}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Current step capture, or review + submit when all done */}
      {!allDone ? (
        <div>
          <div className="mb-3 p-3 rounded-xl bg-olo/5 border border-olo/15">
            <p className="text-sm font-medium text-olo">
              Photo {step + 1} of 5 — {cur.short}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{cur.desc}.</p>
          </div>

          {/* Upside-down tip for the top/upper angle */}
          {cur.upsideDown && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <RotateCw className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Turn your phone upside down</p>
                <p className="text-xs text-muted-foreground mt-0.5">This gives the best angle for your upper teeth — the camera will be pointing up at your teeth.</p>
              </div>
            </div>
          )}

          {/* Angle verification runs in the background and badges the captured
              thumbnail above — tap any photo to retake if the angle looks off. */}

          <ScanReference position={cur.key} />
          <ScanUploader key={step} autoOpen onFile={handleFile} loading={false} position={cur.key} positionLabel={cur.label} />
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-olo" />
          </div>
          <h3 className="font-heading font-700 text-lg mb-1">All 5 photos captured</h3>
          <p className="text-sm text-muted-foreground mb-5">
            teewai will analyze all five angles together for a complete picture of your mouth.
          </p>
          {loading && <div className="mb-6 text-left"><AnalysisRitual stages={TEETH_SCAN_STAGES} activeStep={activeStep} loading={loading} variant="light" /></div>}
          <button
            onClick={() => onComplete(photos)}
            disabled={loading}
            className="w-full bg-olo text-white font-semibold px-6 py-3.5 rounded-xl hover:scale-[1.02] transition-transform olo-glow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing full scan…
              </>
            ) : (
              <>Analyze full scan · costs 3 scans</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}