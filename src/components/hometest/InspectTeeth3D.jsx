import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeTooth, buildGumArch, TYPES, POSITION_NAMES, TYPE_DESC } from '@/lib/threeTooth';

const ENAMEL = 0xffffff;
const GUM = 0xc26f7e;

// Inspectable arch: drag to orbit/tilt, click a tooth to select it (the scene
// eases in on the pick and reports it back so the card can show its details).
export default function InspectTeeth3D({ onSelect, selectedId }) {
  const canvasRef = useRef(null);
  const selectedRef = useRef(selectedId);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, isMobile ? 5.5 : 6.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Environment reflections are what make enamel read bright and glossy —
    // without them the teeth looked flat and grey-ish.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const enamelProto = new THREE.MeshPhysicalMaterial({
      color: ENAMEL, roughness: 0.1, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.05,
      sheen: 0.9, sheenColor: 0xffffff, sheenRoughness: 0.25,
      emissive: 0x9ff5e6, emissiveIntensity: 0,
      envMapIntensity: 1.7,
    });
    const gumMat = new THREE.MeshPhysicalMaterial({
      color: GUM, roughness: 0.5, metalness: 0,
      clearcoat: 0.5, clearcoatRoughness: 0.5,
      sheen: 0.6, sheenColor: 0xffd9e0, sheenRoughness: 0.5,
    });

    const group = new THREE.Group();
    const R = 1.75;
    const teeth = [];
    for (const [yOff, flip] of [[0.52, false], [-0.52, true]]) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const ang = side * (i * 0.26 + 0.14);
          const s = 1 - i * 0.05;
          const mat = enamelProto.clone();
          const tooth = makeTooth(TYPES[i], mat);
          // Back teeth are wider than the gum tube, so they sit a touch deeper
          // into the arch — otherwise the molars pop out in front of the gums.
          const inset = i >= 4 ? 0.1 : 0;
          tooth.position.set(Math.sin(ang) * (R - inset), yOff, -Math.cos(ang) * (R - inset) * 0.85 - 0.1);
          tooth.rotation.y = -ang;
          tooth.scale.set(s, flip ? -s : s, s);
          tooth.userData = {
            tooth: true, mat, baseY: flip ? -s : s, baseS: s,
            id: `${flip ? 'L' : 'U'}${side}${i}`,
            label: `${flip ? 'Lower' : 'Upper'} ${side < 0 ? 'left' : 'right'} ${POSITION_NAMES[i].toLowerCase()}`,
            type: TYPES[i].charAt(0).toUpperCase() + TYPES[i].slice(1),
            desc: TYPE_DESC[TYPES[i]],
          };
          group.add(tooth);
          teeth.push(tooth);
        }
      }
    }
    // Slightly fatter gum tube so every crown is properly seated in tissue.
    group.add(buildGumArch({ R, y: 0.52, mat: gumMat, radius: 0.34 }));
    group.add(buildGumArch({ R, y: -0.52, mat: gumMat, radius: 0.34 }));
    group.rotation.y = Math.PI;
    group.scale.setScalar(isMobile ? 1.18 : 0.86);
    group.traverse((o) => { o.frustumCulled = false; });
    scene.add(group);

    const key = new THREE.PointLight(0xffffff, 6.5, 20);
    key.position.set(2.4, 3.2, 4.2);
    const rim = new THREE.PointLight(0x5eead4, 2.4, 16);
    rim.position.set(-3.2, -1, 2);
    scene.add(key, rim, new THREE.AmbientLight(0x2a5050, 1.3));

    // --- interaction ---------------------------------------------------------
    let yaw = Math.PI;
    let pitch = 0.1;
    const spin = reduceMotion ? 0.04 : 0.14;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let vel = 0;
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const pickAt = (e) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(group.children, true);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData?.tooth) o = o.parent;
        if (o) return o;
      }
      return null;
    };

    const down = (e) => {
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.008;
      vel = dx * 0.008;
      pitch = Math.max(-0.5, Math.min(0.6, pitch + dy * 0.005));
    };
    const up = (e) => {
      if (dragging && moved < 6) {
        const hit = pickAt(e);
        onSelect?.(hit ? { ...hit.userData, id: hit.userData.id } : null);
      }
      dragging = false;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });

    const resize = () => {
      const w = parent?.clientWidth || 480;
      const h = parent?.clientHeight || 380;
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
      const t = clock.getElapsedTime();
      if (!visible || document.hidden) return;

      const sel = selectedRef.current;
      if (!dragging) {
        vel = damp(vel, 0, 3, dt);
        // A selected tooth holds still so it can actually be read.
        yaw += vel + (sel ? 0 : spin * dt);
      }
      group.rotation.y = damp(group.rotation.y, yaw, 9, dt);
      group.rotation.x = damp(group.rotation.x, pitch, 6, dt);
      group.position.y = Math.sin(t * 0.6) * 0.025;
      // Ease in when a tooth is picked.
      camera.position.z = damp(camera.position.z, sel ? 5.2 : 6.8, 3, dt);
      camera.lookAt(0, 0, 0);

      for (const tooth of teeth) {
        const u = tooth.userData;
        const isSel = sel && u.id === sel;
        const f = isSel ? 1.18 : 1;
        tooth.scale.x = damp(tooth.scale.x, u.baseS * f, 10, dt);
        tooth.scale.y = damp(tooth.scale.y, u.baseY * f, 10, dt);
        tooth.scale.z = damp(tooth.scale.z, u.baseS * f, 10, dt);
        const glow = isSel ? 0.5 : (sel ? 0 : Math.exp(-Math.pow(Math.sin(t * 0.5) * 1.05 - Math.sin(0), 2)) * 0);
        u.mat.emissiveIntensity = damp(u.mat.emissiveIntensity, glow, 7, dt);
      }
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
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    };
  }, [onSelect]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none" />;
}