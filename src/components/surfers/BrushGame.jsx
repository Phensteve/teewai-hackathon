import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Camera, Zap, Check, Play, ArrowRight, Crosshair, AlertCircle } from 'lucide-react';
import { sampleColor, trackColor, smoothPos } from '@/lib/surfers/brushTracker';
import { createGame, startGame, updateGame, renderGame, ZONE_LABELS } from '@/lib/surfers/brushEngine';
import { useScrollLock } from '@/hooks/use-scroll-lock';

const TRACK_W = 160;
const TRACK_H = 120;
const COLOR_THRESHOLD = 80;

export default function BrushGame({ multiplier, multiplierLabel, nextMultiplier }) {
  useScrollLock();
  const videoRef = useRef(null);
  const trackCanvasRef = useRef(null);
  const displayRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const targetColorRef = useRef(null);
  const smoothedRef = useRef(null);
  const pipCanvasRef = useRef(null);
  const gameRef = useRef(createGame(multiplier));
  const startTimeRef = useRef(0);
  const phaseRef = useRef('intro');
  const syncRef = useRef({ score: -1, missCount: -1, coverage: -1, combo: -1, currentZone: -2, currentLane: -2, found: null, gameOverFired: false });

  const [phase, setPhase] = useState('intro');
  const [score, setScore] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [combo, setCombo] = useState(0);
  const [currentZone, setCurrentZone] = useState(-1);
  const [currentLane, setCurrentLane] = useState(0);
  const [brushFound, setBrushFound] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [bestTime, setBestTime] = useState(() => Number(localStorage.getItem('teewai_brush_best') || 0));
  const bestTimeRef = useRef(bestTime);
  useEffect(() => { bestTimeRef.current = bestTime; }, [bestTime]);
  const [camError, setCamError] = useState('');

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Camera ──────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('calibrate');
    } catch (e) {
      setCamError('Camera access denied. Enable your camera to use Brush Coach.');
      setPhase('error');
    }
  }, []);

  // ── Game loop ────────────────────────────────────────────────────
  useEffect(() => {
    const display = displayRef.current;
    const track = trackCanvasRef.current;
    const video = videoRef.current;
    if (!display || !track || !video) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dctx = display.getContext('2d');
    const tctx = track.getContext('2d', { willReadFrequently: true });

    const resize = () => {
      const rect = display.getBoundingClientRect();
      display.width = rect.width * dpr;
      display.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    let lastTime = performance.now();

    const loop = (time) => {
      const dt = Math.min(50, time - lastTime);
      lastTime = time;
      const W = display.width / dpr;
      const H = display.height / dpr;
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const ph = phaseRef.current;

      if (ph === 'calibrate') {
        // Show camera feed for calibration
        if (video.readyState >= 2) {
          dctx.save(); dctx.scale(-1, 1); dctx.drawImage(video, 0, 0, W, H); dctx.restore();
          dctx.fillStyle = 'rgba(6, 20, 26, 0.4)'; dctx.fillRect(0, 0, W, H);
        } else {
          dctx.fillStyle = '#06141a'; dctx.fillRect(0, 0, W, H);
        }
      } else if (ph === 'playing' || ph === 'complete') {
        // Track brush via camera (hidden)
        let brushX = -1;
        if (ph === 'playing' && targetColorRef.current && video.readyState >= 2) {
          tctx.drawImage(video, 0, 0, TRACK_W, TRACK_H);
          const imgData = tctx.getImageData(0, 0, TRACK_W, TRACK_H);
          const raw = trackColor(imgData, targetColorRef.current, COLOR_THRESHOLD);
          if (raw) {
            smoothedRef.current = smoothPos(smoothedRef.current, raw, 0.35);
            brushX = 1 - smoothedRef.current.x;
            if (!syncRef.current.found) { syncRef.current.found = true; setBrushFound(true); }
          } else {
            if (syncRef.current.found) { syncRef.current.found = false; setBrushFound(false); }
          }
        }

        // Camera PiP — proof the live video feed is being analyzed
        if (pipCanvasRef.current && video.readyState >= 2) {
          const pip = pipCanvasRef.current;
          const pctx = pip.getContext('2d');
          pctx.save(); pctx.scale(-1, 1); pctx.drawImage(track, -pip.width, 0, pip.width, pip.height); pctx.restore();
          if (smoothedRef.current) {
            const px = (1 - smoothedRef.current.x) * pip.width;
            const py = smoothedRef.current.y * pip.height;
            pctx.fillStyle = '#2dd4bf'; pctx.shadowColor = '#2dd4bf'; pctx.shadowBlur = 8;
            pctx.beginPath(); pctx.arc(px, py, 4, 0, Math.PI * 2); pctx.fill();
            pctx.shadowBlur = 0;
          }
        }

        // Update + render game
        updateGame(gameRef.current, dt, brushX);
        renderGame(dctx, gameRef.current, W, H);

        // Sync HUD
        const g = gameRef.current;
        if (g.score !== syncRef.current.score) { syncRef.current.score = g.score; setScore(g.score); }
        if (g.missCount !== syncRef.current.missCount) { syncRef.current.missCount = g.missCount; setMissCount(g.missCount); }
        if (g.currentZone !== syncRef.current.currentZone) { syncRef.current.currentZone = g.currentZone; setCurrentZone(g.currentZone); }
        if (g.currentLane !== syncRef.current.currentLane) { syncRef.current.currentLane = g.currentLane; setCurrentLane(g.currentLane); }
        if (g.combo !== syncRef.current.combo) { syncRef.current.combo = g.combo; setCombo(g.combo); }
        const cov = g.cleared.size;
        if (cov !== syncRef.current.coverage) { syncRef.current.coverage = cov; setCoverage(cov); }

        // Game over detection
        if (g.started && !g.running && !syncRef.current.gameOverFired) {
          syncRef.current.gameOverFired = true;
          const elapsed = (time - startTimeRef.current) / 1000;
          const won = g.cleared.size >= 6;
          setGameWon(won);
          setFinalScore(g.score);
          setFinalTime(elapsed);
          if (won && (bestTimeRef.current === 0 || elapsed < bestTimeRef.current)) {
            setBestTime(elapsed);
            localStorage.setItem('teewai_brush_best', String(Math.round(elapsed)));
          }
          setPhase('complete');
        }
      } else {
        dctx.fillStyle = '#06141a'; dctx.fillRect(0, 0, W, H);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ── Calibration tap ─────────────────────────────────────────────
  const handleTap = useCallback((e) => {
    if (phaseRef.current !== 'calibrate') return;
    const display = displayRef.current;
    const track = trackCanvasRef.current;
    const video = videoRef.current;
    if (!display || !track || !video || video.readyState < 2) return;

    const rect = display.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width;
    const dy = (e.clientY - rect.top) / rect.height;

    const tctx = track.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(video, 0, 0, TRACK_W, TRACK_H);
    const imgData = tctx.getImageData(0, 0, TRACK_W, TRACK_H);

    const tx = (1 - dx) * TRACK_W;
    const ty = dy * TRACK_H;
    const color = sampleColor(imgData, tx, ty, 4);

    if (color) {
      targetColorRef.current = color;
      smoothedRef.current = null;
      startGame(gameRef.current, multiplier);
      startTimeRef.current = performance.now();
      syncRef.current = { score: -1, missCount: -1, coverage: -1, combo: -1, currentZone: -2, currentLane: -2, found: null, gameOverFired: false };
      setScore(0); setMissCount(0); setCoverage(0); setCombo(0); setCurrentZone(-1); setCurrentLane(0);
      setPhase('playing');
    }
  }, [multiplier]);

  const playAgain = useCallback(() => {
    startGame(gameRef.current, multiplier);
    startTimeRef.current = performance.now();
    syncRef.current = { score: -1, missCount: -1, coverage: -1, combo: -1, currentZone: -2, currentLane: -2, found: null, gameOverFired: false };
    setScore(0); setMissCount(0); setCoverage(0); setCombo(0); setCurrentZone(-1); setCurrentLane(0);
    setPhase('playing');
  }, [multiplier]);

  const recalibrate = useCallback(() => {
    setPhase('calibrate');
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-olo-deep overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas ref={trackCanvasRef} width={TRACK_W} height={TRACK_H} className="hidden" />

      <canvas
        ref={displayRef}
        className="absolute inset-0 w-full h-full"
        onClick={phase === 'calibrate' ? handleTap : undefined}
      />

      {/* Camera PiP — proof the live video feed is being analyzed */}
      {phase === 'playing' && (
        <div className="absolute top-14 right-3 w-20 h-28 rounded-lg overflow-hidden border-2 border-olo/40 z-10 pointer-events-none bg-black/60 shadow-lg">
          <canvas ref={pipCanvasRef} width={80} height={112} className="w-full h-full" />
          <div className="absolute top-1 left-1 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/80 text-[8px] font-bold tracking-wider">LIVE</span>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 safe-area-inset-top z-10 pointer-events-none">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Link to="/dashboard" className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform pointer-events-auto">
            <X className="w-5 h-5" />
          </Link>
          {phase === 'playing' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-olo/30">
              <Zap className="w-3.5 h-3.5 text-olo-glow" />
              <span className="text-white font-heading font-700 text-sm">{multiplierLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* HUD — during gameplay */}
      {phase === 'playing' && (
        <div className="absolute top-14 inset-x-0 z-10 px-4 pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <div className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm">
              <span className="text-white/60 text-xs font-medium">{missCount} miss{missCount !== 1 ? 'es' : ''}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm">
              <span className="text-white/80 text-xs font-medium">{coverage}/6 zones</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm">
              <span className="text-olo-glow text-xs font-heading font-700 tabular-nums">{score}</span>
            </div>
          </div>
          {currentZone >= 0 && brushFound ? (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-olo/15 backdrop-blur-sm border border-olo/30">
                <div className="w-2 h-2 rounded-full bg-olo-glow animate-pulse" />
                <span className="text-olo-glow text-xs font-semibold">{ZONE_LABELS[currentZone].label}</span>
                <span className="text-white/60 text-xs">{currentLane === -1 ? '← Left' : currentLane === 0 ? '● Center' : 'Right →'}</span>
              </div>
            </div>
          ) : !brushFound ? (
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/30">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300 text-xs">Can't find your brush</span>
              </div>
            </div>
          ) : null}
          {combo > 1 && (
            <div className="flex justify-center mt-1.5">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-olo/20 backdrop-blur-sm border border-olo/40">
                <Zap className="w-3 h-3 text-olo-glow" />
                <span className="text-olo-glow text-xs font-bold">{combo}x combo</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Intro screen */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center bg-olo-deep">
          <div className="w-16 h-16 rounded-2xl bg-olo/15 flex items-center justify-center mb-5 olo-glow">
            <Crosshair className="w-8 h-8 text-olo-glow" />
          </div>
          <p className="text-olo-glow/50 text-xs font-medium tracking-[0.3em] uppercase mb-1">teewai presents</p>
          <h1 className="font-heading font-800 text-3xl text-white mb-2 olo-text-glow">Brush Coach</h1>
          <p className="text-white/50 text-sm mb-8 max-w-xs">
            Your camera tracks your toothbrush in real time. Obstacles appear for each part of your mouth — brush the right zone to clear them. Don't miss a single spot.
          </p>
          <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/5 border border-olo/20">
            <Zap className="w-4 h-4 text-olo-glow" />
            <span className="text-white/80 text-sm font-semibold">Score multiplier: {multiplierLabel}</span>
          </div>
          <button onClick={startCamera} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-8 py-3.5 rounded-2xl active:scale-95 transition-transform olo-glow">
            <Camera className="w-5 h-5" /> Enable camera
          </button>
          {nextMultiplier && (
            <p className="text-white/30 text-xs mt-6 max-w-xs">
              Unlock {nextMultiplier.label}: {nextMultiplier.scans} scans{nextMultiplier.streak ? ` + ${nextMultiplier.streak}-day streak` : ''}
            </p>
          )}
        </div>
      )}

      {/* Calibrate screen */}
      {phase === 'calibrate' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-12 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md rounded-2xl px-5 py-4 max-w-sm text-center">
            <Crosshair className="w-6 h-6 text-olo-glow mx-auto mb-2" />
            <p className="text-white font-heading font-600 text-sm mb-1">Tap your toothbrush</p>
            <p className="text-white/60 text-xs leading-relaxed">
              Hold your brush in front of the camera, then tap it on the screen to start tracking. Use a colored brush for best results.
            </p>
          </div>
        </div>
      )}

      {/* Complete screen */}
      {phase === 'complete' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center bg-black/50 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-olo/20 olo-glow">
            <Check className="w-8 h-8 text-olo-glow" />
          </div>
          <h2 className="font-heading font-700 text-2xl text-white mb-1">All zones clean!</h2>
          <p className="text-white/50 text-sm mb-6">{missCount === 0 ? 'Flawless run — not a single miss!' : `${missCount} miss${missCount !== 1 ? 'es' : ''} along the way.`}</p>

          <div className="flex gap-6 mb-8">
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider">Time</p>
              <p className="text-white font-heading font-700 text-3xl tabular-nums">{Math.floor(finalTime / 60)}:{String(Math.floor(finalTime % 60)).padStart(2, '0')}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider">Score</p>
              <p className="text-olo-glow font-heading font-700 text-3xl">{finalScore.toLocaleString()}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider">Best</p>
              <p className="text-white font-heading font-700 text-3xl tabular-nums">{Math.floor(bestTime / 60)}:{String(Math.floor(bestTime % 60)).padStart(2, '0')}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={playAgain} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl active:scale-95 transition-transform olo-glow">
              <Play className="w-4 h-4" /> Brush again
            </button>
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-6 py-3 rounded-2xl active:scale-95 transition-transform">
              Exit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Error screen */}
      {phase === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center bg-olo-deep">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <h2 className="font-heading font-700 text-xl text-white mb-2">Camera needed</h2>
          <p className="text-white/50 text-sm mb-6 max-w-xs">{camError}</p>
          <button onClick={startCamera} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl active:scale-95 transition-transform olo-glow">
            <Camera className="w-4 h-4" /> Try again
          </button>
        </div>
      )}
    </div>
  );
}