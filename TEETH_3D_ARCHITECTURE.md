# teewai — 3D Dental Visualization Architecture

A technical reference for the three three.js renderers that power teewai's
dental visuals, and the shared geometry core they all build on. Written so a
founder or engineer can walk into a meeting, a demo, or a conference panel and
explain exactly how the smile renders — and why it's built this way.

---

## 1. System overview

teewai renders teeth in three places, each with a different job, but all three
share **one geometry core** so the teeth always look identical:

| Renderer | File | Where it lives | Role |
|---|---|---|---|
| **DemoTeeth3D** | `src/components/hometest/DemoTeeth3D.jsx` | Home / landing "live demo" | Cinematic, phase-driven arch that glides into frame and locks for the scan read |
| **InspectTeeth3D** | `src/components/hometest/InspectTeeth3D.jsx` | Home / landing "inspect" mode | Interactive arch you can orbit, tilt, and click to inspect individual teeth |
| **TeethMockup3D** | `src/components/TeethMockup3D.jsx` | User scan Results page | Data-driven arch built from the user's *real* scan — per-tooth color, clickable, health/shade views |

All three import from **`src/lib/threeTooth.js`** — the shared core that builds
anatomically-correct tooth meshes and the gum arch. This separation is
deliberate: the geometry is defined once and reused, so a change to tooth shape
propagates everywhere automatically, and each renderer only owns the
*presentation* logic (camera, lighting, animation, interaction) specific to its
context.

---

## 2. The shared geometry core — `src/lib/threeTooth.js`

This module is pure three.js geometry construction — no React, no animation, no
DOM. It exports three things every renderer needs.

### 2.1 `makeTooth(type, material) → THREE.Group`

Builds a single tooth crown as a `Group` of primitive meshes, shaped to read as
its real anatomical kind. This is the heart of the visual fidelity.

- **Incisor** — a `SphereGeometry` deformed vertex-by-vertex: flattened in
  depth (`z * 0.42`) so it's a thin slab, with the incisal edge clamped to a
  straight plane (`y < -0.22 → y = -0.22`) to form the chisel shape, and a
  cervical taper toward the top. This is why incisors look flat and wide, not
  like a squished ball.
- **Canine** — a `ConeGeometry` (7 radial segments) for the single pointed
  cusp, scaled thinner in depth, seated on a flattened sphere base.
- **Premolar** — a rounded sphere body with **two** `ConeGeometry` cusps placed
  side-by-side on the occlusal surface.
- **Molar** — a broad, low sphere body with **four** cone cusps in a quadrant
  pattern, approximating the real four-cusp grinding surface.

The vertex deformation on the incisor uses the standard three.js pattern:
iterate `geometry.attributes.position`, read each vertex into a `Vector3`,
mutate it, write it back with `setXYZ`, then `computeVertexNormals()` so the
shading stays smooth after the reshape.

### 2.2 `archPoints({ R, count, step, start, depth }) → Vector3[]`

Generates the points along a parabolic dental arch. It walks from one side to
the midline and out to the other side, placing each tooth at an angle along a
circle of radius `R`, with a `depth` factor (`0.85`) that pulls the back teeth
slightly closer to the camera so the arch reads as a 3D curve, not a flat ring.

### 2.3 `buildGumArch({ R, y, mat, radius, yScale, ... }) → THREE.Group`

Builds the gum line as a tube along the arch:

1. **`CatmullRomCurve3`** through the `archPoints` — a smooth spline that
   passes through every point, giving the gum a continuous organic curve
   instead of discrete segments.
2. **`TubeGeometry`** extruded along that curve (96 path segments, 22 radial
   segments) — a smooth, round tube.
3. **Organic displacement** — each vertex is nudged along its surface normal by
   a sum of sine waves at different frequencies. This breaks the perfect
   extrusion so the gum reads as soft tissue, not a pool ring.
4. **Hemispherical end caps** — a `SphereGeometry` matching the tube radius is
   placed at both endpoints, so the tube doesn't look sliced open.

The `yScale` (default `0.75`) squashes the tube vertically so it hugs the arch
as a gum line rather than a fat torus.

### 2.4 Shared constants

- `TYPES` — `['incisor','incisor','canine','premolar','premolar','molar','molar']` — the 7 teeth per quadrant, midline to back.
- `POSITION_NAMES` — human-readable names ("Central incisor", "Lateral incisor", …).
- `TYPE_DESC` — one-line clinical descriptions used in the inspect popover.

---

## 3. Renderer 1 — `DemoTeeth3D` (the cinematic demo)

**Purpose:** a non-interactive, phase-driven arch that tells the story of a
scan. It waits deep in the background, glides forward into the frame, locks
dead-still front-on for the "scan read", then retreats. A scan-glow sweeps
tooth-to-tooth while the beam passes.

### Phase state machine

A `PHASES` object defines target values for each phase — `z` (depth), `scale`,
`opacity`, `spin` (rotation speed), `lock` (whether the arch holds still), and
`tilt` (camera pitch):

```
idle → entering → scanning → results → leaving
```

The parent component drives `phase` as a prop; the renderer reads it through a
ref (so the animation loop sees updates without re-running the effect).

### Animation loop

Every frame, the loop:
1. Reads the current phase config.
2. **Damps** every animated value toward its target using exponential
   approach: `cur + (target - cur) * (1 - exp(-rate * dt))`. This is the
   standard frame-rate-independent easing pattern — it converges smoothly
   regardless of FPS.
3. When `lock` is true, eases the yaw to the front-on angle (`FRONT_YAW = π`)
   by the shortest path (using `Math.round((yaw - target) / 2π) * 2π` to pick
   the nearest equivalent angle, so it never spins the long way around).
4. Computes a **scan-glow sweep**: `sin(t * 1.5) * 1.05` travels along the
   arch's X axis, and each tooth's `emissiveIntensity` is set by a Gaussian
   falloff (`exp(-((xNorm - sweep)²) / 0.05)`) — so a bright spot glides across
   the teeth one at a time.

### Performance guards

- **`IntersectionObserver`** — stops rendering when the canvas is off-screen.
- **`document.hidden`** check — pauses when the tab is backgrounded.
- **Settled detection** — when the arch is fully faded out and at its idle Z,
  the loop skips `renderer.render()` entirely (no GPU work for an invisible
  scene).
- **`prefers-reduced-motion`** — reduces spin speed for accessibility.
- **Mobile pixel-ratio cap** — `min(devicePixelRatio, 1)` on phones to protect
  scroll FPS.

### Material choice

A **`MeshPhysicalMaterial`** with `clearcoat: 1`, `clearcoatRoughness: 0.06`,
`sheen: 0.9`, and `envMapIntensity: 1.1`. This is deliberately lighter than the
inspect renderer (no expensive transmission/iridescence) because this scene is
a secondary visual element on a scrolling page — keeping the shader cheap
protects scroll performance. `depthWrite: true` is kept ON so transparent
crowns don't sort against each other and blink out as the arch rotates.

---

## 4. Renderer 2 — `InspectTeeth3D` (the interactive arch)

**Purpose:** a full-quality, fully interactive arch. Drag to orbit and tilt;
click a tooth to select it — the scene eases in on the pick and reports it back
to the parent card.

### Scene setup

Identical camera/renderer setup to the demo, but with a richer material:
`envMapIntensity: 1.7` and an `emissive` channel (`0x9ff5e6`) used for the
selection glow. **`PMREMGenerator` + `RoomEnvironment`** generates an
environment map that gives enamel its bright, glossy reflections — without it,
the teeth read flat and grey.

### Tooth placement

A nested loop: for each arch (upper `y=+0.52`, lower `y=-0.52`), for each side
(left/right), for each of the 7 positions — place a `makeTooth` mesh at the
arch angle, scaled by `1 - i*0.05` (back teeth slightly smaller), flipped on Y
for the lower arch (`scale.y = -s`). Each tooth's `userData` stores its id,
label, type, and description for the inspect callback.

### Interaction — raycasting

- **`pointerdown`** records the start position and total movement.
- **`pointermove`** (while dragging) updates yaw/pitch and accumulates `moved`.
- **`pointerup`**: if `moved < 6` pixels, it's a click, not a drag — run a
  **`Raycaster`** from the camera through the pointer's NDC coordinates into
  the scene, walk up the hit object's parents until one has `userData.tooth`,
  and call `onSelect` with that tooth's data. This is the standard three.js
  picking pattern.

### Selection easing

When a tooth is selected: the camera dollies in (`z: 6.8 → 5.2`), the selected
tooth scales up to `1.18×`, its `emissiveIntensity` ramps to `0.5`, and the
auto-spin stops so the picked tooth can be read. All via the same exponential
damping. A gentle vertical bob (`sin(t * 0.6) * 0.025`) keeps the arch feeling
alive when idle.

---

## 5. Renderer 3 — `TeethMockup3D` (the user's real scan)

**Purpose:** on the Results page, render an arch that approximates the user's
*actual* teeth from their scan data — per-tooth color, clickable, with a
health/shade view toggle.

### Data-driven arch

Unlike the other two (which place a fixed set of teeth), this renderer builds
the arch from `teeth` — an array produced by `buildMockupArch()` in
`unrufldteeth.js`, which maps the AI's `tooth_analysis` array to render-ready
meshes. Each entry carries: `id`, `type`, `arch` (upper/lower), `side`, `n`
(position 1-7), `color` (health or shade color), `rotY`/`posOffset`/`scale`
(derived from detected conditions like rotation, crowding, gaps), and `raw`
(the full tooth analysis for the click popover).

The `view` prop (`'health'` | `'shade'`) controls which color each tooth gets —
health severity color or whiteness shade color. Changing `view` re-runs the
effect (it's a dependency), rebuilding the arch with the new colors.

### Clickable teeth with popover

Same raycasting pattern as InspectTeeth3D, but instead of calling a parent
callback, it sets React state `{ tooth, x, y, w, h }` and renders a
**`ToothPopover`** — an HTML overlay positioned at the click point (clamped to
stay on-screen, flipped above/below the click based on which half was tapped).
The popover shows the tooth's ID, type name, clinical description, health and
whiteness scores (colored), detected conditions, and per-segment color
breakdown — all from the `raw` tooth data.

### Why it's a "mockup"

It approximates the arch from a single 2D photo. It can't know true 3D depth or
occlusion, so it's a visual aid, not an accurate model — the disclaimer under
the canvas says exactly this. The value is that it makes the scan results
*tangible*: you see your teeth colored by health, and you can tap any one to
read its specific analysis.

---

## 6. How the three work together

```
                    src/lib/threeTooth.js
                  ┌─────────────────────────┐
                  │  makeTooth()             │  ← anatomical tooth shapes
                  │  archPoints()            │  ← arch curve points
                  │  buildGumArch()          │  ← gum tube + caps
                  │  TYPES / POSITION_NAMES  │
                  └────────┬────────────────┘
                           │ imported by
           ┌───────────────┼───────────────────┐
           ▼               ▼                   ▼
   DemoTeeth3D.jsx   InspectTeeth3D.jsx   TeethMockup3D.jsx
   (cinematic)       (interactive)        (data-driven)
   phase state       raycast pick         buildMockupArch()
   scan-glow sweep   selection ease       health/shade views
   lightweight mat   full-quality mat     clickable + popover
```

- **DemoTeeth3D** and **InspectTeeth3D** both live in the `hometest` section —
  they're the marketing/education visuals. They render a *generic* perfect arch
  (fixed teeth, white enamel) to show what teewai does.
- **TeethMockup3D** lives on the user's Results page and renders *their* arch —
  colored by their real scan data, with their real conditions (rotation,
  crowding, gaps) reflected in the mesh transforms.
- All three share `makeTooth` and `buildGumArch`, so the teeth always look
  consistent. A change to tooth shape in `threeTooth.js` instantly updates all
  three renderers.

---

## 7. Key three.js concepts used (glossary for meetings)

- **`PerspectiveCamera`** — the simulated lens; `fov: 38`, positioned at `z: 6.8`.
- **`WebGLRenderer`** with **`ACESFilmicToneMapping`** — film-industry tone
  curve that prevents blown-out highlights, giving the scene a cinematic
  exposure. `toneMappingExposure: 1.25` brightens it.
- **`PMREMGenerator` + `RoomEnvironment`** — pre-filters a procedural room
  scene into an environment map used for image-based lighting (IBL). This is
  what makes enamel look glossy and reflective instead of flat.
- **`MeshPhysicalMaterial`** — the physically-based shading model. `clearcoat`
  adds a lacquer-like glossy layer (enamel's wet look), `sheen` adds the soft
  velvet-like rim light, `roughness` controls blur, `envMapIntensity` scales
  the reflection strength.
- **`CatmullRomCurve3`** — a spline that passes through its control points;
  used for the smooth gum line.
- **`TubeGeometry`** — extrudes a circle along a curve to make a tube.
- **`Raycaster`** — casts a ray from the camera through a screen point to find
  which 3D object was clicked (picking).
- **`IntersectionObserver` / `ResizeObserver`** — browser APIs to pause
  rendering when off-screen and resize the canvas when its container changes.
- **Exponential damping** — `c + (t - c) * (1 - exp(-rate * dt))` —
  frame-rate-independent smoothing used for every animated value.
- **`frustumCulled = false`** — disables per-object visibility culling so the
  whole arch always renders (needed because the group is scaled/rotated).

---

## 8. Why this architecture

1. **Single source of truth for geometry** — tooth shapes defined once, reused
   three times. No drift between the demo, the inspector, and the real scan.
2. **Separation of concerns** — `threeTooth.js` owns shape; each renderer owns
   presentation. You can change the camera animation in the demo without
   touching tooth geometry, and vice versa.
3. **Performance budgeting** — the demo (on a scrolling page) uses a lighter
   material and skips rendering when settled; the inspector (on a dedicated
   view) uses full quality. Each renderer spends GPU only where its context
   justifies it.
4. **Data-driven where it matters** — the Results renderer doesn't hardcode
   teeth; it builds from the AI's per-tooth analysis, so the 3D view is a true
   projection of the scan, not a decoration.