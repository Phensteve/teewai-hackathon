// VITA Classical shade ordering + helpers — shared by VitaShadeScale and the
// private VITA whitening timeline. Lightest → darkest.
//
// Hex values are calibrated from teewai's VITA Classical reference card — the
// shade-guide image shown on the "Why we need a reference" page — sampled per
// tab. Shades are ordered by measured lightness (L*, lightest → darkest) so
// the ladder reads as a true light→dark gradient matching what the user sees
// on the reference card. The bleached (0M) group sits above every natural
// shade; within the natural group, hue varies by family (A reddish-brown,
// B reddish-yellow, C greyish, D reddish-grey) while lightness decreases
// monotonically down the ladder.

export const BLEACHED = [
  { code: '0M1', hex: '#FDFDFC' },
  { code: '0M2', hex: '#FBFAF7' },
  { code: '0M3', hex: '#F5EEDF' },
];

export const VITA_ORDER = [
  { code: 'A1',   hex: '#FBFAF5' },
  { code: 'B1',   hex: '#F4EEE0' },
  { code: 'A2',   hex: '#E9DCC5' },
  { code: 'A3',   hex: '#E2D3B9' },
  { code: 'B2',   hex: '#E3D3B7' },
  { code: 'A3.5', hex: '#E0CCA9' },
  { code: 'C1',   hex: '#C4C1BC' },
  { code: 'B3',   hex: '#DEC69F' },
  { code: 'C2',   hex: '#BAB7B1' },
  { code: 'B4',   hex: '#D8C291' },
  { code: 'D2',   hex: '#B29D99' },
  { code: 'A4',   hex: '#C9A978' },
  { code: 'C3',   hex: '#A4A29D' },
  { code: 'D3',   hex: '#A48C89' },
  { code: 'D4',   hex: '#978480' },
  { code: 'C4',   hex: '#8B8A87' },
];

// Absolute ladder: bleached (0..2) then natural (3..18). 19 steps total.
export const ALL_SHADES = [...BLEACHED, ...VITA_ORDER];
export const TOTAL_STEPS = ALL_SHADES.length;

export const norm = (s) => (s || '').toUpperCase().replace(/VITA\s*/g, '').replace(/\s+/g, '').trim();
export const isBleached = (code) => /^0M/i.test(norm(code));

// Absolute index on the ladder (0 = lightest). -1 if the code isn't recognised.
export function shadeIndex(code) {
  const c = norm(code);
  if (!c) return -1;
  const b = BLEACHED.findIndex((v) => v.code === c);
  if (b >= 0) return b;
  const n = VITA_ORDER.findIndex((v) => v.code === c);
  return n >= 0 ? n + BLEACHED.length : -1;
}

export function shadeByCode(code) {
  const c = norm(code);
  return ALL_SHADES.find((v) => v.code === c) || null;
}