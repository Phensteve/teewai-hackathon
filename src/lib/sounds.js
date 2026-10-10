// Delightful sound system using Web Audio API — no external files needed.
// Inspired by Phantom's tactile feedback and Duolingo's celebration sounds.

let ctx = null;
let muted = false;
let initialized = false;

const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
};

const tone = (freq, duration, type = 'sine', volume = 0.12, when = 0) => {
  if (muted) return;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ac.destination);
  const start = ac.currentTime + when;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
};

const chord = (freqs, duration, type = 'sine', volume = 0.1) => {
  freqs.forEach((f) => tone(f, duration, type, volume));
};

const arpeggio = (freqs, step, type = 'triangle', volume = 0.12) => {
  freqs.forEach((f, i) => tone(f, step * 0.7, type, volume, i * step));
};

// Initialize audio on first user interaction (browsers require this)
export const initAudio = () => {
  if (initialized) return;
  initialized = true;
  getCtx().resume();
};

export const setMuted = (m) => { muted = m; };
export const isMuted = () => muted;

// Subtle UI tap
export const playClick = () => {
  tone(600, 0.04, 'sine', 0.06);
};

// Camera shutter when taking a scan photo
export const playShutter = () => {
  tone(1500, 0.03, 'square', 0.08);
  setTimeout(() => tone(800, 0.06, 'sine', 0.06), 30);
};

// Scan analysis in progress — gentle ambient pulse
export const playAnalyzing = () => {
  tone(440, 0.3, 'sine', 0.04);
  setTimeout(() => tone(554, 0.3, 'sine', 0.04), 200);
  setTimeout(() => tone(659, 0.3, 'sine', 0.04), 400);
};

// Scan complete — delightful rising chime
export const playSuccess = () => {
  arpeggio([523, 659, 784], 0.1, 'sine', 0.1);
  setTimeout(() => chord([784, 988], 0.3, 'sine', 0.08), 300);
};

// Reward reveal — pitch scales with rarity (VRR excitement)
export const playReward = (rarity = 'common') => {
  const bases = {
    common: [523, 659],
    bonus: [523, 659, 784],
    rare: [587, 740, 880],
    discount: [523, 659, 784],
    charm: [659, 880, 1047],
    jackpot: [523, 659, 784, 1047, 1319],
  };
  const notes = bases[rarity] || bases.common;
  arpeggio(notes, 0.08, 'triangle', 0.12);
  if (rarity === 'jackpot') {
    setTimeout(() => chord([1047, 1319, 1568], 0.5, 'sine', 0.1), notes.length * 80);
  }
};

// Rank up — fanfare
export const playLevelUp = () => {
  arpeggio([523, 659, 784, 1047], 0.1, 'triangle', 0.13);
  setTimeout(() => chord([784, 1047, 1319], 0.4, 'sine', 0.1), 400);
};

// Streak milestone — warm ascending
export const playStreak = () => {
  arpeggio([440, 554, 659], 0.08, 'sine', 0.1);
};

// Jackpot — rare, over-the-top
export const playJackpot = () => {
  arpeggio([523, 659, 784, 1047, 1319, 1568], 0.07, 'triangle', 0.14);
  setTimeout(() => chord([1047, 1319, 1568, 2093], 0.6, 'sine', 0.12), 500);
};

// Milestone unlocked — bright sparkle
export const playMilestone = () => {
  arpeggio([784, 988, 1175], 0.08, 'triangle', 0.11);
  setTimeout(() => tone(1568, 0.3, 'sine', 0.1), 250);
};

// Whoosh — for transitions and reveals
export const playWhoosh = () => {
  const ac = getCtx();
  if (muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.2);
  gain.gain.setValueAtTime(0.06, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.2);
};

// Error / setback — gentle, not harsh
export const playError = () => {
  tone(300, 0.15, 'sine', 0.06);
  setTimeout(() => tone(250, 0.15, 'sine', 0.06), 100);
};

// Confetti celebration — bright sparkling burst, played at every confetti blast
// (first-scan reveal, post-scan celebration, reward drops).
export const playConfetti = () => {
  arpeggio([784, 988, 1175, 1568], 0.06, 'triangle', 0.1);
  setTimeout(() => chord([1047, 1319], 0.3, 'sine', 0.08), 120);
};

// Claim reward — satisfying confirmation chime when a user collects a drop.
export const playClaim = () => {
  chord([659, 988, 1319], 0.25, 'sine', 0.1);
  setTimeout(() => tone(1568, 0.2, 'sine', 0.08), 80);
};

// Subtle chime — the quiet-luxury milestone sound. A soft, refined ascending
// tone replacing the confetti burst. Used by the gold refraction wave on
// milestones and rank promotions.
export const playChime = () => {
  tone(880, 0.4, 'sine', 0.08);
  setTimeout(() => tone(1318, 0.5, 'sine', 0.06), 150);
  setTimeout(() => tone(1760, 0.6, 'sine', 0.04), 300);
};