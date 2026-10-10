import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, ImagePlus, Pencil, Check, Palette } from 'lucide-react';
import { normConfidence } from '@/lib/scanAccuracy';
import FoodChemistryChips from '@/components/FoodChemistryChips';
import AnalysisRitual from '@/components/scan/AnalysisRitual';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import useCaptureQuality from '@/hooks/use-capture-quality';

// Cal AI-style food scan modal. Full-screen camera view:
//   • Desktop → live webcam preview with a clean shutter button
//   • Mobile  → native camera (file input with capture="environment")
// After capture, the photo stays visible with a scanning animation, then
// identified items appear as cards over the image.
//
// Props:
//   open, onClose, onCapture(file), scanning, result, onDismissResult

import { FOOD_SCAN_STAGES } from '@/lib/scanProgress';

export default function FoodScanModal({ open, onClose, onCapture, scanning, activeStep = 0, result, onDismissResult, onCorrectName, onApplyStain }) {
  useScrollLock(open);
  const [stream, setStream] = useState(null);
  const [preview, setPreview] = useState(null); // object URL of captured photo
  const [camError, setCamError] = useState('');
  const [useNative, setUseNative] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(null);
  const captureFromWebcamRef = useRef(null);
  const autoCaptureFiredRef = useRef(false);
  const videoReadySinceRef = useRef(null);
  const scanningRef = useRef(false);
  const previewRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const capturingRef = useRef(false);
  const captureQuality = useCaptureQuality(videoRef, open && !!stream && !preview);
  const qualityRef = useRef(captureQuality);
  qualityRef.current = captureQuality;

  const isDesktop = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }, []);

  // Start webcam on desktop when modal opens.
  useEffect(() => {
    if (!open || !isDesktop || useNative || preview) return;
    let active = true;
    setCamError('');
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => { if (active) { setStream(s); } else s.getTracks().forEach((track) => track.stop()); })
      .catch(() => { if (active) { setCamError('Camera unavailable. Use Upload instead.'); setUseNative(true); } });
    return () => { active = false; };
  }, [open, isDesktop, useNative, preview]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPreview(null);
      setUseNative(false);
      setEditingIndex(null);
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const captureFromWebcam = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || capturingRef.current || scanningRef.current || previewRef.current) return;
    capturingRef.current = true;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      capturingRef.current = false;
      if (!blob) return;
      const file = new File([blob], 'food-scan.jpg', { type: 'image/jpeg' });
      setPreview(URL.createObjectURL(blob));
      stopCamera();
      onCapture(file);
    }, 'image/jpeg', 0.9);
  };
  captureFromWebcamRef.current = captureFromWebcam;

  // Keep refs in sync with the latest render values for auto-capture polling.
  scanningRef.current = scanning;
  previewRef.current = preview;
  streamRef.current = stream;

  // Reset the fired guard when the modal reopens or stream/autoCapture changes.
  useEffect(() => {
    autoCaptureFiredRef.current = false;
    videoReadySinceRef.current = null;
  }, [open, stream, autoCapture]);

  // Auto-capture for food scan (desktop webcam only) — polls every 100ms,
  // requires a valid video frame for 500ms before starting a 3s countdown.
  // Guards against scanning/preview in progress and double captures.
  useEffect(() => {
    if (!open || !isDesktop || !autoCapture) {
      setAutoCountdown(null);
      videoReadySinceRef.current = null;
      return;
    }
    const STABILITY_MS = 500;
    const COUNTDOWN_MS = 3000;
    let lastDisplay = -1;
    const id = setInterval(() => {
      if (autoCaptureFiredRef.current) { clearInterval(id); return; }
      const video = videoRef.current;
      const hasFrame = !!streamRef.current && video && video.videoWidth > 0;
      const q = qualityRef.current;
      const isGood = hasFrame && q.ready && Date.now() - q.sampledAt < 750 && !capturingRef.current && !previewRef.current && !scanningRef.current;
      if (!isGood) {
        videoReadySinceRef.current = null;
        if (lastDisplay !== -1) { setAutoCountdown(null); lastDisplay = -1; }
        return;
      }
      if (videoReadySinceRef.current === null) videoReadySinceRef.current = Date.now();
      const stableFor = Date.now() - videoReadySinceRef.current;
      if (stableFor < STABILITY_MS) return;
      const countdownStart = videoReadySinceRef.current + STABILITY_MS;
      const remaining = Math.max(0, (COUNTDOWN_MS - (Date.now() - countdownStart)) / 1000);
      const displaySec = Math.ceil(remaining);
      if (displaySec !== lastDisplay) { setAutoCountdown(remaining); lastDisplay = displaySec; }
      if (remaining <= 0) {
        clearInterval(id);
        setAutoCountdown(null);
        if (!autoCaptureFiredRef.current && isGood) {
          autoCaptureFiredRef.current = true;
          captureFromWebcamRef.current?.();
        }
      }
    }, 100);
    return () => { clearInterval(id); setAutoCountdown(null); videoReadySinceRef.current = null; };
  }, [open, isDesktop, autoCapture]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    stopCamera();
    onCapture(file);
    e.target.value = '';
  };

  const resetForAnother = () => {
    onDismissResult?.();
    setPreview(null);
    setUseNative(false);
    // Re-trigger native camera on mobile for a fast re-scan
    if (!isDesktop) setTimeout(() => fileRef.current?.click(), 200);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 safe-area-inset-top bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-lg bg-olo/20 flex items-center justify-center">
            <Camera className="w-4 h-4 text-olo-glow" />
          </div>
          <span className="font-heading font-600 text-base">Scan your food</span>
        </div>
        <button
          onClick={() => { onDismissResult?.(); onClose(); }}
          className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera / Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Live webcam (desktop) */}
        {!preview && !useNative && stream && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Viewfinder framing guides */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[80%] max-w-sm aspect-[3/4]">
                <span className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/70 rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/70 rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/70 rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/70 rounded-br-xl" />
              </div>
            </div>
            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[120px] text-white/60 text-xs text-center pointer-events-none">
              {autoCapture ? captureQuality.message : 'Center your food in the frame'}
            </p>
            {/* Auto-capture toggle — desktop webcam only, off by default */}
            <button
              onClick={() => setAutoCapture((v) => !v)}
              className="absolute top-16 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-white hover:bg-white/20 transition-colors z-10"
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${autoCapture ? 'border-olo bg-olo' : 'border-white/50'}`}>
                {autoCapture && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap">Auto-capture</span>
            </button>
            {autoCountdown != null && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-olo animate-pulse" />
                <span className="text-[10px] text-white/90 font-medium whitespace-nowrap">Capturing in {Math.ceil(autoCountdown)}…</span>
              </div>
            )}
            {/* Shutter button */}
            <div className="absolute bottom-0 inset-x-0 pb-8 safe-area-inset-bottom bg-gradient-to-t from-black/60 to-transparent pt-6">
              <div className="flex items-center justify-center gap-10">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
                  aria-label="Upload from gallery"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <button
                  onClick={captureFromWebcam}
                  className="w-16 h-16 rounded-full bg-white border-4 border-white/40 shadow-2xl active:scale-90 transition-transform flex items-center justify-center"
                  aria-label="Capture photo"
                >
                  <div className="w-12 h-12 rounded-full bg-olo" />
                </button>
                <div className="w-11 h-11" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </>
        )}

        {/* Native camera trigger (mobile) — separate camera + gallery buttons
            so the gallery input has no `capture` attribute (which forces the
            camera app to open instead of the photo picker). */}
        {!preview && (useNative || !isDesktop) && !stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-5"
              aria-label="Open camera"
            >
              {/* Viewfinder frame */}
              <div className="relative w-44 h-44 rounded-3xl border-2 border-white/20 flex items-center justify-center">
                <span className="absolute top-0 left-0 w-7 h-7 border-l-2 border-t-2 border-olo-glow rounded-tl-2xl" />
                <span className="absolute top-0 right-0 w-7 h-7 border-r-2 border-t-2 border-olo-glow rounded-tr-2xl" />
                <span className="absolute bottom-0 left-0 w-7 h-7 border-l-2 border-b-2 border-olo-glow rounded-bl-2xl" />
                <span className="absolute bottom-0 right-0 w-7 h-7 border-r-2 border-b-2 border-olo-glow rounded-br-2xl" />
                <div className="w-20 h-20 rounded-full bg-olo/20 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-olo-glow" />
                </div>
              </div>
              <div>
                <p className="text-white font-heading font-600 text-lg">Tap to open camera</p>
                <p className="text-white/50 text-sm mt-1 max-w-xs">
                  {camError || 'Snap a meal or drink — teewai will identify it instantly.'}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-olo-glow text-xs font-medium active:scale-95 transition-transform"
              aria-label="Choose from gallery"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Or choose from gallery
            </button>
          </div>
        )}
        {(!preview && (useNative || !isDesktop) && !stream) && (
          <>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </>
        )}

        {/* Captured photo preview (stays visible during scan + results) */}
        {preview && (
          <>
            <img src={preview} alt="Captured food" className="w-full h-full object-cover" />
            {/* Scanning overlay */}
            {scanning && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 px-6">
                <div className="absolute left-0 right-0 h-0.5 bg-olo shadow-[0_0_20px_var(--olo-glow)] animate-scan-line" />
                <AnalysisRitual stages={FOOD_SCAN_STAGES} activeStep={activeStep} loading={scanning} variant="dark" />
              </div>
            )}
            {/* Results overlay */}
            {result && !scanning && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/92 to-transparent px-4 pt-16 pb-4 safe-area-inset-bottom">
                {result.rejected ? (
                  <div className="flex items-start gap-2.5 bg-rose-500/20 border border-rose-500/30 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-white text-sm leading-relaxed">{result.message}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-olo-glow text-sm font-semibold mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {result.items.length} item{result.items.length === 1 ? '' : 's'} identified
                    </div>
                    {result.items.map((it, i) => {
                      const m = it.macros || {};
                      const kcal = it.item.calories || 0;
                      const macroStr = (m.protein_g || m.carbs_g || m.fat_g)
                        ? ` · P${m.protein_g || 0}g C${m.carbs_g || 0}g F${m.fat_g || 0}g`
                        : '';
                      return (
                        <div key={i} className="flex items-start gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-3">
                          <div className="w-10 h-10 rounded-xl bg-olo/20 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-olo-glow" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingIndex === i ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && editValue.trim()) {
                                      onCorrectName?.(i, editValue.trim());
                                      setEditingIndex(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingIndex(null);
                                    }
                                  }}
                                  className="flex-1 min-w-0 bg-white/10 border border-olo/40 rounded-lg px-2 py-1 text-white text-sm outline-none"
                                  placeholder="Correct food name"
                                />
                                <button
                                  onClick={() => { if (editValue.trim()) { onCorrectName?.(i, editValue.trim()); setEditingIndex(null); } }}
                                  className="w-7 h-7 rounded-lg bg-olo flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                                  aria-label="Save name"
                                >
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </button>
                                <button
                                  onClick={() => setEditingIndex(null)}
                                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                                  aria-label="Cancel"
                                >
                                  <X className="w-3.5 h-3.5 text-white/70" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <p className="text-white text-sm font-medium truncate">{it.item.name}</p>
                                {onCorrectName && (
                                  <button
                                    onClick={() => { setEditingIndex(i); setEditValue(it.item.name); }}
                                    className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-olo-glow transition-colors flex-shrink-0"
                                    aria-label="Correct name"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                            <p className="text-white/50 text-xs mt-0.5">
                              {it.item.stain_level} stain{macroStr}{normConfidence(it.confidence) != null ? ` · ${normConfidence(it.confidence)}% model confidence` : ''}
                            </p>
                            <FoodChemistryChips scores={it.scores} className="mt-2" />
                          </div>
                          <span className="text-white font-semibold text-sm flex-shrink-0 mt-0.5">≈ {kcal} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {onApplyStain && !result.rejected && (
                  <button
                    onClick={() => onApplyStain(result.items)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-olo/20 border border-olo/40 text-olo-glow font-semibold py-3 rounded-xl active:scale-95 transition-transform mt-3 mb-2.5"
                  >
                    <Palette className="w-4 h-4" /> Count it on my smile
                  </button>
                )}
                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={resetForAnother}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold py-3 rounded-xl active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-4 h-4" /> Scan another
                  </button>
                  <button
                    onClick={() => { onDismissResult?.(); onClose(); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl active:scale-95 transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Done
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}