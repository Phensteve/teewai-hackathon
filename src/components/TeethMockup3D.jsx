import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeTooth, buildGumArch, TYPE_DESC, POSITION_NAMES } from '@/lib/threeTooth';
import { getHealthColor, getHealthLabel } from '@/lib/unrufldteeth';
import { whitenessColor } from '@/lib/unrufldteeth';
import { X } from 'lucide-react';

// 3D teeth mockup that approximates the user's arch from a single scan.
// Each tooth is shaped like its real kind (incisor/canine/premolar/molar) and
// is clickable — tapping a tooth opens a popover with that tooth's analysis.
// Drag to orbit. This is a visual aid — NOT an accurate 3D model of the mouth.
export default function TeethMockup3D({ teeth, view = 'health' }) {
  const canvasRef = useRef(null);
  const teethRef = useRef(teeth);
  const [selected, setSelected] = useState(null);
  useEffect(() => { teethRef.current = teeth; }, [teeth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 6.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const gumMat = new THREE.MeshPhysicalMaterial({
      color: 0xc26f7e, roughness: 0.5, metalness: 0,
      clearcoat: 0.5, clearcoatRoughness: 0.5,
      sheen: 0.6, sheenColor: 0xffd9e0, sheenRoughness: 0.5,
    });

    const group = new THREE.Group();
    const R = 1.75;
    const meshes = [];

    // Anatomical angular positions (radians) for each tooth position 1-8.
    // Front teeth (incisors) are close together at the front of the arch;
    // canines start the curve; premolars and molars curve progressively
    // back along the dental arch. Spacing widens slightly toward the molars
    // to match real arch geometry (not a uniform fan).
    const ANGLES = [0.12, 0.38, 0.66, 0.94, 1.22, 1.52, 1.84, 2.18];

    // Count teeth per side per arch so the gum line spans only the teeth that
    // are actually present (not a fixed 7-tooth arc when only 4 were detected).
    const buildArch = () => {
      for (const m of meshes) { group.remove(m); m.geometry?.dispose?.(); m.material?.dispose?.(); }
      meshes.length = 0;
      const list = teethRef.current || [];
      for (const t of list) {
        // Mirror/selfie view: the whole group is rotated 180° around Y (so the
        // front teeth face the camera), which also flips left/right. Compensate
        // by swapping the side sign so the user's left teeth appear on the left
        // side of the screen — matching a mirror, not a clinician's chart view.
        const side = t.side === 'left' ? 1 : -1;
        const i = t.n - 1;
        const ang = side * (ANGLES[i] ?? (i * 0.30 + 0.12));
        const yOff = t.arch === 'upper' ? 0.52 : -0.52;
        const flip = t.arch === 'lower';
        // DoubleSide so the lower arch (flipped upside-down via negative Y
        // scale) doesn't render inside-out — a negative scale inverts face
        // winding, so FrontSide would cull the outer surface and show the hollow
        // interior. DoubleSide keeps the outer enamel lit correctly.
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(t.color), roughness: 0.12, metalness: 0,
          clearcoat: 1, clearcoatRoughness: 0.05,
          sheen: 0.9, sheenColor: 0xffffff, sheenRoughness: 0.25,
          envMapIntensity: 1.7,
          side: THREE.DoubleSide,
        });
        const tooth = makeTooth(t.type, mat);
        tooth.userData = { tooth: t };
        const inset = i >= 4 ? 0.1 : 0;
        tooth.position.set(
          Math.sin(ang) * (R - inset) + t.posOffset * side,
          yOff,
          -Math.cos(ang) * (R - inset) * 0.85 - 0.1,
        );
        tooth.rotation.y = -ang + t.rotY;
        const s = t.scale * (1 - i * 0.045);
        tooth.scale.set(s, flip ? -s : s, s);
        group.add(tooth);
        meshes.push(tooth);
      }
    };
    buildArch();

    // Adaptive gum arches — span only the teeth that are actually present.
    // Find the max tooth number per arch to size the gum arc correctly.
    const list = teethRef.current || [];
    const archMaxN = { upper: 0, lower: 0 };
    for (const t of list) {
      if (t.arch === 'upper' || t.arch === 'lower') {
        archMaxN[t.arch] = Math.max(archMaxN[t.arch], t.n);
      }
    }
    // If no teeth were detected for an arch, default to 7 so the gum still
    // renders as a reasonable horseshoe (the arch is empty of teeth anyway).
    const upperCount = Math.max(archMaxN.upper, 7);
    const lowerCount = Math.max(archMaxN.lower, 7);
    // Gum arch span: map the tooth count to the arch step so the gum line
    // covers exactly the teeth present (more teeth = wider gum horseshoe).
    const gumStep = (count) => {
      // Interpolate: 4 teeth → 0.30 rad step, 8 teeth → 0.30 rad step
      // (the ANGLES table already encodes the anatomical spacing, so we
      // just match the last angle for the given count).
      const idx = Math.min(count, 8) - 1;
      return ANGLES[idx] ?? 2.18;
    };
    const upperSpan = gumStep(upperCount);
    const lowerSpan = gumStep(lowerCount);

    group.add(buildGumArch({ R, y: 0.52, mat: gumMat, radius: 0.34, count: upperCount, step: upperSpan / Math.max(upperCount - 1, 1), start: ANGLES[0] }));
    group.add(buildGumArch({ R, y: -0.52, mat: gumMat, radius: 0.34, count: lowerCount, step: lowerSpan / Math.max(lowerCount - 1, 1), start: ANGLES[0] }));
    group.rotation.y = Math.PI;
    group.scale.setScalar(0.86);
    group.traverse((o) => { o.frustumCulled = false; });
    scene.add(group);

    const key = new THREE.PointLight(0xffffff, 6.5, 20);
    key.position.set(2.4, 3.2, 4.2);
    const rim = new THREE.PointLight(0x5eead4, 2.4, 16);
    rim.position.set(-3.2, -1, 2);
    scene.add(key, rim, new THREE.AmbientLight(0x2a5050, 1.3));

    // Raycasting for clickable teeth
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let yaw = Math.PI;
    let pitch = 0.1;
    const spin = reduceMotion ? 0.04 : 0.12;
    let dragging = false;
    let lastX = 0, lastY = 0, vel = 0;
    let downX = 0, downY = 0;

    const down = (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      downX = e.clientX; downY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.008; vel = dx * 0.008;
      pitch = Math.max(-0.5, Math.min(0.6, pitch + dy * 0.005));
    };
    const up = (e) => {
      dragging = false;
      // Treat as a click (not a drag) if the pointer barely moved.
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist < 6) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(meshes, true);
        if (hits.length) {
          let obj = hits[0].object;
          while (obj && !obj.userData?.tooth) obj = obj.parent;
          if (obj?.userData?.tooth) {
            setSelected({ tooth: obj.userData.tooth, x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height });
          }
        } else {
          setSelected(null);
        }
      }
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);
    canvas.addEventListener('pointercancel', up);

    const resize = () => {
      const w = parent?.clientWidth || 480;
      const h = parent?.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (parent) ro.observe(parent);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    if (parent) io.observe(parent);

    const clock = new THREE.Clock();
    const damp = (c, target, rate, dt) => c + (target - c) * (1 - Math.exp(-rate * dt));
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || document.hidden) return;
      if (!dragging) { vel = damp(vel, 0, 3, dt); yaw += vel + spin * dt; }
      group.rotation.y = damp(group.rotation.y, yaw, 9, dt);
      group.rotation.x = damp(group.rotation.x, pitch, 6, dt);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', up);
      canvas.removeEventListener('pointercancel', up);
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    };
  }, [view]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none" />
      {selected && <ToothPopover data={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ToothPopover({ data, onClose }) {
  const { tooth, x, y, w, h } = data;
  const raw = tooth.raw || {};
  const typeName = POSITION_NAMES[tooth.n - 1] || tooth.type;
  const desc = TYPE_DESC[tooth.type] || '';
  const health = raw.health_score ?? tooth.health;
  const whiteness = raw.whiteness_score ?? tooth.whiteness;
  const conditions = Array.isArray(raw.conditions) ? raw.conditions : [];
  const segments = Array.isArray(raw.color_segments) ? raw.color_segments : [];
  const pw = 224;
  const left = Math.max(8, Math.min(x - pw / 2, w - pw - 8));
  const below = y < h / 2;
  return (
    <div className="absolute z-20 animate-fade-up" style={{ left, width: pw, top: below ? y + 12 : undefined, bottom: below ? undefined : h - y + 12 }}>
      <div className="rounded-2xl border border-border bg-card shadow-2xl p-3.5 text-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-heading font-700 text-base text-foreground">{tooth.id}</p>
            <p className="text-xs text-muted-foreground capitalize">{typeName}</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {desc && <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{desc}</p>}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-xl bg-muted/50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</p>
            <p className="font-heading font-700 text-lg" style={{ color: getHealthColor(segments[0]?.health) }}>{health ?? '—'}<span className="text-xs text-muted-foreground">/100</span></p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Whiteness</p>
            <p className="font-heading font-700 text-lg" style={{ color: whitenessColor(whiteness) }}>{whiteness ?? '—'}<span className="text-xs text-muted-foreground">/100</span></p>
          </div>
        </div>
        {conditions.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Conditions</p>
            <div className="flex flex-wrap gap-1">
              {conditions.map((c, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-full bg-olo/10 text-olo text-[10px] font-medium capitalize">{c.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}
        {segments.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Color segments</p>
            <div className="space-y-1">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getHealthColor(s.health) }} />
                  <span className="text-[10px] text-muted-foreground capitalize">{s.area} · {getHealthLabel(s.health)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {conditions.length === 0 && segments.length === 0 && (
          <p className="text-xs text-muted-foreground">No issues detected on this tooth.</p>
        )}
      </div>
    </div>
  );
}