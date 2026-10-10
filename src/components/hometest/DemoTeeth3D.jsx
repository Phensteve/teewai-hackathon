import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeTooth, buildGumArch, TYPES } from '@/lib/threeTooth';

const ENAMEL = 0xfffcf6;
const GUM = 0xc26f7e;

// The arch travels along Z: it waits deep in the background, glides forward
// into the scan frame, locks dead still front-on for the read, then retreats.
// FRONT_YAW faces the labial (outer) surfaces toward the camera.
const FRONT_YAW = Math.PI;
const PHASES = {
  idle:     { z: -9.0, scale: 0.94, opacity: 0, spin: 0.4,  lock: false, tilt: 0.42 },
  entering: { z: 0,    scale: 0.9,  opacity: 1, spin: 0.28, lock: false, tilt: 0.34 },
  scanning: { z: 0,    scale: 0.9,  opacity: 1, spin: 0,    lock: true,  tilt: 0.26 },
  results:  { z: 0,    scale: 0.9,  opacity: 1, spin: 0.05, lock: true,  tilt: 0.26 },
  leaving:  { z: -9.0, scale: 0.94, opacity: 0, spin: 0.4,  lock: false, tilt: 0.42 },
};

export default function DemoTeeth3D({ phase = 'idle', highlight = false }) {
  const canvasRef = useRef(null);
  const phaseRef = useRef(phase);
  const highlightRef = useRef(highlight);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { highlightRef.current = highlight; }, [highlight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 60);
    camera.position.set(0, 0.1, 5.9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Lightweight enamel — no transmission/iridescence here (this scene is a
    // secondary element; keeping the shader cheap protects scroll performance).
    const enamelProto = new THREE.MeshPhysicalMaterial({
      color: ENAMEL, roughness: 0.13, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.06,
      sheen: 0.9, sheenColor: 0xffffff, sheenRoughness: 0.25,
      emissive: 0x9ff5e6, emissiveIntensity: 0,
      // depthWrite stays ON — with it off, transparent crowns sort against each
      // other and individual teeth blink out as the arch rotates.
      envMapIntensity: 1.1, transparent: true, depthWrite: true,
    });
    const gumMat = new THREE.MeshPhysicalMaterial({
      color: GUM, roughness: 0.5, metalness: 0,
      clearcoat: 0.5, clearcoatRoughness: 0.5,
      sheen: 0.6, sheenColor: 0xffd9e0, sheenRoughness: 0.5,
      transparent: true,
    });

    const group = new THREE.Group();
    const R = 1.75;
    const teeth = [];
    const mats = [gumMat];

    const buildArch = (yOff, flip) => {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const ang = side * (i * 0.26 + 0.14);
          const x = Math.sin(ang) * R;
          const z = -Math.cos(ang) * R * 0.85 - 0.1;
          const s = 1 - i * 0.05;
          const mat = enamelProto.clone();
          const tooth = makeTooth(TYPES[i], mat);
          tooth.position.set(x, yOff, z);
          tooth.rotation.y = -ang;
          tooth.scale.set(s, flip ? -s : s, s);
          tooth.userData = { mat, xNorm: x / R };
          group.add(tooth);
          teeth.push(tooth);
          mats.push(mat);
        }
      }
    };
    buildArch(0.55, false);
    buildArch(-0.55, true);

    group.add(buildGumArch({ R, y: 0.55, mat: gumMat }));
    group.add(buildGumArch({ R, y: -0.55, mat: gumMat }));

    // Centred vertically — a negative Y here pushed the lower arch out of frame.
    group.position.set(0, 0, PHASES.idle.z);
    group.rotation.x = 0.5;
    group.rotation.y = FRONT_YAW;
    group.scale.setScalar(PHASES.idle.scale);
    group.traverse((o) => { o.frustumCulled = false; });
    scene.add(group);

    const key = new THREE.PointLight(0xffffff, 6, 20);
    key.position.set(2.4, 3.2, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0x5eead4, 2.2, 16);
    rim.position.set(-3.2, -1, 2);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x183b3b, 1.1));

    let raf = 0;
    const clock = new THREE.Clock();
    const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
    let yaw = FRONT_YAW;
    let curScale = PHASES.idle.scale;
    let curOpacity = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    if (parent) io.observe(parent);

    const resize = () => {
      const w = parent?.clientWidth || 640;
      const h = parent?.clientHeight || 480;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (parent) ro.observe(parent);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const cfg = PHASES[phaseRef.current] || PHASES.idle;

      // Skip GPU work when off-screen, hidden, or fully faded and settled.
      const settled = cfg.opacity === 0 && curOpacity < 0.01 && Math.abs(group.position.z - cfg.z) < 0.05;

      const spin = reduceMotion ? cfg.spin * 0.25 : cfg.spin;
      if (!cfg.lock) {
        yaw += spin * dt;
      } else {
        // Ease to the front-on angle by the shortest path, then hold still.
        let target = FRONT_YAW + (cfg.spin ? Math.sin(t * 0.25) * 0.1 : 0);
        target += Math.round((yaw - target) / (Math.PI * 2)) * Math.PI * 2;
        yaw = damp(yaw, target, 2.6, dt);
      }
      group.rotation.y = yaw;
      group.rotation.x = damp(group.rotation.x, cfg.tilt, 2.2, dt);

      curScale = damp(curScale, cfg.scale, 2.4, dt);
      group.scale.setScalar(curScale);
      group.position.z = damp(group.position.z, cfg.z, 1.9, dt);
      curOpacity = damp(curOpacity, cfg.opacity, 2.6, dt);
      for (const m of mats) m.opacity = curOpacity;
      group.visible = curOpacity > 0.01;

      // Scan glow sweeping tooth to tooth while the beam passes.
      const sweep = highlightRef.current ? Math.sin(t * 1.5) * 1.05 : -99;
      for (const tooth of teeth) {
        const u = tooth.userData;
        const glow = Math.exp(-Math.pow(u.xNorm - sweep, 2) / 0.05) * 0.5;
        u.mat.emissiveIntensity = damp(u.mat.emissiveIntensity, glow, 8, dt);
      }

      if (!settled && visible && !document.hidden) renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
}