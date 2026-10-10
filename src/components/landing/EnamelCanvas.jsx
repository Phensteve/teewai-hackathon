import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeTooth } from '@/lib/threeTooth';

// Lightweight single-tooth 3D enamel render for landing feature cards. One
// sculpted tooth (incisor / canine / premolar / molar) with a glassy clearcoat
// material, olo-tinted rim light and a warm champagne key — clinical-luxury,
// not industrial chrome. Slow auto-rotation, paused when off-screen (GPU
// economy) and static for prefers-reduced-motion.
export default function EnamelCanvas({ variant = 'incisor', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, 0.3, 4.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Enamel material — warm ivory with a glassy clearcoat and an olo-tinted sheen.
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#f4efe6'),
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      sheen: 0.9,
      sheenColor: new THREE.Color('#5eead4'),
      sheenRoughness: 0.3,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
    });

    const tooth = makeTooth(variant, mat);
    tooth.scale.setScalar(1.5);
    tooth.position.y = -0.25;
    scene.add(tooth);

    // Warm champagne key + olo-tinted rim — clinical-luxury lighting.
    const key = new THREE.PointLight(0xfff0d8, 5.5, 18);
    key.position.set(2.2, 2.8, 3.2);
    const rim = new THREE.PointLight(0x2dd4bf, 3.2, 16);
    rim.position.set(-3, -0.8, 1.6);
    scene.add(key, rim, new THREE.AmbientLight(0x1a3a3a, 1.2));

    const resize = () => {
      const w = parent?.clientWidth || 320;
      const h = parent?.clientHeight || 320;
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

    let raf = 0;
    let yaw = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || document.hidden) return;
      if (!reduceMotion) yaw += dt * 0.18;
      tooth.rotation.y = yaw;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    };
  }, [variant]);

  return <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${className}`} aria-hidden="true" />;
}