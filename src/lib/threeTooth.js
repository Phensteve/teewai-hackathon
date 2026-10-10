import * as THREE from 'three';

// Shared three.js tooth + gum builders, used by the fixed background canvas and
// the live-demo scanner so both stay visually identical (and share geometry work).

export const TYPES = ['incisor', 'incisor', 'canine', 'premolar', 'premolar', 'molar', 'molar', 'molar'];
export const POSITION_NAMES = ['Central incisor', 'Lateral incisor', 'Canine', 'First premolar', 'Second premolar', 'First molar', 'Second molar', 'Third molar (wisdom)'];
export const TYPE_DESC = {
  incisor: 'Chisel-shaped front tooth for cutting and biting',
  canine: 'Pointed cusp for tearing and gripping food',
  premolar: 'Two-cusped transitional tooth for crushing',
  molar: 'Broad grinding surface for chewing food',
};

// Each tooth type is built from distinct primitives so an incisor reads as a
// flat chisel, a canine as a pointed cusp, a premolar with two cusps and a
// molar with four — instead of every tooth being a squished sphere.
// Every crown tops at the same height (CROWN_TOP) so the arch reads as a
// real, even bite line instead of canine spikes towering over flat molars.
const CROWN_TOP = 0.60;

// Builds a crown as ONE continuous mesh: a sphere squashed into the tooth's
// proportions, with its cusps raised as smooth gaussian swells in the surface
// itself. Nothing is stacked on top, so there are no visible balls or discs —
// the occlusal bumps flow out of the same skin, like a real tooth.
function buildCrown({ rx, ry, rz, cusps = [], cuspH = 0, cuspR = 0.1, box = 0.35, cervical = 0.18, mat }) {
  const geo = new THREE.SphereGeometry(0.5, 48, 34);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const up = Math.max(0, v.y / 0.5);       // 0 at equator, 1 at the crown top
    const dn = Math.max(0, -v.y / 0.5);      // 0 at equator, 1 at the neck
    // Squarer cross-section (real crowns are boxy, not round) + a cervical
    // taper so the tooth narrows into the gum like an anatomical neck.
    const r = Math.hypot(v.x, v.z) || 1e-6;
    const ang = Math.atan2(v.z, v.x);
    const sq = 1 + box * Math.min(Math.abs(Math.cos(2 * ang)), 1) * (1 - up * 0.5);
    const neck = 1 - cervical * dn * dn;
    const nx = (v.x / r) * Math.min(r / 0.5 * sq, 1.35) * neck;
    const nz = (v.z / r) * Math.min(r / 0.5 * sq, 1.35) * neck;
    const x = nx * rx;
    const z = nz * rz;
    let y = (v.y / 0.5) * ry;
    if (cuspH > 0) {
      let bump = 0;
      for (const [cx, cz] of cusps) {
        const dx = x - cx;
        const dz = z - cz;
        bump = Math.max(bump, cuspH * Math.exp(-(dx * dx + dz * dz) / (2 * cuspR * cuspR)));
      }
      y += bump * up * up;                    // blends to zero down the sides
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = CROWN_TOP - (ry + cuspH); // every crown tops at CROWN_TOP
  return mesh;
}

export function makeTooth(type, mat) {
  const g = new THREE.Group();
  if (type === 'incisor') {
    // Wide, flat chisel with a straight incisal edge — not sharp.
    const geo = new THREE.SphereGeometry(0.5, 28, 20);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.y < -0.18) v.y = -0.18;            // straight incisal edge
      const taper = 1 - 0.10 * Math.max(0, v.y / 0.5);
      pos.setXYZ(i, v.x * taper, v.y, v.z * 0.40); // thin in depth (flat)
    }
    geo.computeVertexNormals();
    const crown = new THREE.Mesh(geo, mat);
    crown.scale.set(0.66, 0.80, 1);
    crown.position.y = CROWN_TOP - 0.5 * 0.80; // top at CROWN_TOP
    g.add(crown);
  } else if (type === 'canine') {
    // Narrow, slightly boxy crown rising to one blunt central cusp with soft
    // mesial/distal ridges falling away from it.
    g.add(buildCrown({
      rx: 0.26, ry: 0.30, rz: 0.23, box: 0.22, cervical: 0.22,
      cusps: [[0, 0.02]], cuspH: 0.12, cuspR: 0.16, mat,
    }));
  } else if (type === 'premolar') {
    // Two defined cusps (buccal slightly higher) with the fissure between them.
    g.add(buildCrown({
      rx: 0.32, ry: 0.24, rz: 0.28, box: 0.4, cervical: 0.2,
      cusps: [[0, 0.12], [0, -0.11]], cuspH: 0.09, cuspR: 0.115, mat,
    }));
  } else { // molar
    // Broad, square grinding table with four cusps around a central fissure.
    g.add(buildCrown({
      rx: 0.41, ry: 0.22, rz: 0.37, box: 0.5, cervical: 0.16,
      cusps: [[-0.19, 0.16], [0.19, 0.16], [-0.19, -0.16], [0.19, -0.16]],
      cuspH: 0.075, cuspR: 0.115, mat,
    }));
  }
  return g;
}

// Points along the dental arch (used for both the teeth ring and the gum line).
export function archPoints({ R, count = 7, step = 0.26, start = 0.14, depth = 0.85 }) {
  const pts = [];
  for (let i = count - 1; i >= 0; i--) {
    const ang = -(i * step + start);
    pts.push(new THREE.Vector3(Math.sin(ang) * R, 0, -Math.cos(ang) * R * depth - 0.1));
  }
  for (let i = 0; i < count; i++) {
    const ang = i * step + start;
    pts.push(new THREE.Vector3(Math.sin(ang) * R, 0, -Math.cos(ang) * R * depth - 0.1));
  }
  return pts;
}

// Gum arch: a tube along the arch, capped with hemispheres at both ends so it
// reads as soft anatomical tissue instead of a sliced-open pool ring. The
// surface gets a light organic displacement so it isn't a perfect extrusion.
export function buildGumArch({ R, y = 0, mat, radius = 0.28, yScale = 0.75, count = 7, step = 0.26, start = 0.14, depth = 0.85 }) {
  const pts = archPoints({ R, count, step, start, depth });
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(curve, 96, radius, 22, false);

  // Organic roughening along the surface normals — subtle tissue irregularity.
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const bump =
      Math.sin(v.x * 7.3 + v.z * 5.1) * 0.008 +
      Math.sin(v.x * 15.7 - v.z * 12.3) * 0.004 +
      Math.sin(v.z * 21.1) * 0.0025;
    pos.setXYZ(i, v.x + n.x * bump, v.y + n.y * bump, v.z + n.z * bump);
  }
  geo.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));

  // Rounded end caps — a hemisphere-sized sphere exactly matching the tube radius.
  const capGeo = new THREE.SphereGeometry(radius, 22, 16);
  const first = pts[0];
  const last = pts[pts.length - 1];
  for (const p of [first, last]) {
    const cap = new THREE.Mesh(capGeo, mat);
    cap.position.copy(p);
    // Squash the cap very slightly inward so it blends into the tube end.
    cap.scale.set(0.99, 0.99, 0.99);
    group.add(cap);
  }

  group.position.y = y;
  group.scale.y = yScale;
  return group;
}