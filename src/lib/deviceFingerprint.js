// deviceFingerprint.js — generates a device hash from canvas, WebGL, screen,
// and browser properties. Used to limit free account creation to 3 per device
// and to track device/account associations.
//
// The fingerprint combines stable browser properties that are consistent
// across sessions on the same device (canvas rendering, GPU, screen resolution,
// timezone, language). It works across normal/incognito sessions on the same
// browser. Cross-browser matching is approximate (same device, different
// browsers share screen/timezone but differ on canvas/WebGL).

const STORAGE_KEY = 'teewai_device_hash';

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function sha256(data) {
  try {
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return hashString(data);
}

function canvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle = '#069';
    ctx.fillText('teewai-fp ☺', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('teewai-fp ☺', 4, 4);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function webglFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    return `${vendor}|${renderer}`;
  } catch {
    return '';
  }
}

export async function generateDeviceFingerprint() {
  const components = [
    canvasFingerprint(),
    webglFingerprint(),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    `${screen.availWidth}x${screen.availHeight}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.language || '',
    (navigator.languages || []).join(','),
    navigator.platform || '',
    String(navigator.hardwareConcurrency || 0),
    String(navigator.maxTouchPoints || 0),
    navigator.userAgent.slice(0, 100),
  ];
  return sha256(components.join('||'));
}

// Get or generate the cached device hash (stored in localStorage so it's
// stable across sessions on the same browser).
export async function getDeviceFingerprint() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch {}
  const hash = await generateDeviceFingerprint();
  try { localStorage.setItem(STORAGE_KEY, hash); } catch {}
  return hash;
}

// Client-side check: count registrations from this browser via localStorage.
// This is a fallback for the server-side IP check — it catches same-browser
// abuse but not cross-browser. The server-side check (checkIpRegistration)
// handles the IP-based enforcement.
export function getLocalRegistrationCount() {
  try {
    return parseInt(localStorage.getItem('teewai_reg_count') || '0', 10);
  } catch {
    return 0;
  }
}

export function incrementLocalRegistrationCount() {
  try {
    const count = getLocalRegistrationCount() + 1;
    localStorage.setItem('teewai_reg_count', String(count));
    return count;
  } catch {
    return 0;
  }
}

export const MAX_FREE_ACCOUNTS = 3;