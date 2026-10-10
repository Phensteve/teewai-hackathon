// Brush Coach engine — FPS-style 3-lane track. No lives, faster pace,
// crosshair reticle, vignette, speed lines. Camera PiP proves tracking.

const LANE_W = 0.24;
const ZONE_LANES = [-1, 0, 1, -1, 0, 1];
const MISS_Z = -0.05;
const BRUSH_MAX = 0.55;
const BRUSH_MIN = -0.08;
const PROGRESS_PER_MS = 1 / 4000;
const SPEED = 0.00009;
const lerp = (a, b, t) => a + (b - a) * t;

export const ZONE_LABELS = [
  { id: 0, short: 'UL', label: 'Upper Left' },
  { id: 1, short: 'UF', label: 'Upper Front' },
  { id: 2, short: 'UR', label: 'Upper Right' },
  { id: 3, short: 'LL', label: 'Lower Left' },
  { id: 4, short: 'LF', label: 'Lower Front' },
  { id: 5, short: 'LR', label: 'Lower Right' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makePillars() {
  return Array.from({ length: 10 }, (_, i) => ({ z: 1 - i * 0.1, side: i % 2 === 0 ? -1 : 1 }));
}

export function createGame(multiplier) {
  return {
    running: false, started: false, score: 0, missCount: 0,
    obstacle: null, particles: [], pillars: makePillars(),
    gridLines: Array.from({ length: 14 }, (_, i) => ({ z: 1 - i * (1 / 14) })),
    combo: 0, multiplier: multiplier || 1, time: 0,
    shake: 0, flash: 0, flashTimer: 0,
    queue: [], cleared: new Set(),
    avatarLane: 0, targetLane: 0, brushFound: false,
    spawnTimer: 0, currentZone: -1, currentLane: 0,
    comboFlash: { text: '', life: 0 }, burstRing: { x: 0, y: 0, life: 0 },
    canvasW: 400, canvasH: 700,
  };
}

export function startGame(g, multiplier) {
  g.running = true; g.started = true;
  g.score = 0; g.missCount = 0;
  g.obstacle = null; g.particles = []; g.pillars = makePillars();
  g.combo = 0; g.multiplier = multiplier || 1; g.time = 0;
  g.shake = 0; g.flash = 0; g.flashTimer = 0;
  g.queue = shuffle([0, 1, 2, 3, 4, 5]);
  g.cleared = new Set();
  g.avatarLane = 0; g.targetLane = 0; g.brushFound = false;
  g.spawnTimer = 300; g.currentZone = -1; g.currentLane = 0;
  g.comboFlash = { text: '', life: 0 }; g.burstRing = { x: 0, y: 0, life: 0 };
}

function spawnNext(g) {
  if (g.queue.length === 0) return;
  const zoneId = g.queue.shift();
  const label = ZONE_LABELS[zoneId];
  g.obstacle = {
    z: 1.15, zoneId, short: label.short, label: label.label,
    lane: ZONE_LANES[zoneId],
    progress: 0, cleared: false, missed: false, fade: 1,
    spawnFade: 0, popScale: 0.82,
  };
}

function spawnParticles(g) {
  const W = g.canvasW, H = g.canvasH;
  const vpY = H * 0.22, bottomY = H * 0.82;
  const y = lerp(vpY, bottomY, 0.85);
  const x = W / 2 + g.avatarLane * W * LANE_W;
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 6;
    g.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
      size: 1.5 + Math.random() * 4,
      color: Math.random() > 0.4 ? '#ffffff' : '#2dd4bf', life: 1,
    });
  }
}

export function updateGame(g, dt, brushX) {
  g.time += dt;
  const gridSpeed = g.running ? SPEED * 1.4 : 0.00012;

  for (const line of g.gridLines) { line.z -= gridSpeed * dt; if (line.z < 0) line.z += 1; }
  for (const p of g.pillars) { p.z -= gridSpeed * dt; if (p.z < 0) p.z += 1; }

  if (g.comboFlash.life > 0) g.comboFlash.life -= dt * 0.0014;
  if (g.burstRing.life > 0) g.burstRing.life -= dt * 0.002;

  if (!g.running) return;

  g.brushFound = brushX >= 0;
  if (g.brushFound) {
    g.targetLane = brushX < 0.33 ? -1 : brushX < 0.67 ? 0 : 1;
  }
  g.avatarLane += (g.targetLane - g.avatarLane) * Math.min(1, 0.014 * dt);

  if (!g.obstacle && g.queue.length > 0) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) spawnNext(g);
  }

  if (g.obstacle) {
    const o = g.obstacle;
    o.spawnFade = Math.min(1, o.spawnFade + dt * 0.005);
    o.popScale = Math.min(1, o.popScale + dt * 0.004);

    if (!o.cleared) {
      o.z -= SPEED * dt;
      const inBrushZone = o.z < BRUSH_MAX && o.z > BRUSH_MIN;
      const avatarInLane = g.brushFound && Math.abs(g.avatarLane - o.lane) < 0.4;

      g.currentZone = o.zoneId;
      g.currentLane = o.lane;

      if (avatarInLane && inBrushZone) {
        o.progress = Math.min(1, o.progress + PROGRESS_PER_MS * dt);
        if (o.progress >= 1) {
          o.cleared = true; o.fade = 1;
          g.combo++;
          g.score += Math.round(200 * g.multiplier * (1 + g.combo * 0.1));
          g.flash = 1; g.flashTimer = 0;
          spawnParticles(g);
          g.cleared.add(o.zoneId);
          g.spawnTimer = 400;
          g.comboFlash = { text: g.combo > 1 ? `${g.combo}x COMBO` : 'CLEAN!', life: 1 };
          g.burstRing = { x: g.canvasW / 2 + g.avatarLane * g.canvasW * LANE_W, y: g.canvasH * 0.82, life: 1 };
          if (g.cleared.size >= 6) g.running = false;
        }
      }
      if (!o.cleared && o.z < MISS_Z) {
        o.cleared = true; o.missed = true; o.fade = 1;
        g.combo = 0; g.missCount++;
        g.score = Math.max(0, g.score - 50);
        g.shake = 300; g.flash = -1; g.flashTimer = 0;
        g.queue.push(o.zoneId);
        g.spawnTimer = 300;
      }
    } else {
      o.fade -= dt * 0.003;
      if (o.fade <= 0) { g.obstacle = null; g.currentZone = -1; g.currentLane = 0; }
    }
  }

  for (const p of g.particles) {
    p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
    p.vy += 0.4 * dt * 0.001; p.life -= dt * 0.0022;
  }
  g.particles = g.particles.filter((p) => p.life > 0);

  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
  if (g.flash !== 0) {
    g.flashTimer += dt;
    if (g.flashTimer > 320) { g.flash = 0; g.flashTimer = 0; }
  }
}

export function renderGame(ctx, g, W, H) {
  g.canvasW = W; g.canvasH = H;
  const vpX = W / 2, vpY = H * 0.22, bottomY = H * 0.82;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#06141a'); bg.addColorStop(0.5, '#0a1e22'); bg.addColorStop(1, '#06141a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const rg = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, W * 0.55);
  rg.addColorStop(0, 'rgba(20,184,166,0.18)'); rg.addColorStop(1, 'rgba(20,184,166,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

  // Speed lines (FPS forward-motion feel)
  if (g.running) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + g.time * 0.0003;
      const t = ((g.time * 0.0005 + i * 0.16) % 1);
      const r = t * W * 0.5;
      const len = 10 + t * 10;
      ctx.strokeStyle = `rgba(45,212,191,${0.07 * (1 - t)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(vpX + Math.cos(angle) * r, vpY + Math.sin(angle) * r);
      ctx.lineTo(vpX + Math.cos(angle) * (r + len), vpY + Math.sin(angle) * (r + len));
      ctx.stroke();
    }
  }

  ctx.save();
  if (g.shake > 0) {
    const i = g.shake * 0.012;
    ctx.translate((Math.random() - 0.5) * i, (Math.random() - 0.5) * i);
  }

  for (const p of g.pillars) {
    if (p.z < 0.02 || p.z > 1) continue;
    renderPillar(ctx, p, W, H, vpX, vpY);
  }

  ctx.fillStyle = 'rgba(10,30,34,0.45)';
  ctx.beginPath();
  ctx.moveTo(W * 0.05, H); ctx.lineTo(W * 0.95, H);
  ctx.lineTo(vpX + 6, vpY); ctx.lineTo(vpX - 6, vpY);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = 'rgba(45,212,191,0.35)'; ctx.lineWidth = 2;
  ctx.shadowColor = '#2dd4bf'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(W * 0.05, H); ctx.lineTo(vpX, vpY);
  ctx.moveTo(W * 0.95, H); ctx.lineTo(vpX, vpY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(45,212,191,0.18)'; ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(W * 0.38, H); ctx.lineTo(vpX, vpY);
  ctx.moveTo(W * 0.62, H); ctx.lineTo(vpX, vpY);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const line of g.gridLines) {
    if (line.z < 0.02 || line.z > 1) continue;
    const t = 1 - line.z;
    const y = lerp(vpY, H, t);
    const lineW = W * 0.9 * t;
    ctx.strokeStyle = `rgba(45,212,191,${0.12 * t})`;
    ctx.lineWidth = 1 + t;
    ctx.beginPath();
    ctx.moveTo(vpX - lineW / 2, y); ctx.lineTo(vpX + lineW / 2, y);
    ctx.stroke();
  }

  if (g.running) {
    const laneX = W / 2 + g.avatarLane * W * LANE_W;
    const lg = ctx.createLinearGradient(0, vpY, 0, H);
    lg.addColorStop(0, 'rgba(45,212,191,0)');
    lg.addColorStop(0.7, 'rgba(45,212,191,0.04)');
    lg.addColorStop(1, 'rgba(45,212,191,0.1)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(vpX, vpY);
    ctx.lineTo(laneX - W * LANE_W * 0.45, H);
    ctx.lineTo(laneX + W * LANE_W * 0.45, H);
    ctx.closePath(); ctx.fill();
  }

  if (g.obstacle) renderObstacle(ctx, g.obstacle, g, W, H, vpX, vpY, bottomY);
  renderReticle(ctx, g, W, H, bottomY);

  for (const p of g.particles) {
    const a = Math.max(0, p.life);
    ctx.globalAlpha = a; ctx.fillStyle = p.color;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;

  if (g.burstRing.life > 0) {
    const r = (1 - g.burstRing.life) * 80;
    ctx.strokeStyle = `rgba(45,212,191,${g.burstRing.life * 0.6})`;
    ctx.lineWidth = 3; ctx.shadowColor = '#2dd4bf'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(g.burstRing.x, g.burstRing.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (g.comboFlash.life > 0) {
    const a = g.comboFlash.life;
    const y = H * 0.32 - (1 - a) * 40;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#2dd4bf';
    ctx.shadowColor = '#2dd4bf'; ctx.shadowBlur = 15;
    ctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.comboFlash.text, W / 2, y);
    ctx.restore();
  }

  ctx.restore();

  // Vignette (FPS immersion)
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H * 0.45, W * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // Timer (FPS HUD)
  if (g.running) {
    const elapsed = g.time / 1000;
    const secs = Math.floor(elapsed);
    const ms = Math.floor((elapsed % 1) * 100);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 18px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
    ctx.fillText(`${secs}.${String(ms).padStart(2, '0')}s`, W / 2, 32);
    ctx.shadowBlur = 0;
  }

  if (g.flash === 1) {
    ctx.fillStyle = `rgba(45,212,191,${Math.max(0, 0.15 * (1 - g.flashTimer / 320))})`;
    ctx.fillRect(0, 0, W, H);
  } else if (g.flash === -1) {
    ctx.fillStyle = `rgba(239,68,68,${Math.max(0, 0.22 * (1 - g.flashTimer / 320))})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function renderPillar(ctx, p, W, H, vpX, vpY) {
  const t = 1 - p.z;
  const baseY = lerp(vpY, H, t);
  const height = 100 * t;
  const baseX = p.side === -1 ? lerp(vpX - 3, W * 0.02, t) : lerp(vpX + 3, W * 0.98, t);
  const width = Math.max(1, 5 * t);

  ctx.fillStyle = `rgba(45,212,191,${0.1 * t})`;
  ctx.fillRect(baseX - width / 2, baseY - height, width, height);
  ctx.fillStyle = `rgba(45,212,191,${0.25 * t})`;
  ctx.shadowColor = '#2dd4bf'; ctx.shadowBlur = 10 * t;
  ctx.beginPath(); ctx.arc(baseX, baseY - height, width * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function renderObstacle(ctx, o, g, W, H, vpX, vpY, bottomY) {
  const t = 1 - o.z;
  const laneBottomX = W / 2 + o.lane * W * LANE_W;
  const sx = lerp(vpX, laneBottomX, t);
  const sy = lerp(vpY, bottomY, t);
  const scale = Math.max(0.08, t) * (o.popScale || 1);
  const bw = 72 * scale, bh = 92 * scale;
  const isActive = !o.cleared && g.brushFound && Math.abs(g.avatarLane - o.lane) < 0.4;
  const isCorrect = o.cleared && !o.missed;
  const isDanger = !o.cleared && o.z < 0.15 && !isActive;

  ctx.save();
  ctx.globalAlpha = (o.spawnFade || 1) * (o.fade ?? 1);
  ctx.translate(sx, sy);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, bh * 0.55, bw * 0.5, bh * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isDanger) {
    const danger = 1 - o.z / 0.15;
    const pulse = Math.sin(g.time * 0.025) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(239,68,68,${danger * pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, bw * 0.8, 0, Math.PI * 2); ctx.stroke();
  }

  const topColor = isCorrect ? 'rgba(45,212,191,0.22)' : o.missed ? 'rgba(239,68,68,0.15)' : isActive ? 'rgba(45,212,191,0.2)' : 'rgba(245,158,11,0.2)';
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, -bh / 2);
  ctx.lineTo(bw / 2, -bh / 2);
  ctx.lineTo(bw / 2 + bw * 0.1, -bh / 2 - bh * 0.14);
  ctx.lineTo(-bw / 2 + bw * 0.1, -bh / 2 - bh * 0.14);
  ctx.closePath(); ctx.fill();

  const bodyColor = isCorrect ? '#2dd4bf' : o.missed ? '#ef4444' : isActive ? '#2dd4bf' : '#f59e0b';
  const grad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
  if (isActive) { grad.addColorStop(0, 'rgba(45,212,191,0.35)'); grad.addColorStop(1, 'rgba(45,212,191,0.15)'); }
  else if (isCorrect) { grad.addColorStop(0, 'rgba(45,212,191,0.3)'); grad.addColorStop(1, 'rgba(45,212,191,0.1)'); }
  else if (o.missed) { grad.addColorStop(0, 'rgba(239,68,68,0.3)'); grad.addColorStop(1, 'rgba(239,68,68,0.1)'); }
  else { grad.addColorStop(0, 'rgba(255,255,255,0.98)'); grad.addColorStop(1, 'rgba(220,240,245,0.85)'); }
  ctx.fillStyle = grad;
  ctx.strokeStyle = bodyColor; ctx.lineWidth = 2;
  ctx.shadowColor = bodyColor; ctx.shadowBlur = isActive ? 25 : isDanger ? 18 : 15;
  const r = 12 * scale;
  ctx.beginPath();
  ctx.moveTo(-bw / 2 + r, -bh / 2);
  ctx.lineTo(bw / 2 - r, -bh / 2);
  ctx.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, -bh / 2 + r);
  ctx.lineTo(bw / 2, bh / 2 - r);
  ctx.quadraticCurveTo(bw / 2, bh / 2, bw / 2 - r, bh / 2);
  ctx.lineTo(-bw / 2 + r, bh / 2);
  ctx.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh / 2 - r);
  ctx.lineTo(-bw / 2, -bh / 2 + r);
  ctx.quadraticCurveTo(-bw / 2, -bh / 2, -bw / 2 + r, -bh / 2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  if (!o.cleared && scale > 0.25) {
    const ringR = bw / 2 + 7 * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 3 * scale;
    ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = isActive ? '#2dd4bf' : '#f59e0b';
    ctx.shadowColor = isActive ? '#2dd4bf' : '#f59e0b'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.progress);
    ctx.stroke(); ctx.shadowBlur = 0;
  }

  if (scale > 0.2) {
    ctx.fillStyle = isCorrect ? '#2dd4bf' : o.missed ? '#ef4444' : isActive ? '#2dd4bf' : '#0d9488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (isCorrect) {
      ctx.font = `bold ${30 * scale}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText('✓', 0, 0);
    } else {
      ctx.font = `bold ${20 * scale}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(o.short, 0, -8 * scale);
      ctx.font = `600 ${8.5 * scale}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = isActive ? 'rgba(45,212,191,0.85)' : 'rgba(13,148,136,0.7)';
      ctx.fillText(o.label, 0, 12 * scale);
    }
  }
  ctx.restore();
}

function renderReticle(ctx, g, W, H, bottomY) {
  const x = W / 2 + g.avatarLane * W * LANE_W;
  const y = bottomY - 40;
  const isActive = g.brushFound;
  const pulse = Math.sin(g.time * 0.008) * 2;
  const size = 22;
  const color = isActive ? '#2dd4bf' : '#f59e0b';

  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.shadowColor = color; ctx.shadowBlur = isActive ? 18 : 10;

  ctx.beginPath(); ctx.arc(x, y, size + pulse, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();

  const tick = 6;
  ctx.beginPath();
  ctx.moveTo(x - size - tick, y); ctx.lineTo(x - size + 2, y);
  ctx.moveTo(x + size - 2, y); ctx.lineTo(x + size + tick, y);
  ctx.moveTo(x, y - size - tick); ctx.lineTo(x, y - size + 2);
  ctx.moveTo(x, y + size - 2); ctx.lineTo(x, y + size + tick);
  ctx.stroke();
  ctx.restore();
}