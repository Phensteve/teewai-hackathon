// Real-time voice coach for the scan camera.
//
// The alignment hook produces specific, directional text prompts. This module
// turns them into HUMAN-sounding voice by pre-generating each prompt once via
// the GenerateSpeech integration (warm "honey" voice — not the robotic browser
// TTS), caching the MP3 URLs in memory + localStorage so they're only generated
// once per device, then playing the matching clip as the prompt changes.
//
// Angle-specific prompts (for the full 5-angle scan) are also pre-generated so
// the coach can guide users through each capture angle with natural, conversational
// language rather than robotic commands.

import { unrufld } from '@/api/unrufldClient';

const VOICE = 'honey'; // warm, soft, human-sounding

const cache = new Map();
const inflight = new Map();

try {
  const saved = JSON.parse(localStorage.getItem('teewai_voice_cache') || '{}');
  for (const [k, v] of Object.entries(saved)) cache.set(k, v);
} catch {}

function persist() {
  try {
    const obj = {};
    for (const [k, v] of cache.entries()) obj[k] = v;
    localStorage.setItem('teewai_voice_cache', JSON.stringify(obj));
  } catch {}
}

// The finite set of alignment prompts the hook can emit — phrased conversationally
// so the coach sounds like a friendly human assistant, not a robot.
export const KNOWN_PROMPTS = [
  "Let's get your smile in the frame",
  "A bit dark — let's find some better light",
  "That's too bright — just move away from the light a little",
  "Give me a big smile — show those teeth",
  "Just move back a little",
  "Come a little closer so your teeth fill the frame",
  "Just a tiny bit to the left",
  "Just a tiny bit to the right",
  "Just a tiny bit up",
  "Just a tiny bit down",
  "Perfect — hold right there",
];

// Angle-specific prompts for the full 5-angle scan. Each angle has an intro
// line (played when the step starts) and a capture line (played when aligned).
export const ANGLE_PROMPTS = {
  front: {
    intro: "Okay, let's start with the front of your smile. Look straight at the camera and smile wide.",
    aligned: "Great — hold still, that's perfect.",
  },
  top: {
    intro: "Now let's get the top of your teeth. Turn your phone upside down and tilt your head back so I can see your upper teeth.",
    aligned: "Perfect — I can see your upper teeth clearly. Hold still.",
  },
  lower: {
    intro: "Next, let's capture your lower teeth. Lift the camera above your mouth and open wide.",
    aligned: "Nice — I can see your lower teeth. Hold right there.",
  },
  left: {
    intro: "Now let's get the left side. Turn your head to the right and pull your cheek back a little so I can see those side teeth.",
    aligned: "Got it — the left side looks great. Hold still.",
  },
  right: {
    intro: "Last one — the right side. Turn your head to the left and pull your cheek back so I can see the right side teeth.",
    aligned: "Perfect — that's all five. Great job!",
  },
};

// Flatten all angle prompts for prewarming
export const ALL_ANGLE_PROMPTS = Object.values(ANGLE_PROMPTS).flatMap((p) => [p.intro, p.aligned]);

export function ensureClip(text) {
  if (!text) return Promise.resolve(null);
  if (cache.has(text)) return Promise.resolve(cache.get(text));
  if (inflight.has(text)) return inflight.get(text);
  const p = (async () => {
    try {
      const res = await unrufld.integrations.Core.GenerateSpeech({ text, voice: VOICE });
      if (res?.url) { cache.set(text, res.url); persist(); return res.url; }
    } catch {}
    return null;
  })();
  inflight.set(text, p);
  p.then(() => inflight.delete(text), () => inflight.delete(text));
  return p;
}

// Generate all known prompts in the background (sequential, so the first one
// is ready quickly and we don't burst the API).
export function prewarm(prompts = [...KNOWN_PROMPTS, ...ALL_ANGLE_PROMPTS]) {
  (async () => {
    for (const p of prompts) {
      if (!cache.has(p)) await ensureClip(p);
    }
  })();
}

let lastSpoken = null;
let lastSpokenAt = 0;
let currentAudio = null;

export async function speak(text) {
  if (!text) return;
  if (text === lastSpoken && Date.now() - lastSpokenAt < 2500) return;
  lastSpoken = text;
  lastSpokenAt = Date.now();
  const url = await ensureClip(text);
  if (!url) return;
  if (currentAudio) { try { currentAudio.pause(); } catch {} }
  try {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.addEventListener('ended', () => { if (currentAudio === audio) currentAudio = null; });
    audio.play().catch(() => {});
  } catch {}
}

// Speak the intro prompt for a specific capture angle (full scan).
export function speakAngleIntro(angle) {
  const prompts = ANGLE_PROMPTS[angle];
  if (prompts) speak(prompts.intro);
}

// Speak the aligned/capture prompt for a specific angle.
export function speakAngleAligned(angle) {
  const prompts = ANGLE_PROMPTS[angle];
  if (prompts) speak(prompts.aligned);
}