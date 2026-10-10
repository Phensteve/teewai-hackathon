import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { makeTooth, buildGumArch, TYPES, POSITION_NAMES, TYPE_DESC } from '@/lib/threeTooth';

const ENAMEL = 0xfffcf6;
const GUM = 0xc26f7e;
const ACCENT = 0x2dd4bf;

export default function HomeTestCanvas() {
  const canvasRef = useRef(null);
  const scroll = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  // Start facing the front (labial) surfaces, matching the live-demo scanner.
  const rotY = useRef(Math.PI);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Mobile GPUs pay heavily for transmission/iridescence and full-res bloom,
    // so the expensive passes are scaled down rather than dropped.
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const maxDpr = isMobile ? 1 : 1.5;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06121a, 0.018);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.3, 6.4);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setClearColor(0x06121a, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomRes = new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5);
    const bloom = new UnrealBloomPass(bloomRes, 0.42, 0.5, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Adaptive resolution scaling (DRS): the scene keeps every material, light
    // and effect, but the internal render resolution steps down when the device
    // can't hold ~45fps and creeps back up when it can. Bloom softens the
    // difference so it's visually imperceptible — fidelity stays, jank goes.
    let quality = 1;
    let qAcc = 0;
    let qN = 0;
    const baseDpr = Math.min(window.devicePixelRatio, maxDpr);
    const applyQuality = () => {
      const pr = Math.max(0.55, baseDpr * quality);
      renderer.setPixelRatio(pr);
      composer.setPixelRatio(pr);
    };

    const enamelProto = new THREE.MeshPhysicalMaterial({
      color: ENAMEL, roughness: 0.1, metalness: 0,
      clearcoat: 1.0, clearcoatRoughness: 0.04,
      sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.22,
      ...(isMobile ? {} : {
        iridescence: 0.25, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400],
      }),
      specularIntensity: 1.0,
      emissive: 0xfff0e0, emissiveIntensity: 0,
      envMapIntensity: 2.2, transparent: true, depthWrite: true, side: THREE.FrontSide,
    });
    const gumMat = new THREE.MeshPhysicalMaterial({
      color: GUM, roughness: 0.45, metalness: 0,
      clearcoat: 0.6, clearcoatRoughness: 0.45,
      sheen: 0.6, sheenColor: 0xffd9e0, sheenRoughness: 0.5,
      envMapIntensity: 0.6, transparent: true,
    });
    const accent = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.2, transparent: true });
    const fadeMats = [gumMat, accent];

    const group = new THREE.Group();
    const R = 1.75;
    const teeth = [];

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
          tooth.userData = {
            tooth: true,
            base: { x: s, y: flip ? -s : s, z: s },
            mat,
            delay: i * 0.09 + (flip ? 0.14 : 0) + (side < 0 ? 0.045 : 0),
            xNorm: x / R,
            label: `${flip ? 'Lower' : 'Upper'} ${side < 0 ? 'Left' : 'Right'} ${POSITION_NAMES[i]}`,
            type: TYPES[i].charAt(0).toUpperCase() + TYPES[i].slice(1),
            desc: TYPE_DESC[TYPES[i]],
          };
          tooth.scale.set(0.001, 0.001, 0.001);
          group.add(tooth);
          teeth.push(tooth);
          fadeMats.push(mat);
        }
      }
    };
    buildArch(0.55, false);
    buildArch(-0.55, true);

    // Gum arches with rounded, capped ends (no sliced-tube look).
    group.add(buildGumArch({ R, y: 0.55, mat: gumMat }));
    group.add(buildGumArch({ R, y: -0.55, mat: gumMat }));

    // Orbit rings — Ten Rings treatment: each ring materializes small and dim,
    // brightens as it expands outward, then dissolves away at the edge. Every
    // ring runs its own tilt, spin direction and cycle rate so they never sync.
    const RING_SPECS = [
      { r: 2.10, tube: 0.020, tilt: 0.18, yaw: 0.0, spin: 0.14, rate: 0.085, off: 0.0 },
      { r: 2.45, tube: 0.010, tilt: 0.62, yaw: 0.3, spin: -0.09, rate: 0.062, off: 0.37 },
      { r: 2.85, tube: 0.007, tilt: -0.45, yaw: 0.6, spin: 0.21, rate: 0.048, off: 0.71 },
    ];
    const rings = RING_SPECS.map((s) => {
      const mat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(s.r, s.tube, 10, 150), mat);
      mesh.position.set(0, -0.2, -1.4);
      mesh.rotation.set(s.tilt, s.yaw, 0);
      group.add(mesh);
      return { mesh, mat, ...s };
    });

    group.position.set(0, -0.3, 0);
    group.rotation.x = 0.42;
    group.rotation.y = Math.PI;
    group.traverse((o) => { o.frustumCulled = false; });
    scene.add(group);

    const key = new THREE.PointLight(0xffffff, 7, 18);
    key.position.set(2.5, 3.5, 4);
    scene.add(key);
    const rim = new THREE.PointLight(GUM, 2.6, 16);
    rim.position.set(-3.5, -1, -2);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffffff, 2.4, 18);
    fill.position.set(-3, 2, 3);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x0a1a1a, 0.55));
    const back = new THREE.PointLight(0xffe2b8, 1.4, 14);
    back.position.set(0, 0.4, -4.2);
    scene.add(back);
    const hoverLight = new THREE.PointLight(0x5eead4, 0, 2.6);
    scene.add(hoverLight);
    const _v = new THREE.Vector3();
    const _v2 = new THREE.Vector3();

    const PCOUNT = isMobile ? 110 : 200;
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.45 }), PCOUNT);
    const dummy = new THREE.Object3D();
    const pdata = [];
    for (let i = 0; i < PCOUNT; i++) {
      const r = 4 + Math.random() * 10;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const pos = { x: r * Math.sin(ph) * Math.cos(th), y: r * Math.sin(ph) * Math.sin(th) * 0.5, z: r * Math.cos(ph), s: 0.4 + Math.random() * 1.6, off: Math.random() * Math.PI * 2, sp: 0.0004 + Math.random() * 0.0008 };
      pdata.push(pos);
      dummy.position.set(pos.x, pos.y, pos.z); dummy.scale.set(pos.s, pos.s, pos.s); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    }
    // The particle matrices change every frame — tell the GPU up front.
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(inst);

    // Comets — bright nucleus, fuzzy coma, and fading particle trail (like real comets).
    const COMET_COUNT = 3;
    const TRAIL_LEN = 24;
    const comets = [];
    const headGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const glowGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const trailGeo = new THREE.SphereGeometry(0.045, 6, 6);
    for (let i = 0; i < COMET_COUNT; i++) {
      const cg = new THREE.Group();
      cg.visible = false;
      // White-hot nucleus inside a teal coma reads far more like a real comet
      // than a single flat sphere.
      const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const head = new THREE.Mesh(headGeo, headMat);
      const glow = new THREE.Mesh(glowGeo, glowMat);
      const comaMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const coma = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), comaMat);
      cg.add(glow, coma, head);
      const trail = [];
      for (let j = 0; j < TRAIL_LEN; j++) {
        const tm = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const tmesh = new THREE.Mesh(trailGeo, tm);
        cg.add(tmesh);
        trail.push({ mesh: tmesh, mat: tm });
      }
      scene.add(cg);
      comets.push({ group: cg, head, headMat, glow, glowMat, comaMat, trail, active: false, t: 0, duration: 0, delay: 4 + Math.random() * 10, speed: 0, dir: new THREE.Vector3(), pos: new THREE.Vector3(), trailPos: [] });
    }

    // Halley's comet — appears once per session, brighter with a long golden trail.
    const halleys = (function() {
      const cg = new THREE.Group();
      cg.visible = false;
      const headMat = new THREE.MeshBasicMaterial({ color: 0xfff5e0, transparent: true, opacity: 0 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), headMat);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), glowMat);
      cg.add(glow, head);
      const HTRAIL = 40;
      const trail = [];
      const tGeo = new THREE.SphereGeometry(0.05, 6, 6);
      for (let j = 0; j < HTRAIL; j++) {
        const tm = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const tmesh = new THREE.Mesh(tGeo, tm);
        cg.add(tmesh);
        trail.push({ mesh: tmesh, mat: tm });
      }
      scene.add(cg);
      return { group: cg, headMat, glowMat, trail, active: false, t: 0, duration: 0, delay: 15 + Math.random() * 45, speed: 0, dir: new THREE.Vector3(), pos: new THREE.Vector3(), trailPos: [], htrail: HTRAIL, fired: false };
    })();

    const raycaster = new THREE.Raycaster();
    let hovered = null;
    let lastHovered = null;

    let mouseDirty = false;
    const onMove = (e) => {
      mouseDirty = true;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (dragging.current) {
        rotY.current += (e.clientX - lastX.current) * 0.008;
        lastX.current = e.clientX;
      }
    };
    const onDown = (e) => {
      const tag = e.target?.tagName;
      if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(tag)) return;
      dragging.current = true;
      lastX.current = e.clientX;
    };
    const onUp = () => { dragging.current = false; };
    const onScroll = () => {
      scroll.current = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      // Background teeth drift out of focus as the reader scrolls down.
      canvas.style.filter = `blur(${(scroll.current * 11).toFixed(2)}px)`;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (finePointer) {
      window.addEventListener('mousedown', onDown);
      window.addEventListener('mouseup', onUp);
    }

    // The "for the nerds" section has its own inspectable arch — hide this one
    // while that section is on screen so the two never fight for attention.
    let nerdIn = false;
    let nerdFade = 1;
    const nerdIo = new IntersectionObserver(([e]) => { nerdIn = e.isIntersecting; }, { threshold: 0.25 });
    const observeNerds = () => {
      const el = document.getElementById('nerds');
      if (el) nerdIo.observe(el);
      else setTimeout(observeNerds, 400);
    };
    observeNerds();

    const clock = new THREE.Clock();
    let raf = 0;
    const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const INTRO = 2.0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const intro = easeOut(Math.min(1, t / INTRO));

      // Global visibility: once the arch is effectively invisible (scrolled far
      // down, nerd lab on screen, or hidden tab) skip ALL per-frame work — the
      // loop idles at near-zero cost instead of animating an invisible scene.
      const p = scroll.current;
      nerdFade = damp(nerdFade, nerdIn ? 0 : 1, 3, dt);
      const op = Math.max(0.16, 1 - p * 2.2) * (0.7 + 0.3 * intro) * nerdFade;
      if (document.hidden || op <= 0.002) {
        group.visible = false;
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
        return;
      }
      group.visible = true;
      for (const m of fadeMats) m.opacity = op;

      // DRS sampling: adjust internal resolution roughly once a second.
      qAcc += dt; qN++;
      if (qN >= 60) {
        const avg = qAcc / qN;
        if (avg > 1 / 42 && quality > 0.55) { quality = Math.max(0.55, quality - 0.15); applyQuality(); }
        else if (avg < 1 / 57 && quality < 1) { quality = Math.min(1, quality + 0.08); applyQuality(); }
        qAcc = 0; qN = 0;
      }

      key.position.x = Math.sin(t * 0.3) * 3;
      key.position.z = Math.cos(t * 0.3) * 3 + 1.5;

      if (!dragging.current) rotY.current += (reduceMotion ? 0.0006 : 0.0022) * (dt * 60);
      group.rotation.y = damp(group.rotation.y, rotY.current, 6, dt);
      group.rotation.x = damp(group.rotation.x, 0.42 + -mouse.current.y * 0.14, 3, dt);
      group.rotation.z = damp(group.rotation.z, mouse.current.x * 0.08, 3, dt);
      group.scale.setScalar((0.92 + 0.08 * intro) * (1 + Math.sin(t * 0.7) * 0.009 * intro));

      // Raycast only when the pointer actually moved (or while a tooth is
      // hovered, to detect leaving it) — idle frames skip the whole-scene
      // intersection test, which is the single biggest CPU cost on mobile.
      if (!dragging.current && !nerdIn && (mouseDirty || hovered)) {
        mouseDirty = false;
        let nextHover = null;
        raycaster.setFromCamera(mouse.current, camera);
        const hits = raycaster.intersectObjects(group.children, true);
        if (hits.length) {
          let o = hits[0].object;
          while (o && !o.userData?.tooth) o = o.parent;
          if (o) nextHover = o;
        }
        hovered = nextHover;
      } else if (dragging.current || nerdIn) {
        hovered = null;
      }
      const hIdx = hovered ? teeth.indexOf(hovered) : -1;
      const sweep = Math.sin(t * 0.22) * 1.05;
      for (let i = 0; i < teeth.length; i++) {
        const tooth = teeth[i];
        const u = tooth.userData;
        const isHover = tooth === hovered;
        const reveal = easeOut(Math.max(0, Math.min(1, (t - u.delay) / 0.9)));
        const f = (isHover ? 1.16 : 1) * reveal;
        tooth.scale.x = damp(tooth.scale.x, u.base.x * f, 12, dt);
        tooth.scale.y = damp(tooth.scale.y, u.base.y * f, 12, dt);
        tooth.scale.z = damp(tooth.scale.z, u.base.z * f, 12, dt);

        let glow = reduceMotion ? 0 : Math.exp(-Math.pow(u.xNorm - sweep, 2) / 0.045) * 0.2;
        if (isHover) glow = 0.4;
        else if (hIdx >= 0) glow = Math.max(glow, Math.max(0, 1 - Math.abs(i - hIdx) / 3) * 0.16);
        u.mat.emissiveIntensity = damp(u.mat.emissiveIntensity, glow * reveal, 8, dt);
      }
      if (hovered) {
        hovered.getWorldPosition(_v);
        hoverLight.position.lerp(_v, 1 - Math.exp(-12 * dt));
        hoverLight.intensity = damp(hoverLight.intensity, 2.4, 8, dt);
      } else {
        hoverLight.intensity = damp(hoverLight.intensity, 0, 6, dt);
      }

      // Tooth info tooltip — follows the hovered tooth on screen.
      const tip = tooltipRef.current;
      if (tip) {
        if (hovered) {
          if (hovered !== lastHovered) {
            lastHovered = hovered;
            const u = hovered.userData;
            tip.querySelector('.tip-type').textContent = u.type;
            tip.querySelector('.tip-label').textContent = u.label;
            tip.querySelector('.tip-desc').textContent = u.desc;
          }
          hovered.getWorldPosition(_v2);
          _v2.project(camera);
          tip.style.left = `${(_v2.x * 0.5 + 0.5) * window.innerWidth}px`;
          tip.style.top = `${(-_v2.y * 0.5 + 0.5) * window.innerHeight}px`;
          tip.style.opacity = String(intro * nerdFade);
        } else {
          tip.style.opacity = '0';
          lastHovered = null;
        }
      }

      const introZ = 3.2 * (1 - intro);
      // Camera pulls back as you scroll, but stops short so the arch stays in
      // frame (and alive) for the rest of the page.
      const pc = Math.min(p, 0.55);
      camera.position.z = damp(camera.position.z, 6.4 + introZ + pc * 4.0, 5, dt);
      camera.position.y = damp(camera.position.y, 0.3 + pc * 0.9, 5, dt);
      camera.lookAt(0, -0.05, 0);
      bloom.strength = 0.42 + (1 - intro) * 0.35;

      // Ring dissolve cycle — expand outward while fading in then out, so each
      // ring appears to form, sweep past the arch, and dematerialize.
      for (const r of rings) {
        const cyc = (t * r.rate + r.off) % 1;
        const grow = 0.74 + cyc * 0.62;
        r.mesh.scale.setScalar(grow);
        // Fade in fast, dissolve out slowly — brightest mid-flight.
        const envelope = Math.pow(Math.sin(cyc * Math.PI), 1.4) * (1 - cyc * 0.35);
        r.mat.opacity = envelope * op * 0.85;
        r.mesh.rotation.z += dt * r.spin;
        r.mesh.rotation.x = r.tilt + 0.16 * Math.sin(t * 0.11 + r.off * 6);
      }

      for (let i = 0; i < PCOUNT; i++) {
        const d = pdata[i];
        dummy.position.set(d.x + Math.sin(t * d.sp * 70 + d.off) * 0.3, d.y + Math.cos(t * d.sp * 55 + d.off) * 0.3, d.z);
        const s = d.s * (0.7 + 0.3 * Math.sin(t * 0.6 + d.off)) * intro;
        dummy.scale.set(s, s, s); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;

      // Comets — nucleus, coma, and dust tail.
      for (const c of comets) {
        if (!c.active) {
          c.delay -= dt;
          if (c.delay <= 0) {
            c.active = true;
            c.t = 0;
            c.duration = 1.6 + Math.random() * 1.5;
            c.pos.set(-12 + Math.random() * 4, 2 + Math.random() * 6, -6 - Math.random() * 4);
            c.dir.set(1, -0.25 - Math.random() * 0.35, 0.05).normalize();
            c.speed = 6 + Math.random() * 5;
            c.group.visible = true;
            c.group.position.copy(c.pos);
            c.trailPos = [];
          }
        } else {
          c.t += dt;
          const life = c.t / c.duration;
          c.pos.addScaledVector(c.dir, c.speed * dt);
          c.group.position.copy(c.pos);
          // Record trail positions for the fading dust tail.
          c.trailPos.unshift(c.pos.clone());
          if (c.trailPos.length > TRAIL_LEN) c.trailPos.pop();
          const fade = Math.sin(life * Math.PI) * intro * Math.max(0, 1 - scroll.current * 3);
          // Subtle nucleus flicker — outgassing.
          const flicker = 0.88 + 0.12 * Math.sin(t * 22 + c.delay);
          c.headMat.opacity = fade * flicker;
          c.glowMat.opacity = fade * 0.3 * flicker;
          c.comaMat.opacity = fade * 0.1;
          for (let j = 0; j < c.trail.length; j++) {
            const tp = c.trailPos[j];
            if (tp) {
              const k = j / TRAIL_LEN;
              c.trail[j].mesh.position.copy(tp).sub(c.pos);
              // Tail widens and dims away from the nucleus, like a dust tail.
              c.trail[j].mat.opacity = fade * Math.pow(1 - k, 1.7) * 0.55;
              c.trail[j].mesh.scale.setScalar(1.15 - k * 0.85 + Math.sin(k * 6) * 0.05);
            } else {
              c.trail[j].mat.opacity = 0;
            }
          }
          if (life >= 1) {
            c.active = false;
            c.group.visible = false;
            c.delay = 5 + Math.random() * 12;
          }
        }
      }

      // Halley's comet — once per session.
      if (!halleys.fired || halleys.active) {
        if (!halleys.active) {
          halleys.delay -= dt;
          if (halleys.delay <= 0) {
            halleys.active = true;
            halleys.fired = true;
            halleys.t = 0;
            halleys.duration = 3.5;
            halleys.pos.set(-14, 3 + Math.random() * 4, -8);
            halleys.dir.set(1, -0.15, 0.03).normalize();
            halleys.speed = 4.5;
            halleys.group.visible = true;
            halleys.group.position.copy(halleys.pos);
            halleys.trailPos = [];
          }
        } else {
          halleys.t += dt;
          const life = halleys.t / halleys.duration;
          halleys.pos.addScaledVector(halleys.dir, halleys.speed * dt);
          halleys.group.position.copy(halleys.pos);
          halleys.trailPos.unshift(halleys.pos.clone());
          if (halleys.trailPos.length > halleys.htrail) halleys.trailPos.pop();
          const fade = Math.sin(life * Math.PI) * intro * Math.max(0, 1 - scroll.current * 2);
          halleys.headMat.opacity = fade;
          halleys.glowMat.opacity = fade * 0.35;
          for (let j = 0; j < halleys.trail.length; j++) {
            const tp = halleys.trailPos[j];
            if (tp) {
              halleys.trail[j].mesh.position.copy(tp).sub(halleys.pos);
              const tf = fade * (1 - j / halleys.htrail) * 0.6;
              halleys.trail[j].mat.opacity = tf;
              halleys.trail[j].mesh.scale.setScalar(1 - j / halleys.htrail * 0.6);
            } else {
              halleys.trail[j].mat.opacity = 0;
            }
          }
          if (life >= 1) {
            halleys.active = false;
            halleys.group.visible = false;
          }
        }
      }

      composer.render();
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloom.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5);
      applyQuality();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      nerdIo.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (finePointer) {
        window.removeEventListener('mousedown', onDown);
        window.removeEventListener('mouseup', onUp);
      }
      renderer.dispose(); pmrem.dispose(); composer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 outline-none pointer-events-none" aria-hidden="true" />
      <div ref={tooltipRef} className="fixed z-[2] pointer-events-none" style={{ opacity: 0, transition: 'opacity 0.2s', left: 0, top: 0 }}>
        <div className="relative -translate-x-1/2 -translate-y-[calc(100%+12px)] px-2.5 py-2 rounded-lg border border-[#0d9f8e]/25 bg-[#06121a]/70 backdrop-blur-md whitespace-nowrap" style={{ minWidth: '150px' }}>
          <div className="text-[8px] uppercase tracking-wider text-[#2dd4bf] font-semibold tip-type" />
          <div className="text-[12px] font-heading font-600 text-white/90 leading-tight tip-label" />
          <div className="text-[10px] text-white/45 mt-0.5 tip-desc" />
        </div>
      </div>
    </>
  );
}