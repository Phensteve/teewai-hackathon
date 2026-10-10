import { useState, useRef, useEffect } from 'react';
import { Camera, X, SwitchCamera, ImagePlus, Info, Volume2, VolumeX, Sun, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { playShutter, initAudio } from '@/lib/sounds';
import useTeethAlignment from '@/hooks/use-teeth-alignment';
import AlignmentOverlay from '@/components/scan/AlignmentOverlay';
import GhostThumbnail from '@/components/scan/GhostThumbnail';
import { fastEstimate } from '@/lib/unrufldteeth';
import { analyzePhoto, assessLighting } from '@/lib/dentalCV';
import { speak, prewarm, KNOWN_PROMPTS } from '@/lib/voiceCoach';
import ScanRitualOverlay from '@/components/scan/ScanRitualOverlay';
import AnalysisRitual from '@/components/scan/AnalysisRitual';
import { generateScanSessionId } from '@/lib/scanSessionId';
import { normalizePhoto } from '@/lib/normalizePhoto';
import { assessImageFile } from '@/lib/imageQuality';

// Rotating status messages while the AI analyzes — like Google/Microsoft
// loading screens, so the wait feels active and informative.
const STATUS_MESSAGES = [
  'Calibrating color against the VITA scale…',
  'Mapping each tooth individually…',
  'Detecting stains, plaque & calculus…',
  'Scoring gum health & enamel…',
  'Computing your whiteness score…',
  'Building your personalized plan…',
  'Researching the right products for you…',
  'Almost there — finalizing your report…',
];

export default function ScanUploader({ onFile, loading, position = 'front', positionLabel = 'front of your teeth', autoOpen = false, lastScanImageUrl, ritualStages, ritualActiveStep, ritualFootnote }) {
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [cameraError, setCameraError] = useState('');
  const [muted, setMuted] = useState(false);
  const [lighting, setLighting] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const submittingRef = useRef(false);
  const sampleTimeRef = useRef(0);
  const [sessionId, setSessionId] = useState('');
  const [autoCapture, setAutoCapture] = useState(true);
  const [autoCountdown, setAutoCountdown] = useState(null);
  const captureRef = useRef(null);
  const autoCaptureFiredRef = useRef(false);
  const alignedSinceRef = useRef(null);
  const alignedRef = useRef(false);
  const liveLightingRef = useRef(null);
  const loadingRef = useRef(false);
  const pendingFileRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const alignment = useTeethAlignment(videoRef, cameraActive, facingMode === 'user', position);
  const liveLighting = alignment.brightness < 35 ? { level: 'dim', hint: 'Too dark — use soft, frontal light' } : null;
  const brightness = alignment.brightness;

  // Keep refs in sync with the latest render values for auto-capture polling.
  alignedRef.current = alignment.aligned;
  liveLightingRef.current = liveLighting;
  loadingRef.current = loading;
  pendingFileRef.current = pendingFile;
  sampleTimeRef.current = alignment.sampledAt;

  // Generate a clinical session ID when analysis begins — stamps the scan
  // with a diagnostic code (e.g. CAL-2026-0921-B1) for the ritual reveal.
  useEffect(() => { if (loading) setSessionId(generateScanSessionId()); }, [loading]);

  // Exposure and focus now come from the same fresh mouth-region sample as
  // alignment, rather than a separate whole-frame brightness/lux estimate.

  // Real-time voice coach: pre-generate human-sounding prompts when the camera
  // opens, then speak the current alignment instruction as it changes.
  useEffect(() => {
    if (cameraActive) prewarm(KNOWN_PROMPTS);
  }, [cameraActive]);

  useEffect(() => {
    if (cameraActive && !muted && alignment.message) speak(alignment.message);
  }, [alignment.message, cameraActive, muted]);

  // Rotating progress messages while the AI analyzes — like Google/Microsoft
  // loading screens, so the wait feels active and informative (and shorter).
  // A single, monotonic progress indicator — it only ever moves forward (never
  // resets or cycles through fake "step 1 of 6" rounds), so the bar actually
  // signifies real progress while the AI works.
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState(STATUS_MESSAGES[0]);
  const [preliminary, setPreliminary] = useState(null);

  // Even, time-based progress — distributes movement across the estimated
  // analysis window (ease-out to 90%) instead of shooting to 95% in a few
  // seconds then stalling. The bar only ever moves forward.
  useEffect(() => {
    if (!loading) { setProgress(0); setPreliminary(null); return; }
    const start = Date.now();
    const ESTIMATE_MS = 32000;
    setProgress(0);
    const pId = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ESTIMATE_MS);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(Math.min(90, Math.round(eased * 90)));
    }, 100);
    // Rotating status messages.
    let sIdx = 0;
    setStatusMsg(STATUS_MESSAGES[0]);
    const sId = setInterval(() => {
      sIdx = (sIdx + 1) % STATUS_MESSAGES.length;
      setStatusMsg(STATUS_MESSAGES[sIdx]);
    }, 2800);
    return () => { clearInterval(pId); clearInterval(sId); };
  }, [loading]);

  // Instant preliminary whiteness reading from pure canvas math (unrufldteeth),
  // so the user sees a real number within ~100ms while the full AI analysis runs.
  useEffect(() => {
    if (!loading || !preview) return;
    let active = true;
    fastEstimate(preview).then((est) => { if (active && est.whiteness != null) setPreliminary(est); });
    return () => { active = false; };
  }, [loading, preview]);

  const startCamera = async (requestedFacing = facingMode) => {
    alignedRef.current = false;
    sampleTimeRef.current = 0;
    initAudio();
    setCameraError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: requestedFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      }, 100);
    } catch (e) {
      setCameraError('Camera unavailable — use the upload option below.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const flipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    stopCamera();
    setTimeout(() => startCamera(nextFacing), 200);
  };

  const capture = () => {
    if (!videoRef.current?.videoWidth || submittingRef.current || loadingRef.current) return;
    submittingRef.current = true;
    playShutter();
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    // Mirror the preview only; preserve anatomical left/right in the saved image.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      submittingRef.current = false;
      if (!blob) { setFileError('Could not capture the photo. Try again.'); return; }
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });
      checkAndSubmit(file);
      stopCamera();
    }, 'image/jpeg', 0.92);
  };
  captureRef.current = capture;

  // Reset the fired guard when the camera reopens or auto-capture is toggled.
  useEffect(() => {
    autoCaptureFiredRef.current = false;
    alignedSinceRef.current = null;
  }, [cameraActive, autoCapture]);

  // Auto-capture: polls conditions every 100ms via refs (not state deps) so
  // momentary alignment flickers don't reset the countdown. Requires 500ms of
  // continuous good alignment + lighting before starting a 1.5s countdown.
  // Final condition check before firing prevents stale or double captures.
  useEffect(() => {
    if (!cameraActive || !autoCapture) {
      setAutoCountdown(null);
      alignedSinceRef.current = null;
      return;
    }
    const STABILITY_MS = 500;
    const COUNTDOWN_MS = 1500;
    let lastDisplay = -1;
    const id = setInterval(() => {
      if (autoCaptureFiredRef.current) { clearInterval(id); return; }
      const isGood = Date.now() - sampleTimeRef.current < 750 && alignedRef.current && !liveLightingRef.current && !loadingRef.current && !pendingFileRef.current && !submittingRef.current;
      if (!isGood) {
        alignedSinceRef.current = null;
        if (lastDisplay !== -1) { setAutoCountdown(null); lastDisplay = -1; }
        return;
      }
      if (alignedSinceRef.current === null) alignedSinceRef.current = Date.now();
      const stableFor = Date.now() - alignedSinceRef.current;
      if (stableFor < STABILITY_MS) return;
      const countdownStart = alignedSinceRef.current + STABILITY_MS;
      const remaining = Math.max(0, (COUNTDOWN_MS - (Date.now() - countdownStart)) / 1000);
      const displaySec = Math.ceil(remaining);
      if (displaySec !== lastDisplay) { setAutoCountdown(remaining); lastDisplay = displaySec; }
      if (remaining <= 0) {
        clearInterval(id);
        setAutoCountdown(null);
        if (!autoCaptureFiredRef.current && Date.now() - sampleTimeRef.current < 750 && alignedRef.current && !liveLightingRef.current && !loadingRef.current && !pendingFileRef.current && !submittingRef.current) {
          autoCaptureFiredRef.current = true;
          captureRef.current?.();
        }
      }
    }, 100);
    return () => { clearInterval(id); setAutoCountdown(null); alignedSinceRef.current = null; };
  }, [cameraActive, autoCapture]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  // Lighting guard: analyze the captured photo's color temperature + evenness
  // (NO grayscale — that was a dead end that inflated whiteness scores). If
  // lighting is poor (warm/cool cast, uneven, or dim), hold the scan and let
  // the user retake for an accurate shade read. Good/fair lighting proceeds
  // straight to analysis. This directly addresses the "lighting skews shade
  // accuracy" weakness — by catching it before the AI runs, not after.
  const checkAndSubmit = async (rawFile) => {
    if (submittingRef.current || loadingRef.current) return;
    submittingRef.current = true;
    setCheckingPhoto(true);
    setFileError('');
    try {
      const file = await normalizePhoto(rawFile);
      if (!file) throw new Error('Could not open this photo. Choose a JPG or PNG, or take a new photo.');
      setPreview(URL.createObjectURL(file));
      const quality = await assessImageFile(file, { mouth: true });
      const assessment = quality.passed ? assessLighting(await analyzePhoto(file)) : { retake: true, blocked: true, message: quality.message };
      setLighting(assessment);
      if (assessment.retake) setPendingFile(file);
      else await onFile(file);
    } catch (error) {
      setFileError(error.message || 'Could not check this photo. Please retake it.');
    } finally {
      submittingRef.current = false;
      setCheckingPhoto(false);
    }
  };

  // Defense-in-depth: the file picker's `accept` attribute only filters the
  // native dialog, not drag-and-drop or a crafted drop. Validate type + size
  // before anything touches the canvas / upload pipeline.
  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    if (!file.type || !file.type.startsWith('image/')) return 'Please choose an image file (JPG or PNG).';
    if (file.size > 10 * 1024 * 1024) return 'That image is over 10 MB — try a smaller photo.';
    return '';
  };

  const handleFile = (file) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setFileError('');
    initAudio();
    checkAndSubmit(file);
  };

  const clear = () => {
    setPreview(null);
    setLighting(null);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Full-scan mode: auto-reopen the camera for the next angle so the user
  // doesn't have to tap "Open camera" five times. Permission is already
  // granted from the first photo, so getUserMedia works without a gesture.
  useEffect(() => {
    if (!autoOpen) return;
    startCamera().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <div className="w-full">
      {fileError && <p role="alert" className="text-sm text-destructive text-center mb-3">{fileError}</p>}
      {checkingPhoto && <p role="status" className="text-sm text-muted-foreground text-center mb-3">Checking focus and exposure…</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!preview && !cameraActive && (
        <div className="space-y-3">
          <button
            onClick={() => startCamera()}
            className="w-full relative rounded-3xl border-2 border-olo/40 bg-olo/5 p-10 text-center transition-all hover:bg-olo/10 hover:scale-[1.01] group"
          >
            <div className="w-16 h-16 rounded-2xl bg-olo flex items-center justify-center mx-auto mb-4 olo-glow group-hover:scale-110 transition-transform">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-heading font-600 text-lg mb-1">Open camera</h3>
            <p className="text-sm text-muted-foreground">Capture {positionLabel} live</p>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            aria-label="Upload a photo from your device"
            className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              dragOver ? 'border-olo bg-olo/5' : 'border-border hover:border-olo/50'
            }`}
          >
            <ImagePlus className="w-6 h-6 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Upload a photo from your device</p>
          </button>

          {cameraError && (
            <p className="text-sm text-warning text-center">{cameraError}</p>
          )}


          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/5 border border-warning/15 rounded-xl p-3">
            <Info className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
            <span>Tip: Use soft, even light and no beauty filters. A known neutral reference helps color comparison; phone shade readings are estimates.</span>
          </div>
        </div>
      )}

      {cameraActive && (
        <div className="relative rounded-3xl overflow-hidden border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[500px] object-contain"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          <AlignmentOverlay {...alignment} />
          {lastScanImageUrl && <GhostThumbnail imageUrl={lastScanImageUrl} positionLabel={positionLabel} />}
          {liveLighting && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 glass px-3 py-1.5 rounded-full animate-fade-up">
              <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
              <span className="text-[10px] text-white/90 font-medium whitespace-nowrap">{liveLighting.hint}</span>
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20"
              title={muted ? 'Unmute coach' : 'Mute coach'}
              aria-label={muted ? 'Unmute voice coach' : 'Mute voice coach'}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={flipCamera}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20"
              aria-label="Flip camera"
            >
              <SwitchCamera className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={stopCamera}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20"
              aria-label="Close camera"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          {/* VITA reference calibration guide */}
          <div className="absolute bottom-4 left-4 w-28 h-20 rounded-xl border-2 border-dashed border-olo/70 flex items-center justify-center text-center p-1 pointer-events-none">
            <span className="text-[10px] text-olo font-medium leading-tight">Place white card / VITA guide here</span>
          </div>
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 glass px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-olo animate-pulse" />
            <span className="text-[10px] text-white/90 font-medium">Reference calibration</span>
          </div>
          {/* Auto-capture toggle — obvious but not disruptive */}
          <button
            onClick={() => setAutoCapture((v) => !v)}
            className="absolute top-14 left-3 inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${autoCapture ? 'border-olo bg-olo' : 'border-white/50'}`}>
              {autoCapture && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            <span className="text-[10px] font-medium whitespace-nowrap">Auto-capture</span>
          </button>
          {/* Quiet-luxury capture instruction */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 max-w-[55%] text-center pointer-events-none">
            <p className="text-[11px] text-white/70 font-medium leading-tight">Center your smile within natural light. Hold steady for optical shade sampling.</p>
          </div>
          {/* Ambient lux readout — shows when lighting is optimal */}
          {brightness != null && alignment.aligned && !liveLighting && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 glass px-3 py-1.5 rounded-full animate-fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[10px] text-white/90 font-medium whitespace-nowrap">Focus and exposure ready</span>
            </div>
          )}
          {autoCountdown != null && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 glass px-3 py-1.5 rounded-full animate-fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-olo animate-pulse" />
              <span className="text-[10px] text-white/90 font-medium whitespace-nowrap">Auto-capturing in {Math.ceil(autoCountdown)}…</span>
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 p-6 flex items-center justify-center">
            {/* Capture always stays enabled — the guide only advises. */}
            <button
              onClick={capture}
              aria-label="Capture photo"
              className={`rounded-full border-4 bg-olo p-1 hover:scale-110 transition-transform olo-glow-strong ${
                alignment.aligned ? 'border-success animate-pulse-glow' : 'border-white'
              }`}
              style={{ width: 72, height: 72 }}
            >
              <div className="w-full h-full rounded-full bg-white/20" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className={`relative rounded-3xl overflow-hidden border border-border bg-black ${loading && ritualStages ? 'min-h-[460px]' : ''}`}>
          <img src={preview} alt="Your teeth" className="w-full max-h-[420px] object-contain" />
          {ritualStages ? (
            <AnalysisRitual
              stages={ritualStages}
              loading={loading}
              activeStep={ritualActiveStep}
              progress={progress}
              preliminary={preliminary}
              sessionId={sessionId}
              variant="dark"
              footnote={ritualFootnote}
              overlay
            />
          ) : (
            <ScanRitualOverlay loading={loading} progress={progress} preliminary={preliminary} sessionId={sessionId} />
          )}
          {!loading && !checkingPhoto && (
            <button
              onClick={clear}
              aria-label="Remove photo"
              className="absolute top-3 right-3 w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {!loading && pendingFile && lighting && lighting.retake && (
            <div className="absolute inset-x-3 bottom-3 rounded-2xl glass-strong p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Sun className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/90 leading-relaxed">{lighting.message}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clear}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white text-olo text-xs font-semibold py-2.5 rounded-xl active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                </button>
                {!lighting.blocked && <button
                  disabled={checkingPhoto}
                  onClick={() => { onFile(pendingFile); setPendingFile(null); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/10 border border-white/20 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-95 transition-transform"
                >
                  Use anyway
                </button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}