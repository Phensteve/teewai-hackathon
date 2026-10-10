// ToothMeshOverlay — a dense tessellated wireframe mesh (MediaPipe Face Mesh
// style) that conforms to the REAL tooth shape from the scan photo.
//
// Visual layers (inspired by MediaPipe FACEMESH_TESSELATION + FACEMESH_CONTOURS):
//  1. Tessellation net — thin, semi-transparent triangulated lines filling the
//     entire tooth area. Both diagonals per quad create the dense "net" look.
//  2. Contour boundary — brighter lines along the gumline, incisal edge, and
//     sides. The real tooth silhouette, not a static rectangle.
//  3. Gap verticals — brighter lines at the real inter-tooth gap positions.
//  4. Landmark dots — small pulsing dots at key anatomical points (corners,
//     interdental gaps, incisal midpoints).
//  5. Scan sweep — a slow horizontal light line reading as "analyzing".
//
// The mesh conforms to the actual tooth shape via toothContour's per-column
// edge extraction + toothMesh's warped-grid tessellation. If contour
// extraction fails, a fallback grid mesh still renders the net look.

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { extractSmileContour } from '@/lib/toothContour';
import { buildTessellation, buildFallbackMesh } from '@/lib/toothMesh';

const OLO = 'hsl(174 100% 42%)';
const OLO_BRIGHT = 'hsl(174 100% 62%)';

// Compute the image's rendered content rect inside an object-contain box, so
// the overlay aligns with the actual photo (not the letterboxed padding).
function computeContentRect(img) {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const cw = img.clientWidth, ch = img.clientHeight;
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const imgAspect = nw / nh;
  const boxAspect = cw / ch;
  let rw, rh, ox, oy;
  if (imgAspect > boxAspect) {
    rw = cw; rh = cw / imgAspect; ox = 0; oy = (ch - rh) / 2;
  } else {
    rh = ch; rw = ch * imgAspect; ox = (cw - rw) / 2; oy = 0;
  }
  return { ox, oy, rw, rh };
}

export default function ToothMeshOverlay({ src, smileBbox, alt = 'Your teeth', className = '' }) {
  const imgRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [contour, setContour] = useState(null); // null = computing, false = failed

  const update = useCallback(() => {
    setRect(computeContentRect(imgRef.current));
  }, []);

  useEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [update]);

  const bbox = smileBbox && typeof smileBbox.x === 'number'
    ? smileBbox
    : { x: 0.08, y: 0.12, width: 0.84, height: 0.76 };

  // Trace the real tooth contour in the background once the image is loaded.
  useEffect(() => {
    let cancelled = false;
    setContour(null);
    if (!src) return;
    extractSmileContour(src, bbox).then((c) => {
      if (!cancelled) setContour(c || false);
    }).catch(() => { if (!cancelled) setContour(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, bbox.x, bbox.y, bbox.width, bbox.height]);

  const meshLeft = rect ? rect.ox + bbox.x * rect.rw : 0;
  const meshTop = rect ? rect.oy + bbox.y * rect.rh : 0;
  const meshW = rect ? bbox.width * rect.rw : 0;
  const meshH = rect ? bbox.height * rect.rh : 0;

  // Remap a full-image 0-1 point into the bbox-local 0-100 SVG space.
  const rx = (nx) => ((nx - bbox.x) / bbox.width) * 100;
  const ry = (ny) => ((ny - bbox.y) / bbox.height) * 100;

  // Build the tessellation mesh from the contour (or fallback).
  const mesh = useMemo(() => {
    if (contour && contour.topEdge && contour.topEdge.length >= 3) {
      return buildTessellation(contour);
    }
    if (contour === false) return buildFallbackMesh();
    return null;
  }, [contour]);

  const hasMesh = mesh && mesh.vertices && mesh.vertices.length > 0;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={update}
        className="block w-full max-h-[320px] object-contain"
      />
      {rect && meshW > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{ left: meshLeft, top: meshTop, width: meshW, height: meshH }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {hasMesh && (
              <>
                {/* Soft fill — barely visible, gives the mesh area a subtle body */}
                <path
                  d={(() => {
                    const g = mesh.grid;
                    if (!g || g.length < 2) return '';
                    let d = `M ${rx(mesh.vertices[g[0][0]][0]).toFixed(2)} ${ry(mesh.vertices[g[0][0]][1]).toFixed(2)}`;
                    for (let ci = 1; ci < mesh.validCols; ci++) {
                      d += ` L ${rx(mesh.vertices[g[ci][0]][0]).toFixed(2)} ${ry(mesh.vertices[g[ci][0]][1]).toFixed(2)}`;
                    }
                    for (let ci = mesh.validCols - 1; ci >= 0; ci--) {
                      d += ` L ${rx(mesh.vertices[g[ci][mesh.nRows - 1]][0]).toFixed(2)} ${ry(mesh.vertices[g[ci][mesh.nRows - 1]][1]).toFixed(2)}`;
                    }
                    return d + ' Z';
                  })()}
                  fill={OLO}
                  fillOpacity={0.03}
                />

                {/* Tessellation net — thin, semi-transparent triangulated lines.
                    This is the dense "net" (FACEMESH_TESSELATION equivalent). */}
                <g fill="none" stroke={OLO} strokeWidth={0.12} strokeOpacity={0.22}>
                  {mesh.tessEdges.map(([i, j], k) => {
                    const [x1, y1] = mesh.vertices[i];
                    const [x2, y2] = mesh.vertices[j];
                    return (
                      <line
                        key={k}
                        x1={rx(x1).toFixed(2)} y1={ry(y1).toFixed(2)}
                        x2={rx(x2).toFixed(2)} y2={ry(y2).toFixed(2)}
                      />
                    );
                  })}
                </g>

                {/* Contour boundary — brighter lines along the real gumline,
                    incisal edge, and sides (FACEMESH_CONTOURS equivalent). */}
                <g
                  fill="none"
                  stroke={OLO_BRIGHT}
                  strokeWidth={0.3}
                  strokeOpacity={0.65}
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 1.5px hsl(174 100% 62% / 0.5))' }}
                >
                  {mesh.contourEdges.map(([i, j], k) => {
                    const [x1, y1] = mesh.vertices[i];
                    const [x2, y2] = mesh.vertices[j];
                    return (
                      <line
                        key={k}
                        x1={rx(x1).toFixed(2)} y1={ry(y1).toFixed(2)}
                        x2={rx(x2).toFixed(2)} y2={ry(y2).toFixed(2)}
                      />
                    );
                  })}
                </g>

                {/* Gap verticals — brighter lines at the real inter-tooth gap
                    positions. These are the tooth boundaries from the actual photo. */}
                <g
                  fill="none"
                  stroke={OLO_BRIGHT}
                  strokeWidth={0.2}
                  strokeOpacity={0.5}
                >
                  {mesh.gapCols.map((ci, k) => {
                    const topV = mesh.grid[ci][0];
                    const botV = mesh.grid[ci][mesh.nRows - 1];
                    const [x1, y1] = mesh.vertices[topV];
                    const [x2, y2] = mesh.vertices[botV];
                    return (
                      <line
                        key={k}
                        x1={rx(x1).toFixed(2)} y1={ry(y1).toFixed(2)}
                        x2={rx(x2).toFixed(2)} y2={ry(y2).toFixed(2)}
                      />
                    );
                  })}
                </g>

                {/* Landmark dots — pulsing dots at key anatomical points
                    (corners, interdental gaps, incisal midpoints). */}
                <g>
                  {mesh.keyPoints.map((vi, k) => {
                    const [x, y] = mesh.vertices[vi];
                    return (
                      <circle
                        key={k}
                        cx={rx(x).toFixed(2)}
                        cy={ry(y).toFixed(2)}
                        r={0.45}
                        fill={OLO_BRIGHT}
                        fillOpacity={0.8}
                        className="mesh-node"
                        style={{
                          animationDelay: `${(k * 0.25) % 2.6}s`,
                          filter: 'drop-shadow(0 0 1.5px hsl(174 100% 62% / 0.7))',
                        }}
                      />
                    );
                  })}
                </g>
              </>
            )}
          </svg>

          {/* Subtle scan sweep — a thin, slow horizontal line with a soft
              glow. Reads as "scanning" without being aggressive. */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute left-0 right-0 h-px mesh-scan-line"
              style={{
                background: `linear-gradient(90deg, transparent, ${OLO_BRIGHT}, transparent)`,
                boxShadow: `0 0 6px ${OLO_BRIGHT}, 0 0 12px hsl(174 100% 62% / 0.3)`,
                opacity: 0.6,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}