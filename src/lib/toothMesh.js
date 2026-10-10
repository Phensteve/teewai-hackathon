// toothMesh — builds a tessellated wireframe mesh (MediaPipe Face Mesh style)
// from the extracted tooth contour, so the scan overlay looks like the dense
// "net" used by facial-recognition software — not just an outline with dots.
//
// The mesh conforms to the REAL tooth shape: the top/bottom edges follow the
// actual gumline and incisal edge curves (from toothContour), and vertical
// lines align with the real inter-tooth gaps. The interior is filled with a
// triangulated net (both diagonals per quad) for the characteristic dense
// wireframe look.
//
// All coordinates are in 0-1 image space (same as toothContour output). The
// overlay component transforms them to SVG space.

const lerp = (a, b, t) => a + (b - a) * t;

// Sample the top/bottom edge curves at a given x (0-1 space) by interpolating
// the nearest edge points. Returns { top: y, bot: y }.
function sampleEdges(topEdge, bottomEdge, x) {
  if (topEdge.length === 0) return null;
  if (topEdge.length === 1) return { top: topEdge[0][1], bot: bottomEdge[0][1] };

  // Clamp x to the edge range
  if (x <= topEdge[0][0]) return { top: topEdge[0][1], bot: bottomEdge[0][1] };
  if (x >= topEdge[topEdge.length - 1][0]) {
    const last = topEdge.length - 1;
    return { top: topEdge[last][1], bot: bottomEdge[last][1] };
  }

  // Binary search for the surrounding segment
  let lo = 0, hi = topEdge.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (topEdge[mid][0] <= x) lo = mid; else hi = mid;
  }
  const [x0, y0t] = topEdge[lo];
  const [x1, y1t] = topEdge[hi];
  const [, y0b] = bottomEdge[lo];
  const [, y1b] = bottomEdge[hi];
  const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
  return { top: lerp(y0t, y1t, t), bot: lerp(y0b, y1b, t) };
}

// Build a tessellated mesh from the extracted contour.
//   contour — { topEdge, bottomEdge, gaps, ... } from toothContour
// Returns { vertices, tessEdges, contourEdges, gapCols, keyPoints, colXs }
// or null if the contour is too sparse.
export function buildTessellation(contour) {
  const { topEdge, bottomEdge, gaps } = contour;
  if (!topEdge || !bottomEdge || topEdge.length < 3) return null;

  const xMin = topEdge[0][0];
  const xMax = topEdge[topEdge.length - 1][0];
  if (xMax - xMin < 0.05) return null;

  // Column x-positions: regular samples + gap positions (inserted in order).
  const NUM_COLS = 14;
  const NUM_ROWS = 5;
  const colXs = [];
  for (let i = 0; i <= NUM_COLS; i++) {
    colXs.push(lerp(xMin, xMax, i / NUM_COLS));
  }
  // Insert gap x-positions (sorted, deduped against existing columns)
  for (const g of gaps || []) {
    const gx = g.x;
    if (gx <= xMin + 0.01 || gx >= xMax - 0.01) continue;
    let idx = colXs.findIndex((x) => x > gx);
    if (idx < 0) idx = colXs.length;
    const prev = idx > 0 ? colXs[idx - 1] : -1;
    const next = idx < colXs.length ? colXs[idx] : Infinity;
    if (Math.abs(prev - gx) > 0.004 && Math.abs(next - gx) > 0.004) {
      colXs.splice(idx, 0, gx);
    }
  }

  const nCols = colXs.length;
  const nRows = NUM_ROWS;

  // Build the warped grid: for each column, sample NUM_ROWS points between the
  // real top (gumline) and bottom (incisal edge) edges.
  const vertices = [];
  const grid = [];      // grid[ci][ri] = vertex index
  const isGapCol = [];  // isGapCol[ci] = true if this column is at a gap

  for (let ci = 0; ci < nCols; ci++) {
    const sampled = sampleEdges(topEdge, bottomEdge, colXs[ci]);
    if (!sampled) continue;
    const col = [];
    for (let ri = 0; ri < nRows; ri++) {
      const t = ri / (nRows - 1);
      const y = lerp(sampled.top, sampled.bot, t);
      col.push(vertices.length);
      vertices.push([colXs[ci], y]);
    }
    grid.push(col);
    isGapCol.push((gaps || []).some((g) => Math.abs(g.x - colXs[ci]) < 0.008));
  }

  // If some columns failed to sample, bail to fallback.
  if (grid.length < 3) return null;
  const validCols = grid.length;

  // ── Tessellation edges (the net) ──
  // Both diagonals per quad for the dense "net" look (not just triangles).
  const tessEdges = [];
  for (let ci = 0; ci < validCols; ci++) {
    for (let ri = 0; ri < nRows; ri++) {
      const v = grid[ci][ri];
      if (ri < nRows - 1) tessEdges.push([v, grid[ci][ri + 1]]); // vertical
      if (ci < validCols - 1) {
        tessEdges.push([v, grid[ci + 1][ri]]); // horizontal
        if (ri < nRows - 1) {
          tessEdges.push([v, grid[ci + 1][ri + 1]]); // diagonal ↘
          tessEdges.push([grid[ci + 1][ri], grid[ci][ri + 1]]); // diagonal ↗
        }
      }
    }
  }

  // ── Contour boundary edges (brighter) ──
  const contourEdges = [];
  for (let ci = 0; ci < validCols - 1; ci++) {
    contourEdges.push([grid[ci][0], grid[ci + 1][0]]); // top (gumline)
    contourEdges.push([grid[ci][nRows - 1], grid[ci + 1][nRows - 1]]); // bottom (incisal)
  }
  for (let ri = 0; ri < nRows - 1; ri++) {
    contourEdges.push([grid[0][ri], grid[0][ri + 1]]); // left
    contourEdges.push([grid[validCols - 1][ri], grid[validCols - 1][ri + 1]]); // right
  }

  // ── Gap column indices (for brighter vertical tooth-boundary lines) ──
  const gapCols = [];
  for (let ci = 0; ci < validCols; ci++) {
    if (isGapCol[ci]) gapCols.push(ci);
  }

  // ── Key landmark points (for pulsing dots) ──
  const keyPoints = [];
  // Corners
  keyPoints.push(grid[0][0], grid[0][nRows - 1]);
  keyPoints.push(grid[validCols - 1][0], grid[validCols - 1][nRows - 1]);
  // Gap column tops and bottoms (interdental landmarks)
  for (const ci of gapCols) {
    keyPoints.push(grid[ci][0], grid[ci][nRows - 1]);
  }
  // Midpoints along the incisal edge
  const midCi = Math.floor(validCols / 2);
  keyPoints.push(grid[midCi][nRows - 1]);
  if (validCols > 4) keyPoints.push(grid[Math.floor(validCols / 4)][nRows - 1]);
  if (validCols > 4) keyPoints.push(grid[Math.floor(validCols * 3 / 4)][nRows - 1]);

  return { vertices, tessEdges, contourEdges, gapCols, keyPoints, grid, nRows, validCols };
}

// Fallback mesh: a simple tessellated grid filling the bbox (used when contour
// extraction fails or for old scans without bbox data). Still looks like a
// net, just not conformed to the real tooth shape.
export function buildFallbackMesh() {
  const NUM_COLS = 12;
  const NUM_ROWS = 5;
  const vertices = [];
  const grid = [];
  for (let ci = 0; ci <= NUM_COLS; ci++) {
    const x = 5 + (ci / NUM_COLS) * 90;
    const col = [];
    for (let ri = 0; ri < NUM_ROWS; ri++) {
      const y = 8 + (ri / (NUM_ROWS - 1)) * 84;
      col.push(vertices.length);
      vertices.push([x, y]);
    }
    grid.push(col);
  }
  const nCols = grid.length;
  const nRows = NUM_ROWS;
  const tessEdges = [];
  for (let ci = 0; ci < nCols; ci++) {
    for (let ri = 0; ri < nRows; ri++) {
      const v = grid[ci][ri];
      if (ri < nRows - 1) tessEdges.push([v, grid[ci][ri + 1]]);
      if (ci < nCols - 1) {
        tessEdges.push([v, grid[ci + 1][ri]]);
        if (ri < nRows - 1) {
          tessEdges.push([v, grid[ci + 1][ri + 1]]);
          tessEdges.push([grid[ci + 1][ri], grid[ci][ri + 1]]);
        }
      }
    }
  }
  const contourEdges = [];
  for (let ci = 0; ci < nCols - 1; ci++) {
    contourEdges.push([grid[ci][0], grid[ci + 1][0]]);
    contourEdges.push([grid[ci][nRows - 1], grid[ci + 1][nRows - 1]]);
  }
  for (let ri = 0; ri < nRows - 1; ri++) {
    contourEdges.push([grid[0][ri], grid[0][ri + 1]]);
    contourEdges.push([grid[nCols - 1][ri], grid[nCols - 1][ri + 1]]);
  }
  const keyPoints = [
    grid[0][0], grid[0][nRows - 1],
    grid[nCols - 1][0], grid[nCols - 1][nRows - 1],
    grid[Math.floor(nCols / 2)][nRows - 1],
  ];
  return { vertices, tessEdges, contourEdges, gapCols: [], keyPoints, grid, nRows, validCols: nCols };
}